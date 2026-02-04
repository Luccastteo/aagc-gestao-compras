import { MetadataRoute } from 'next';

/**
 * robots.txt dinâmico
 * 
 * Permite rastreamento apenas de páginas públicas (landing, pricing, docs).
 * Bloqueia TODAS as rotas privadas (/app, /api, /dashboard, etc).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/docs',
          '/blog',
        ],
        disallow: [
          '/app/*',
          '/api/*',
          '/dashboard/*',
          '/_next/*',
          '/private/*',
          '/login',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
