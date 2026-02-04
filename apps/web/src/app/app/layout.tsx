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
    { name: 'Painel', href: '/app/dashboard', icon: LayoutDashboard, color: 'blue' },
    { name: 'Estoque', href: '/app/inventory', icon: Package, color: 'green' },
    { name: 'Pedidos de Compra', href: '/app/purchase-orders', icon: ShoppingCart, color: 'orange' },
    { name: 'Fornecedores', href: '/app/suppliers', icon: Building2, color: 'yellow' },
    { name: 'Kanban', href: '/app/kanban', icon: Kanban, color: 'purple' },
    { name: 'Integrações', href: '/app/integrations', icon: Bell, color: 'cyan' },
    { name: 'Auditoria', href: '/app/audit', icon: FileText, color: 'pink' },
    { name: 'Configurações', href: '/app/settings', icon: Settings, color: 'slate' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AAGC</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Gestão Inteligente de Estoque</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            // Cores específicas para cada item
            const colorClasses = {
              blue: {
                bg: 'bg-blue-500/10',
                text: 'text-blue-400',
                border: 'border-blue-500/20',
                icon: 'text-blue-400'
              },
              green: {
                bg: 'bg-green-500/10',
                text: 'text-green-400',
                border: 'border-green-500/20',
                icon: 'text-green-400'
              },
              orange: {
                bg: 'bg-orange-500/10',
                text: 'text-orange-400',
                border: 'border-orange-500/20',
                icon: 'text-orange-400'
              },
              yellow: {
                bg: 'bg-yellow-500/10',
                text: 'text-yellow-400',
                border: 'border-yellow-500/20',
                icon: 'text-yellow-400'
              },
              purple: {
                bg: 'bg-purple-500/10',
                text: 'text-purple-400',
                border: 'border-purple-500/20',
                icon: 'text-purple-400'
              },
              cyan: {
                bg: 'bg-cyan-500/10',
                text: 'text-cyan-400',
                border: 'border-cyan-500/20',
                icon: 'text-cyan-400'
              },
              pink: {
                bg: 'bg-pink-500/10',
                text: 'text-pink-400',
                border: 'border-pink-500/20',
                icon: 'text-pink-400'
              },
              slate: {
                bg: 'bg-slate-500/10',
                text: 'text-slate-300',
                border: 'border-slate-500/20',
                icon: 'text-slate-300'
              }
            };
            
            const colors = colorClasses[item.color as keyof typeof colorClasses];
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? `${colors.bg} ${colors.text} shadow-sm border ${colors.border}`
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
                  }
                `}
              >
                <Icon 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? `${colors.icon} stroke-[2]` : 'text-gray-400'
                  }`} 
                />
                <span className={isActive ? `font-semibold ${colors.text}` : 'font-normal'}>
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
