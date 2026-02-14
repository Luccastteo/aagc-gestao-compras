'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authApi, tokenStorage } from '@/lib/api';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

const navItems = [
  { href: '/app/dashboard', label: 'Painel', icon: 'dashboard' },
  { href: '/app/inventory', label: 'Produtos', icon: 'inventory_2' },
  { href: '/app/purchase-orders', label: 'Pedidos de Compra', icon: 'shopping_cart' },
  { href: '/app/suppliers', label: 'Fornecedores', icon: 'local_shipping' },
  { href: '/app/kanban', label: 'Kanban', icon: 'view_kanban' },
  { href: '/app/integrations', label: 'Integrações', icon: 'extension' },
  { href: '/app/audit', label: 'Auditoria', icon: 'history_edu' },
];

function getBreadcrumb(pathname: string): { breadcrumb: string; title: string } {
  const map: Record<string, { breadcrumb: string; title: string }> = {
    '/app/dashboard': { breadcrumb: 'Páginas', title: 'Painel' },
    '/app/inventory': { breadcrumb: 'Páginas', title: 'Produtos' },
    '/app/purchase-orders': { breadcrumb: 'Páginas', title: 'Pedidos de Compra' },
    '/app/suppliers': { breadcrumb: 'Páginas', title: 'Fornecedores' },
    '/app/kanban': { breadcrumb: 'Páginas', title: 'Kanban' },
    '/app/integrations': { breadcrumb: 'Páginas', title: 'Integrações' },
    '/app/audit': { breadcrumb: 'Páginas', title: 'Auditoria' },
    '/app/settings': { breadcrumb: 'Páginas', title: 'Configurações' },
  };
  return map[pathname] || { breadcrumb: 'Páginas', title: 'Painel' };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('user');

    if (!userId || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      queueMicrotask(() => {
        if (mountedRef.current) setUser(parsed);
      });
    } catch {
      router.push('/login');
    }

    return () => {
      mountedRef.current = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      await tokenStorage.clear();
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  const { breadcrumb, title } = getBreadcrumb(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar - fundo cinza claro, ícones sutis (estilo line-art) */}
      <aside className="w-64 border-r border-slate-100 bg-slate-50/80 flex flex-col shrink-0 z-30">
        <Link
          href="/app/dashboard"
          className="p-5 flex items-center gap-3 border-b border-slate-100/80 hover:bg-white/50 transition-colors"
        >
          <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-white shrink-0 shadow-sm">
            <span className="material-icons-round text-[20px] opacity-95">inventory_2</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800 whitespace-nowrap">
            AAGC<span className="text-primary-600">.SaaS</span>
          </span>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-primary-600 bg-blue-50/90'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                }`}
              >
                <span className={`material-icons-round text-[20px] ${isActive ? 'text-primary-600 opacity-95' : 'text-slate-400 opacity-80'}`}>
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100/80">
          <Link
            href="/app/settings"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/app/settings'
                ? 'text-primary-600 bg-blue-50/90'
                : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
            }`}
          >
            <span className="material-icons-round text-[20px] text-slate-400 opacity-90">settings</span>
            <span className="whitespace-nowrap">Configurações</span>
          </Link>
        </div>
      </aside>

      {/* Main: Header + Content - minimalista, lupa e ícones sutis */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/30">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{breadcrumb}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">{title}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] opacity-70 group-focus-within:opacity-100 group-focus-within:text-primary-500 transition-all pointer-events-none select-none">
                search
              </span>
              <input
                type="text"
                placeholder="Pesquisar recursos..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm w-64 text-slate-700 focus:ring-1 focus:ring-primary-500/30 focus:border-primary-400/50 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                aria-label="Pesquisar recursos"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full relative transition-colors"
                aria-label="Notificações"
              >
                <span className="material-icons-round text-[20px] opacity-80">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-400 rounded-full border-2 border-white" />
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{roleLabels[user.role] || user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Sair
                </button>
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm ring-1 ring-slate-200/80 overflow-hidden">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-[1600px] mx-auto w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
