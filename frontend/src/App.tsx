import { useEffect, useState } from 'react';
import './App.css';

interface Activity {
  id: number;
  title: string;
  description: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string;
  status: string;
  priority: string | null;
  highlighted: boolean;
}

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/activities?userId=1')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Erro ao buscar atividades');
        }
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
  }, []);

  if (loading) {
    return <p>Carregando atividades...</p>;
  }

  if (error) {
    return <p>Erro: {error}</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Minhas Atividades</h1>
      {activities.length === 0 && <p>Nenhuma atividade cadastrada.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activities.map((activity) => (
          <li
            key={activity.id}
            style={{
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              textDecoration: activity.status === 'COMPLETED' ? 'line-through' : 'none',
              opacity: activity.status === 'CANCELLED' ? 0.5 : 1,
            }}
          >
            <strong>{activity.title}</strong>
            <br />
            {activity.date && <span>📅 {activity.date} </span>}
            {activity.startTime && <span>🕐 {activity.startTime}</span>}
            <br />
            <small>
              Tipo: {activity.type} | Status: {activity.status}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;