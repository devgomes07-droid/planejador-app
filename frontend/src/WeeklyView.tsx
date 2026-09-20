import { useEffect, useState } from 'react';
import { formatDate } from './dateUtils';
import { apiFetch } from './api';
import ActivityForm, { type Activity } from './ActivityForm';
import { useDialog } from './DialogProvider';

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const TYPE_LABELS: Record<string, string> = {
  TASK: 'Tarefa',
  COMMITMENT: 'Compromisso',
  POSSIBILITY: 'Possibilidade',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  POSTPONED: 'Adiado',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type FormState =
  | { mode: 'new'; date: string }
  | { mode: 'edit'; activity: Activity }
  | null;

function WeeklyView() {
  const { notify } = useDialog();
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] = useState<FormState>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startDate = formatDate(weekStart);
    const endDate = formatDate(weekEnd);

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
  }, [weekStart, reloadKey]);

  function goToPreviousWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  }

  function goToNextWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  }

  function goToToday() {
    setWeekStart(getMondayOfWeek(new Date()));
  }

  async function toggleComplete(activity: Activity) {
    if (togglingId !== null) return;

    const newStatus = activity.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTogglingId(activity.id);

    try {
      const response = await apiFetch(`/api/activities/${activity.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      const updated: Activity = await response.json();
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      notify(
        'Não conseguimos atualizar esta atividade. Verifique sua conexão e tente novamente.',
        'error'
      );
    } finally {
      setTogglingId(null);
    }
  }

  function handleSaved() {
    setFormState(null);
    setReloadKey((k) => k + 1);
  }

  function getDayActivities(date: Date): { withTime: Activity[]; withoutTime: Activity[] } {
    const dateStr = formatDate(date);
    const dayActivities = activities.filter((a) => a.date === dateStr);

    const withTime = dayActivities
      .filter((a) => a.startTime)
      .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));

    const withoutTime = dayActivities
      .filter((a) => !a.startTime)
      .sort((a, b) => {
        const pa = a.priority ? PRIORITY_ORDER[a.priority] : 99;
        const pb = b.priority ? PRIORITY_ORDER[b.priority] : 99;
        if (pa !== pb) return pa - pb;
        return a.id - b.id;
      });

    return { withTime, withoutTime };
  }

  function renderActivity(activity: Activity) {
    const timeLabel = activity.startTime
      ? activity.endTime
        ? `${activity.startTime.slice(0, 5)}–${activity.endTime.slice(0, 5)}`
        : activity.startTime.slice(0, 5)
      : null;

    return (
      <div
        key={activity.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          borderBottom: '1px solid var(--color-surface-alt)',
          opacity: activity.status === 'CANCELLED' ? 0.5 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={activity.status === 'COMPLETED'}
          disabled={togglingId === activity.id}
          onChange={() => toggleComplete(activity)}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              textDecoration:
                activity.status === 'COMPLETED' || activity.status === 'CANCELLED'
                  ? 'line-through'
                  : 'none',
              color:
                activity.status === 'COMPLETED'
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-primary)',
              fontWeight: activity.highlighted ? 600 : 400,
            }}
          >
            {timeLabel ? `${timeLabel} — ${activity.title}` : activity.title}
          </span>
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
          <br />
          <small style={{ color: 'var(--color-text-secondary)' }}>
            {TYPE_LABELS[activity.type]} · {STATUS_LABELS[activity.status]}
            {activity.priority ? ` · Prioridade ${PRIORITY_LABELS[activity.priority]}` : ''}
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
  }

  if (error) return <p>Erro: {error}</p>;

  const todayStr = formatDate(new Date());

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="btn-group">
          <button className="btn-icon" onClick={goToPreviousWeek} aria-label="Semana anterior">
            ◀
          </button>
          <button onClick={goToToday}>Hoje</button>
          <button className="btn-icon" onClick={goToNextWeek} aria-label="Próxima semana">
            ▶
          </button>
        </div>
        <strong style={{ color: 'var(--color-text-primary)' }}>
          {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
        </strong>
        <div className="spacer">
          <button
            className="btn-primary"
            onClick={() => setFormState({ mode: 'new', date: todayStr })}
          >
            + Nova atividade
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 12px 0' }}>
          Carregando semana...
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DAYS_OF_WEEK.map((dayName, index) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + index);
          const dayStr = formatDate(dayDate);
          const { withTime, withoutTime } = getDayActivities(dayDate);
          const isToday = dayStr === todayStr;
          const isEmpty = withTime.length === 0 && withoutTime.length === 0;

          return (
            <div
              key={dayName}
              style={{
                border: isToday
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                backgroundColor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 15 }}>
                  {dayName.toUpperCase()} — {formatDisplayDate(dayDate)}
                  {isToday && (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 400 }}> (hoje)</span>
                  )}
                </h3>
                <button
                  className="btn-small btn-ghost"
                  onClick={() => setFormState({ mode: 'new', date: dayStr })}
                >
                  + Adicionar
                </button>
              </div>

              {isEmpty && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
                  Nenhuma atividade
                </p>
              )}

              {withTime.map(renderActivity)}

              {withoutTime.length > 0 && (
                <>
                  <div className="section-label">Sem horário definido</div>
                  {withoutTime.map(renderActivity)}
                </>
              )}
            </div>
          );
        })}
      </div>

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

export default WeeklyView;