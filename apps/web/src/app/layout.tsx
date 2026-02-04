import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AAGC SaaS - Purchase Management',
    template: '%s | AAGC SaaS',
  },
  description: 'Multi-tenant Purchase Order & Inventory Management System. Gerencie estoque, fornecedores e compras com inteligência.',
  keywords: ['purchase management', 'inventory', 'ERP', 'SaaS', 'multi-tenant', 'procurement', 'supply chain'],
  authors: [{ name: 'AAGC Team' }],
  creator: 'AAGC',
  publisher: 'AAGC',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    title: 'AAGC SaaS - Purchase Management',
    description: 'Sistema multi-tenant de gestão de compras e estoque. Otimize seu processo de procurement.',
    siteName: 'AAGC SaaS',
    images: [
      {
        url: '/og-image.png', // TODO: criar imagem OG 1200x630
        width: 1200,
        height: 630,
        alt: 'AAGC SaaS - Purchase Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AAGC SaaS - Purchase Management',
    description: 'Sistema multi-tenant de gestão de compras e estoque',
    images: ['/og-image.png'],
    creator: '@aagcsaas', // TODO: ajustar handle real
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // yandex: 'xxxx',
    // bing: 'xxxx',
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
