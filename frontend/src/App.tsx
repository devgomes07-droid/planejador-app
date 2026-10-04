import { useState } from 'react';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import PendingView from './PendingView';
import LoginView from './LoginView';
import { DialogProvider } from './DialogProvider';
import { AuthProvider, useAuth } from './AuthContext';
import './App.css';
import './registerSW';

// [esquerda %, tamanho px, duração s, atraso s]
const DOTS: [number, number, number, number][] = [
  [6, 8, 16, 0],
  [14, 5, 12, -4],
  [22, 10, 19, -9],
  [31, 6, 14, -2],
  [39, 9, 17, -12],
  [47, 5, 13, -6],
  [55, 8, 18, -1],
  [63, 6, 15, -10],
  [71, 10, 20, -5],
  [79, 5, 12, -8],
  [86, 8, 16, -3],
  [93, 6, 14, -11],
];

function BackgroundDecor() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />
      <div className="app-aurora" />

      {/* calendário */}
      <svg className="app-icon app-icon-1" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      {/* sino */}
      <svg className="app-icon app-icon-2" viewBox="0 0 24 24">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {/* relógio */}
      <svg className="app-icon app-icon-3" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {/* check */}
      <svg className="app-icon app-icon-4" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      {/* lista */}
      <svg className="app-icon app-icon-5" viewBox="0 0 24 24">
        <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" />
      </svg>
      {/* estrela */}
      <svg className="app-icon app-icon-6" viewBox="0 0 24 24">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      </svg>
      {/* bandeira */}
      <svg className="app-icon app-icon-7" viewBox="0 0 24 24">
        <path d="M4 22V4M4 4h14l-2 5 2 5H4" />
      </svg>
      {/* alvo */}
      <svg className="app-icon app-icon-8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>

      {DOTS.map(([left, size, duration, delay], i) => (
        <span
          key={i}
          className="app-dot"
          style={{
            left: `${left}%`,
            width: size,
            height: size,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<'monthly' | 'weekly' | 'pending'>('monthly');
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginView />;
  }

  return (
    <>
      <BackgroundDecor />

      <div className="app-shell">
        <h1 className="app-title">Planejador</h1>

        <p className="app-greeting">
          Olá, {user.name}!{' '}
          <button onClick={logout} className="app-logout">
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

        <main className="content">
          <div key={view} className="view-enter">
            {view === 'monthly' && <MonthlyView />}
            {view === 'weekly' && <WeeklyView />}
            {view === 'pending' && <PendingView />}
          </div>
        </main>
      </div>
    </>
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