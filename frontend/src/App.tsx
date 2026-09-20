import { useState } from 'react';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import PendingView from './PendingView';
import LoginView from './LoginView';
import { DialogProvider } from './DialogProvider';
import { AuthProvider, useAuth } from './AuthContext';
import './App.css';
import './registerSW';

function AppContent() {
  const [view, setView] = useState<'monthly' | 'weekly' | 'pending'>('monthly');
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginView />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: 'var(--color-text-primary)', paddingTop: 24 }}>
        Planejador
      </h1>

      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
        Olá, {user.name}!{' '}
        <button
          onClick={logout}
          style={{ border: 'none', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontSize: 13 }}
        >
          Sair
        </button>
      </p>

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
  );
}

function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AppContent />
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;