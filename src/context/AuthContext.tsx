'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type User = {
  email: string;
  id: string | null;
  isOffline?: boolean;
};

interface AuthContextProps {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isOffline: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Restaurar sesión desde localStorage al montar (solo cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          localStorage.removeItem('auth_user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (!navigator.onLine) {
        // Modo offline: verificar credenciales guardadas localmente
        const saved = localStorage.getItem('auth_user');
        if (saved) {
          const storedUser: User = JSON.parse(saved);
          if (storedUser.email === email) {
            setUser({ ...storedUser, isOffline: true });
            setIsOffline(true);
            return;
          }
        }
        throw new Error('Sin conexión y no hay credenciales offline guardadas para este usuario.');
      }

      // Modo online: autenticar contra Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const newUser: User = {
        email,
        id: data?.user?.id ?? null,
        isOffline: false,
      };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      setIsOffline(false);
    } catch (e) {
      throw e; // Re-lanzar para que el formulario muestre el error
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    setIsOffline(false);
    // Cerrar sesión en Supabase si hay conexión (ignorar errores)
    supabase.auth.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isOffline, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
