# 🔍 SEO Guide - AAGC SaaS

Guia completo de SEO para máximo tráfego orgânico com segurança.

---

## 📋 Implementações

### ✅ robots.txt
**Localização**: `/robots.txt` (gerado por `app/robots.ts`)

**Configuração**:
- ✅ Permite rastreamento: `/`, `/pricing`, `/features`, `/docs`, `/blog`
- ✅ Bloqueia: `/app/*`, `/api/*`, `/dashboard/*`, `/_next/*`, `/private/*`
- ✅ Referencia sitemap: `https://SEU_DOMINIO/sitemap.xml`

**Testar localmente**:
```bash
curl http://localhost:3000/robots.txt
```

**Validar**:
- Google: https://www.google.com/robots.txt
- Robots.txt Tester: https://technicalseo.com/tools/robots-txt/

### ✅ sitemap.xml
**Localização**: `/sitemap.xml` (gerado por `app/sitemap.ts`)

**Páginas incluídas**:
- Landing (/) - priority 1.0
- Pricing - priority 0.8
- Features - priority 0.8
- Docs - priority 0.7

**NUNCA inclui**: rotas privadas (`/app/*`)

**Testar localmente**:
```bash
curl http://localhost:3000/sitemap.xml
```

**Validar**:
- XML Sitemap Validator: https://www.xml-sitemaps.com/validate-xml-sitemap.html

### ✅ Metadata SEO Global
**Localização**: `app/layout.tsx`

**Incluído**:
- ✅ Title template (`%s | AAGC SaaS`)
- ✅ Description otimizada
- ✅ Keywords relevantes
- ✅ Open Graph (OG) tags para redes sociais
- ✅ Twitter Cards
- ✅ Canonical URL
- ✅ Robots meta tag (index/follow)
- ✅ Google Site Verification (configurável)

### ✅ Rotas Privadas (noindex)
**Localização**: `app/app/layout.tsx`

Todas as rotas `/app/*` possuem:
```tsx
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
```

Garante **ZERO indexação** de áreas privadas.

---

## 🚀 Google Search Console - Setup

### 1. Criar Propriedade

1. Acesse https://search.google.com/search-console
2. Adicionar propriedade → escolha "Prefixo do URL"
3. Insira `https://seu-dominio.com`

### 2. Verificar Propriedade

**Método 1: Meta tag HTML** (recomendado)
1. Google fornece código: `<meta name="google-site-verification" content="xxxx" />`
2. Adicione ao `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxx
   ```
3. Rebuild web: `pnpm -C apps/web build`
4. Deploy
5. Clique "Verificar" no Search Console

**Método 2: Arquivo HTML**
1. Baixe arquivo `googleXXXX.html`
2. Coloque em `apps/web/public/googleXXXX.html`
3. Acesse `https://seu-dominio.com/googleXXXX.html`
4. Clique "Verificar"

### 3. Enviar Sitemap

1. No Search Console → **Sitemaps** (menu lateral)
2. Adicionar novo sitemap: `https://seu-dominio.com/sitemap.xml`
3. Enviar

**Aguarde 24-48h** para primeira indexação.

### 4. Validar Indexação

```
site:seu-dominio.com
```

No Google, deve mostrar:
- ✅ Landing (/)
- ✅ Pricing
- ✅ Features
- ✅ Docs
- ❌ NÃO deve mostrar `/app/*` ou `/api/*`

---

## 🎯 Bing Webmaster Tools (Opcional)

1. Acesse https://www.bing.com/webmasters
2. Adicionar site
3. Verificar via:
   - Meta tag (`NEXT_PUBLIC_BING_SITE_VERIFICATION`)
   - Arquivo XML
4. Enviar sitemap: `https://seu-dominio.com/sitemap.xml`

---

## ⚡ Lighthouse - Performance Targets

### Como Rodar

**Local**:
1. Build produção: `pnpm -C apps/web build`
2. Start produção: `pnpm -C apps/web start`
3. Abrir Chrome DevTools → Lighthouse
4. Rodar audit para "Desktop" ou "Mobile"

**Online**:
- PageSpeed Insights: https://pagespeed.web.dev/
- WebPageTest: https://www.webpagetest.org/

### Targets (Mínimo)

| Métrica | Target | Atual |
|---------|--------|-------|
| Performance | ≥ 95 | 🎯 |
| Accessibility | ≥ 95 | 🎯 |
| Best Practices | ≥ 95 | 🎯 |
| SEO | = 100 | 🎯 |

### Core Web Vitals (Produção)

| Métrica | Target |
|---------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |

---

## 🛡️ Segurança SEO

### ✅ Proteções Implementadas

- **noindex em áreas privadas**: `/app/*` NUNCA aparece no Google
- **robots.txt**: bloqueia crawlers em rotas sensíveis
- **CSP Headers**: previne XSS em páginas públicas
- **No query params vazando**: autenticação via JWT (não em URL)

