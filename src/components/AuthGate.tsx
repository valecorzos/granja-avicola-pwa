'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Navbar from '@/components/Navbar';

const PUBLIC_ROUTES = ['/login'];

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace('/login');
    }
  }, [user, loading, isPublicRoute, router]);

  // Spinner global mientras restauramos sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1067f2] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // Rutas públicas (login): sin Navbar, sin protección
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Ruta protegida sin usuario → no renderizar (redirección ya disparada)
  if (!user) {
    return null;
  }

  // Usuario autenticado → mostrar Navbar + contenido
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </>
  );
}
