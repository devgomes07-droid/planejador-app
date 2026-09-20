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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

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

  async function login(email: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('E-mail ou senha inválidos');
    }

    const data = await response.json();
    const authUser = { userId: data.userId, name: data.name, email: data.email };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(authUser));

    setToken(data.token);
    setUser(authUser);
  }

  async function register(name: string, email: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Este e-mail já está cadastrado');
      }
      throw new Error('Não foi possível criar a conta');
    }

    const data = await response.json();
    const authUser = { userId: data.userId, name: data.name, email: data.email };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(authUser));

    setToken(data.token);
    setUser(authUser);
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