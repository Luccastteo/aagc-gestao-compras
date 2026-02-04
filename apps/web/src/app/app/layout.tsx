import { Metadata } from 'next';
import AppClientLayout from './client-layout';

/**
 * Layout para rotas privadas (/app).
 * 
 * Metadata noindex/nofollow garante que Google/Bing NUNCA indexem páginas privadas.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppClientLayout>{children}</AppClientLayout>;
}
