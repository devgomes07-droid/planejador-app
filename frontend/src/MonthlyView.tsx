import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from './dateUtils';
import { apiFetch } from './api';
import ActivityForm, { type Activity } from './ActivityForm';
import './DayPanel.css';

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  POSTPONED: 'Adiado',
};

const TYPE_LABELS: Record<string, string> = {
  TASK: 'Tarefa',
  COMMITMENT: 'Compromisso',
  POSSIBILITY: 'Possibilidade',
};

type FormState =
  | { mode: 'new'; date: string }
  | { mode: 'edit'; activity: Activity }
  | null;

function capitalize(text: string): string {
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function pickHighlight(dayActivities: Activity[]): Activity | null {
  const active = dayActivities.filter((a) => a.status !== 'CANCELLED');
  if (active.length === 0) return null;

  const manualHighlight = active.find((a) => a.highlighted);
  if (manualHighlight) return manualHighlight;

  const commitmentWithTime = active
    .filter((a) => a.type === 'COMMITMENT' && a.startTime)
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1))[0];
  if (commitmentWithTime) return commitmentWithTime;

  const anyWithTime = active
    .filter((a) => a.startTime)
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1))[0];
  if (anyWithTime) return anyWithTime;

  return active[0];
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return capitalize(text);
}

function timeLabel(activity: Activity): string | null {
  if (!activity.startTime) return null;
  const start = activity.startTime.slice(0, 5);
  return activity.endTime ? `${start}–${activity.endTime.slice(0, 5)}` : start;
}

interface MonthlyViewProps {
  onSelectDay?: (date: string) => void;
}

function MonthlyView({ onSelectDay }: MonthlyViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [panelDay, setPanelDay] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startDate = formatDate(firstDayOfMonth);
    const endDate = formatDate(lastDayOfMonth);

    apiFetch(`/api/activities?startDate=${startDate}&endDate=${endDate}`)
      .then((response) => {
        if (!response.ok) throw new Error('Erro ao buscar atividades');
        return response.json();
      })
      .then((data: Activity[]) => {
        setActivities(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentMonth, currentYear, reloadKey]);

  // Recarrega quando outra tela (ex.: Semanal) altera atividades
  useEffect(() => {
    function onChanged() {
      setReloadKey((k) => k + 1);
    }
    window.addEventListener('activities-changed', onChanged);
    return () => window.removeEventListener('activities-changed', onChanged);
  }, []);

  // Trava a rolagem da pagina enquanto o painel do dia esta aberto
  useEffect(() => {
    if (!panelDay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [panelDay]);

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  function getActivitiesForDay(dateStr: string): Activity[] {
    return activities.filter((a) => a.date === dateStr);
  }

  function getSortedDayActivities(dateStr: string): Activity[] {
    const dayActivities = getActivitiesForDay(dateStr);
    const withTime = dayActivities
      .filter((a) => a.startTime)
      .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));
    const withoutTime = dayActivities.filter((a) => !a.startTime);
    return [...withTime, ...withoutTime];
  }

  function openDay(dateStr: string) {
    setSelectedDay(dateStr);
    onSelectDay?.(dateStr);
    if (getActivitiesForDay(dateStr).length === 0) {
      setFormState({ mode: 'new', date: dateStr });
    } else {
      setPanelDay(dateStr);
    }
  }

  function handleSaved() {
    setFormState(null);
    setReloadKey((k) => k + 1);
    window.dispatchEvent(new Event('activities-changed'));
  }

  function buildCalendarGrid(): (Date | null)[] {
    const firstWeekday = firstDayOfMonth.getDay();
    const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const daysInMonth = lastDayOfMonth.getDate();
    const grid: (Date | null)[] = [];

    for (let i = 0; i < offset; i++) {
      grid.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(new Date(currentYear, currentMonth, day));
    }
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }

    return grid;
  }

  if (error) return <p>Erro: {error}</p>;

  const grid = buildCalendarGrid();
  const todayStr = formatDate(today);
  const panelActivities = panelDay ? getSortedDayActivities(panelDay) : [];

  const panel =
    panelDay !== null ? (
      <div className="dp-overlay" onClick={() => setPanelDay(null)}>
        <div
          className="dp-card"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dp-header">
            <div className="dp-header-text">
              <h2>{formatLongDate(panelDay)}</h2>
              <span>
                {panelActivities.length === 0
                  ? 'Nenhuma atividade'
                  : panelActivities.length === 1
                    ? '1 atividade'
                    : `${panelActivities.length} atividades`}
              </span>
            </div>
            <button
              className="dp-close"
              onClick={() => setPanelDay(null)}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="dp-body">
            {panelActivities.length === 0 && (
              <p className="dp-empty">Nenhuma atividade neste dia.</p>
            )}

            {panelActivities.map((activity) => {
              const label = timeLabel(activity);
              const struck = activity.status === 'COMPLETED' || activity.status === 'CANCELLED';

              return (
                <div
                  key={activity.id}
                  className={`dp-item dp-type-${activity.type} ${
                    activity.status === 'CANCELLED' ? 'dp-cancelled' : ''
                  }`}
                >
                  <div className="dp-item-main">
                    {label && <span className="dp-time">{label}</span>}
                    <span
                      className={`dp-title ${struck ? 'dp-struck' : ''} ${
                        activity.status === 'COMPLETED' ? 'dp-done' : ''
                      } ${activity.highlighted ? 'dp-star' : ''}`}
                    >
                      {capitalize(activity.title)}
                    </span>
                    <div className="dp-meta">
                      <span className="dp-chip">{TYPE_LABELS[activity.type]}</span>
                      <span className={`dp-chip dp-status-${activity.status}`}>
                        {STATUS_LABELS[activity.status]}
                      </span>
                    </div>
                  </div>
                  <button
                    className="dp-edit"
                    onClick={() => setFormState({ mode: 'edit', activity })}
                  >
                    Editar
                  </button>
                </div>
              );
            })}
          </div>

          <div className="dp-footer">
            <button className="dp-btn dp-btn-ghost" onClick={() => setPanelDay(null)}>
              Fechar
            </button>
            <button
              className="dp-btn dp-btn-primary"
              onClick={() => setFormState({ mode: 'new', date: panelDay })}
            >
              + Nova Atividade
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="btn-group">
          <button className="btn-icon" onClick={goToPreviousMonth} aria-label="Mês anterior">
            ◀
          </button>
          <button onClick={goToToday}>Hoje</button>
          <button className="btn-icon" onClick={goToNextMonth} aria-label="Próximo mês">
            ▶
          </button>
        </div>
        <strong style={{ color: 'var(--color-text-primary)' }}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </strong>
      </div>

      {loading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 12px 0' }}>
          Carregando mês...
        </p>
      )}

      <div className="calendar-grid">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="calendar-weekday-header">
            {day}
          </div>
        ))}

        {grid.map((date, index) => {
          if (!date) {
            return <div key={index} className="calendar-day" />;
          }

          const dateStr = formatDate(date);
          const dayActivities = getActivitiesForDay(dateStr);
          const activeActivities = dayActivities.filter((a) => a.status !== 'CANCELLED');
          const highlight = pickHighlight(dayActivities);
          const extraCount = activeActivities.length - (highlight ? 1 : 0);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;

          return (
            <div
              key={dateStr}
              className="calendar-day"
              role="button"
              tabIndex={0}
              onClick={() => openDay(dateStr)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDay(dateStr);
                }
              }}
              style={{
                border: isToday
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div
                style={{
                  fontWeight: isToday ? 600 : 400,
                  color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)',
                }}
              >
                {date.getDate()}
              </div>

              {activeActivities.length === 0 && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 4 }}>
                  Livre
                </div>
              )}

              {highlight && (
                <div
                  style={{
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: highlight.status === 'COMPLETED' ? 'line-through' : 'none',
                    color:
                      highlight.status === 'COMPLETED'
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text-primary)',
                  }}
                >
                  {capitalize(highlight.title)}
                </div>
              )}

              {extraCount > 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  +{extraCount}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {panel && createPortal(panel, document.body)}

      {formState && (
        <ActivityForm
          activity={formState.mode === 'edit' ? formState.activity : null}
          defaultDate={formState.mode === 'new' ? formState.date : formState.activity.date}
          existingActivities={activities}
          onSaved={handleSaved}
          onClose={() => setFormState(null)}
        />
      )}
    </div>
  );
}

export default MonthlyView;