import type { Metadata, Viewport } from 'next';
import { Outfit, Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import AuthGate from '@/components/AuthGate';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Granja Avícola — Control Operativo',
  description: 'Sistema PWA 100% offline para operaciones logísticas avícolas · Alimentos Serex',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Granja Avícola',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c328f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning evita errores por el toggle de dark class en el cliente
    <html lang="es" className={`${outfit.variable} ${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            {/* AuthGate maneja Navbar, redirección y spinner — Navbar NO va aquí */}
            <AuthGate>
              {children}
            </AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
