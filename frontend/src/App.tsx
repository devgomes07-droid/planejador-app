import { useState } from 'react';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import PendingView from './PendingView';
import { DialogProvider } from './DialogProvider';
import './App.css';
import './registerSW';

function App() {
  const [view, setView] = useState<'monthly' | 'weekly' | 'pending'>('monthly');

  return (
    <DialogProvider>
      <div style={{ minHeight: '100vh' }}>
        <h1 style={{ textAlign: 'center', color: 'var(--color-text-primary)', paddingTop: 24 }}>
          Planejador
        </h1>

        <div className="nav-buttons">
          <div className="tabs">
            <button
              className={`tab ${view === 'monthly' ? 'active' : ''}`}
              onClick={() => setView('monthly')}
            >
              Mensal
            </button>
            <button
              className={`tab ${view === 'weekly' ? 'active' : ''}`}
              onClick={() => setView('weekly')}
            >
              Semanal
            </button>
            <button
              className={`tab ${view === 'pending' ? 'active' : ''}`}
              onClick={() => setView('pending')}
            >
              Pendências
            </button>
          </div>
        </div>

        {view === 'monthly' && <MonthlyView />}
        {view === 'weekly' && <WeeklyView />}
        {view === 'pending' && <PendingView />}
      </div>
    </DialogProvider>
  );
}

export default App;