### ⚠️ Não Fazer

- ❌ NUNCA adicionar `/app/*` ao sitemap
- ❌ NUNCA remover `robots: noindex` de rotas privadas
- ❌ NUNCA expor `entityId` ou dados sensíveis em URLs públicas
- ❌ NUNCA usar query params para auth (ex: `?token=xxx` em rotas públicas indexáveis)

---

## 📊 Monitoramento SEO

### Ferramentas Recomendadas

| Ferramenta | Uso |
|------------|-----|
| Google Search Console | Indexação, erros, queries |
| Google Analytics 4 | Tráfego, conversões |
| Ahrefs/SEMrush | Backlinks, keywords |
| Screaming Frog | Audit técnico |

### Alertas Importantes

Configure alertas no Search Console para:
- ✅ Erros de rastreamento
- ✅ Problemas de indexação
- ✅ Penalidades manuais
- ✅ Aumento súbito de 404s

---

## 🏗️ Estrutura de URLs (SEO-Friendly)

### Páginas Públicas (Indexáveis)

```
/                    → Landing page (priority 1.0)
/pricing             → Preços (priority 0.8)
/features            → Funcionalidades (priority 0.8)
/docs                → Documentação (priority 0.7)
/blog                → Blog (priority 0.6) [futuro]
/blog/[slug]         → Post individual (priority 0.6) [futuro]
```

### Páginas Privadas (NÃO Indexáveis)

```
/app/*               → Dashboard e features (noindex)
/api/*               → API endpoints (noindex + robots.txt block)
/login               → Login (noindex)
/forgot-password     → Recuperação senha (noindex)
/reset-password      → Reset senha (noindex)
```

---

## 📝 Checklist de Validação SEO

### Pré-Deploy

- [ ] `.env` possui `NEXT_PUBLIC_SITE_URL` correto
- [ ] `robots.txt` acessível localmente (`/robots.txt`)
- [ ] `sitemap.xml` acessível localmente (`/sitemap.xml`)
- [ ] Metadata completo em `app/layout.tsx`
- [ ] `/app/layout.tsx` possui `robots: noindex`
- [ ] Build produção sem erros: `pnpm build`
- [ ] Lighthouse local ≥ 95 (performance/SEO/A11Y)

### Pós-Deploy

- [ ] `https://seu-dominio.com/robots.txt` acessível
- [ ] `https://seu-dominio.com/sitemap.xml` acessível
- [ ] Google Search Console verificado
- [ ] Sitemap enviado ao Search Console
- [ ] Aguardar 48h → validar indexação: `site:seu-dominio.com`
- [ ] `/app/*` NÃO aparece nos resultados Google
- [ ] Core Web Vitals no verde (Search Console → Experience)

---

## 🎓 Boas Práticas SEO (Futuro)

### Content Marketing

- **Blog**: artigos sobre gestão de estoque, procurement, supply chain
- **Case studies**: histórias de clientes (com permissão)
- **Guias**: "Como reduzir custos de compras em 30%"
- **Vídeos**: tutoriais no YouTube (embutir no site)

### Link Building

- **Diretórios**: SaaS lists, Capterra, G2
- **Guest posts**: blogs de logística/gestão
- **Press releases**: lançamentos de features

### Schema Markup (Estruturado)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AAGC SaaS",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "BRL"
  }
}
```

Adicionar em `app/layout.tsx` via `<script type="application/ld+json">`.

---

## 🚨 Avisos Importantes

### ⚠️ NUNCA Indexar Rotas Privadas

**Por quê?**:
- Dados sensíveis (estoque, fornecedores, POs)
- Tabelas com `organizationId` podem vazar IDs
- Login walls ruins para UX (Google penaliza)

**Como garantir?**:
- `robots: noindex` em `/app/layout.tsx`
- robots.txt bloqueia `/app/*`
- Testes automatizados (verificar meta tags)

### ⚠️ Performance vs. SEO

- **SSR** (Server-Side Rendering) para landing/pricing/docs
- **CSR** (Client-Side Rendering) para /app (não afeta SEO - já é noindex)
- **Lazy load** imagens: use `next/image` sempre
- **Code splitting**: Next.js automático

---

## 📈 KPIs de SEO (Acompanhar)

| Métrica | Target 3 meses | Target 6 meses |
|---------|----------------|----------------|
| Páginas indexadas | 10-20 | 50+ |
| Organic traffic | 100 visitas/mês | 500 visitas/mês |
| Keywords ranking top 10 | 5 | 20 |
| Backlinks | 10 | 50 |
| Domain Authority (Moz) | 20 | 30 |

---

## 🔗 Links Úteis

- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Next.js SEO Docs](https://nextjs.org/learn/seo/introduction-to-seo)

---

**Última atualização**: 2026-02-04
