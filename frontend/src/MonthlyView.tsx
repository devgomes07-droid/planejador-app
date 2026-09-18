import { useEffect, useState } from 'react';

interface Activity {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  type: string;
  status: string;
  priority: string | null;
  highlighted: boolean;
}

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startDate = formatDate(firstDayOfMonth);
    const endDate = formatDate(lastDayOfMonth);

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
  }, [currentMonth, currentYear]);

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

  if (loading) return <p>Carregando mês...</p>;
  if (error) return <p>Erro: {error}</p>;

  const grid = buildCalendarGrid();
  const todayStr = formatDate(today);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={goToPreviousMonth}>◀</button>
        <button onClick={goToToday}>Hoje</button>
        <button onClick={goToNextMonth}>▶</button>
        <strong style={{ color: 'var(--color-text-primary)' }}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontWeight: 500,
              padding: 4,
              color: 'var(--color-text-secondary)',
              fontSize: 13,
            }}
          >
            {day}
          </div>
        ))}

        {grid.map((date, index) => {
          if (!date) {
            return <div key={index} style={{ minHeight: 84 }} />;
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
              onClick={() => {
                setSelectedDay(dateStr);
                onSelectDay?.(dateStr);
              }}
              style={{
                minHeight: 84,
                border: isToday
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 8,
                cursor: 'pointer',
                fontSize: 13,
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
                    fontSize: 12,
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
    </div>
  );
}

export default MonthlyView;