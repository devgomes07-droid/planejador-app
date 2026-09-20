import { useEffect, useState } from 'react';
import { formatDate } from './dateUtils';
import { apiFetch } from './api';
import ActivityForm, { type Activity } from './ActivityForm';

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
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
  return text.charAt(0).toUpperCase() + text.slice(1);
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
    setPanelDay(dateStr);
    onSelectDay?.(dateStr);
  }

  function handleSaved() {
    setFormState(null);
    setReloadKey((k) => k + 1);
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
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {highlight.title}
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

      {panelDay && (
        <div className="modal-overlay" onClick={() => setPanelDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{formatLongDate(panelDay)}</h2>

            {panelActivities.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 16px 0' }}>
                Nenhuma atividade neste dia.
              </p>
            )}

            {panelActivities.map((activity) => {
              const label = timeLabel(activity);
              const struck = activity.status === 'COMPLETED' || activity.status === 'CANCELLED';

              return (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-surface-alt)',
                    opacity: activity.status === 'CANCELLED' ? 0.5 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        textDecoration: struck ? 'line-through' : 'none',
                        color:
                          activity.status === 'COMPLETED'
                            ? 'var(--color-text-muted)'
                            : 'var(--color-text-primary)',
                        fontWeight: activity.highlighted ? 600 : 400,
                      }}
                    >
                      {label ? `${label} — ${activity.title}` : activity.title}
                      {activity.type === 'POSSIBILITY' && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            padding: '2px 6px',
                            border: '1px dashed var(--color-text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          Possível
                        </span>
                      )}
                    </div>
                    <small style={{ color: 'var(--color-text-secondary)' }}>
                      {TYPE_LABELS[activity.type]} · {STATUS_LABELS[activity.status]}
                    </small>
                  </div>
                  <button
                    className="btn-small"
                    onClick={() => setFormState({ mode: 'edit', activity })}
                  >
                    Editar
                  </button>
                </div>
              );
            })}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setPanelDay(null)}>
                Fechar
              </button>
              <button
                className="btn-primary"
                onClick={() => setFormState({ mode: 'new', date: panelDay })}
              >
                + Nova atividade
              </button>
            </div>
          </div>
        </div>
      )}

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