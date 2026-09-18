import { useEffect, useState } from 'react';

interface Activity {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: string;
  status: string;
  priority: string | null;
  highlighted: boolean;
}

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
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

function WeeklyView() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startDate = formatDate(weekStart);
    const endDate = formatDate(weekEnd);

    fetch(`http://localhost:8080/api/activities?userId=1&startDate=${startDate}&endDate=${endDate}`)
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
  }, [weekStart]);

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
    const newStatus = activity.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    try {
      const response = await fetch(
        `http://localhost:8080/api/activities/${activity.id}/status?userId=1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar status');

      const updated: Activity = await response.json();
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      alert('Não conseguimos atualizar esta atividade. Verifique sua conexão e tente novamente.');
    }
  }

  function getActivitiesForDay(date: Date): Activity[] {
    const dateStr = formatDate(date);
    const dayActivities = activities.filter((a) => a.date === dateStr);

    const withTime = dayActivities
      .filter((a) => a.startTime)
      .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));

    const withoutTime = dayActivities.filter((a) => !a.startTime);

    return [...withTime, ...withoutTime];
  }

  if (loading) return <p>Carregando semana...</p>;
  if (error) return <p>Erro: {error}</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={goToPreviousWeek}>◀ Anterior</button>
        <button onClick={goToToday}>Hoje</button>
        <button onClick={goToNextWeek}>Próxima ▶</button>
        <strong>
          {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
        </strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DAYS_OF_WEEK.map((dayName, index) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + index);
          const dayActivities = getActivitiesForDay(dayDate);
          const isToday = formatDate(dayDate) === formatDate(new Date());

          return (
            <div
              key={dayName}
              style={{
                border: isToday ? '2px solid #4a90d9' : '1px solid #ddd',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <h3 style={{ margin: '0 0 8px 0' }}>
                {dayName.toUpperCase()} — {formatDisplayDate(dayDate)}
                {isToday && ' (hoje)'}
              </h3>

              {dayActivities.length === 0 && (
                <p style={{ color: '#999', fontSize: 14 }}>Nenhuma atividade</p>
              )}

              {dayActivities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0',
                    opacity: activity.status === 'CANCELLED' ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activity.status === 'COMPLETED'}
                    onChange={() => toggleComplete(activity)}
                  />
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        textDecoration:
                          activity.status === 'COMPLETED' ? 'line-through' : 'none',
                        fontWeight: activity.highlighted ? 'bold' : 'normal',
                      }}
                    >
                      {activity.startTime
                        ? `${activity.startTime.slice(0, 5)} — ${activity.title}`
                        : activity.title}
                    </span>
                    {activity.type === 'POSSIBILITY' && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          padding: '2px 6px',
                          border: '1px dashed #999',
                          borderRadius: 4,
                          color: '#777',
                        }}
                      >
                        Possível
                      </span>
                    )}
                    <br />
                    <small style={{ color: '#888' }}>
                      {TYPE_LABELS[activity.type]} · {STATUS_LABELS[activity.status]}
                    </small>
                  </div>
                </div>
              ))}

              {dayActivities.filter((a) => !a.startTime).length === 0 &&
                dayActivities.length > 0 && null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyView;