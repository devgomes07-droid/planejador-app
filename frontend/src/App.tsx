import { useState } from 'react';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import PendingView from './PendingView';
import './App.css';

function App() {
  const [view, setView] = useState<'monthly' | 'weekly' | 'pending'>('monthly');

  const navButtonStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? '#fff' : 'var(--color-text-primary)',
    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: 'var(--color-text-primary)', paddingTop: 24 }}>
        Planejador
      </h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <button style={navButtonStyle(view === 'monthly')} onClick={() => setView('monthly')}>
          Mensal
        </button>
        <button style={navButtonStyle(view === 'weekly')} onClick={() => setView('weekly')}>
          Semanal
        </button>
        <button style={navButtonStyle(view === 'pending')} onClick={() => setView('pending')}>
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