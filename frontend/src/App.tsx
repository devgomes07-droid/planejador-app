import { useState } from 'react';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import PendingView from './PendingView';
import './App.css';

function App() {
  const [view, setView] = useState<'monthly' | 'weekly' | 'pending'>('monthly');

  return (
    <div>
      <h1 style={{ textAlign: 'center' }}>Planejador</h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('monthly')} disabled={view === 'monthly'}>
          Mensal
        </button>
        <button onClick={() => setView('weekly')} disabled={view === 'weekly'}>
          Semanal
        </button>
        <button onClick={() => setView('pending')} disabled={view === 'pending'}>
          Pendências
        </button>
      </div>

      {view === 'monthly' && <MonthlyView />}
      {view === 'weekly' && <WeeklyView />}
      {view === 'pending' && <PendingView />}
    </div>
  );
}

export default App;