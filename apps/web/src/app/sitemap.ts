import { MetadataRoute } from 'next';

/**
 * sitemap.xml automático
 * 
 * Gera sitemap apenas para páginas públicas (marketing/docs).
 * NUNCA inclui rotas privadas (/app).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const now = new Date();

  // Páginas estáticas públicas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // TODO: Se tiver blog posts dinâmicos, buscar do CMS/DB e adicionar aqui
  // const blogPosts = await getBlogPosts();
  // const blogUrls = blogPosts.map(post => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: post.updatedAt,
  //   changeFrequency: 'weekly',
  //   priority: 0.6,
  // }));

  return [
    ...staticPages,
    // ...blogUrls,
  ];
}
