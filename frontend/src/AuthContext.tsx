import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { API_URL } from './api';

interface AuthUser {
  userId: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// O plano free do Render pode levar ~1 min para acordar
const REQUEST_TIMEOUT_MS = 75_000;

function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

async function postAuth(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente de novo em instantes.');
    }
    throw new Error('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  } finally {
    window.clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  function startSession(data: { token: string; userId: number; name: string; email: string }) {
    const authUser: AuthUser = { userId: data.userId, name: data.name, email: data.email };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(authUser));

    setToken(data.token);
    setUser(authUser);
  }

  async function login(email: string, password: string) {
    const response = await postAuth('/api/auth/login', { email, password });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error('O servidor está com problemas. Tente de novo em instantes.');
      }
      throw new Error('E-mail ou senha incorretos.');
    }

    startSession(await response.json());
  }

  async function register(name: string, email: string, password: string) {
    const response = await postAuth('/api/auth/register', { name, email, password });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Este e-mail já está cadastrado. Tente entrar.');
      }
      if (response.status === 400) {
        throw new Error('Confira os dados informados e tente de novo.');
      }
      if (response.status >= 500) {
        throw new Error('O servidor está com problemas. Tente de novo em instantes.');
      }
      throw new Error('Não foi possível criar a conta.');
    }

    startSession(await response.json());
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de um AuthProvider');
  }
  return context;
}