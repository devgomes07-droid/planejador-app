import { useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import './LoginExtras.css';

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Só foca sozinho em telas com mouse (no celular o teclado cobriria a tela)
const CAN_AUTOFOCUS =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

type Mode = 'login' | 'register';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

function LoginBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />
      <div className="app-aurora" />

      <svg className="app-icon app-icon-1" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <svg className="app-icon app-icon-2" viewBox="0 0 24 24">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <svg className="app-icon app-icon-3" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <svg className="app-icon app-icon-4" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <svg className="app-icon app-icon-5" viewBox="0 0 24 24">
        <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" />
      </svg>
      <svg className="app-icon app-icon-6" viewBox="0 0 24 24">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      </svg>
      <svg className="app-icon app-icon-7" viewBox="0 0 24 24">
        <path d="M4 22V4M4 4h14l-2 5 2 5H4" />
      </svg>
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

function EyeButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="login-eye"
      onClick={onToggle}
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      title={visible ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {visible ? (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="m1 1 22 22" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function LoginView() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const wakingTimer = useRef<number | undefined>(undefined);

  const isRegister = mode === 'register';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setFieldErrors({});
    setConfirm('');
    setShowPassword(false);
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (isRegister && name.trim().length < 2) {
      errors.name = 'Informe seu nome.';
    }

    const mail = email.trim();
    if (!mail) {
      errors.email = 'Informe seu e-mail.';
    } else if (!EMAIL_REGEX.test(mail)) {
      errors.email = 'E-mail inválido. Ex.: voce@email.com';
    }

    if (!password) {
      errors.password = 'Informe sua senha.';
    } else if (isRegister && password.length < 6) {
      errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
    }

    if (isRegister && confirm !== password) {
      errors.confirm = 'As senhas não são iguais.';
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    // se demorar, avisa que o servidor gratuito está acordando
    wakingTimer.current = window.setTimeout(() => setWaking(true), 4000);

    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.');
    } finally {
      window.clearTimeout(wakingTimer.current);
      setWaking(false);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <LoginBackground />

      <div className="login-brand">
        <div className="login-brand-icon">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <span className="login-brand-name">Planejador</span>
      </div>

      <div className="login-card">
        <div className="login-icon">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
          </svg>
        </div>

        <h1 className="login-title">{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
        <p className="login-subtitle">
          {isRegister ? 'Leva menos de um minuto, prometo' : 'Entre para ver seu planejamento'}
        </p>

        {error && (
          <div className="login-error" role="alert">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="login-field">
              <label htmlFor="login-name">Nome</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="login-name"
                  type="text"
                  className={fieldErrors.name ? 'invalid' : ''}
                  placeholder="Como podemos te chamar?"
                  autoComplete="name"
                  autoFocus={CAN_AUTOFOCUS}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('name');
                  }}
                />
              </div>
              {fieldErrors.name && <p className="login-field-error">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">E-mail</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              <input
                id="login-email"
                type="email"
                className={fieldErrors.email ? 'invalid' : ''}
                placeholder="voce@email.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus={CAN_AUTOFOCUS && !isRegister}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
              />
            </div>
            {fieldErrors.email && <p className="login-field-error">{fieldErrors.email}</p>}
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Senha</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`login-input-eye ${fieldErrors.password ? 'invalid' : ''}`}
                placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Sua senha'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
              />
              <EyeButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            {fieldErrors.password && <p className="login-field-error">{fieldErrors.password}</p>}
          </div>

          {isRegister && (
            <div className="login-field">
              <label htmlFor="login-confirm">Confirmar senha</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <input
                  id="login-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className={fieldErrors.confirm ? 'invalid' : ''}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    clearFieldError('confirm');
                  }}
                />
              </div>
              {fieldErrors.confirm && <p className="login-field-error">{fieldErrors.confirm}</p>}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading && <span className="login-spinner" />}
            {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          {waking && (
            <div className="login-waking" role="status">
              <span className="login-spinner" />
              <span>
                O servidor está acordando (plano gratuito). Isso pode levar até 1 minuto na primeira
                vez, é só aguardar.
              </span>
            </div>
          )}
        </form>

        <div className="login-divider">ou</div>

        <p className="login-switch">
          {isRegister ? (
            <>
              Já tem conta?{' '}
              <button type="button" onClick={() => switchMode('login')}>
                Entrar
              </button>
            </>
          ) : (
            <>
              Ainda não tem conta?{' '}
              <button type="button" onClick={() => switchMode('register')}>
                Criar agora
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default LoginView;