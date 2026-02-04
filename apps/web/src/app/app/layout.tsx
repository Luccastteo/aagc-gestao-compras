'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Building2,
  Kanban,
  FileText,
  LogOut,
  Bot,
  Bell,
  Settings,
} from 'lucide-react';
import { authApi } from '@/lib/api';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('user');

    if (!userId || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if API fails, clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  const navigation = [
    { name: 'Painel', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Estoque', href: '/app/inventory', icon: Package },
    { name: 'Pedidos de Compra', href: '/app/purchase-orders', icon: ShoppingCart },
    { name: 'Fornecedores', href: '/app/suppliers', icon: Building2 },
    { name: 'Kanban', href: '/app/kanban', icon: Kanban },
    { name: 'Integrações', href: '/app/integrations', icon: Bell },
    { name: 'Auditoria', href: '/app/audit', icon: FileText },
    { name: 'Configurações', href: '/app/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-blue-400">AAGC</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Gestão Inteligente de Estoque</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-400 shadow-sm border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
                  }
                `}
              >
                <Icon 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-blue-400 stroke-[2]' : 'text-gray-400'
                  }`} 
                />
                <span className={isActive ? 'font-semibold text-blue-400' : 'font-normal'}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[user.role] || user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5 transition-colors duration-200" />
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
