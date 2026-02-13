'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Bell, Shield, LogOut, Check, AlertCircle } from 'lucide-react';
import { authApi, tokenStorage } from '@/lib/api';
import { validatePasswordStrength } from '@/lib/password-validator';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const mountedRef = useRef(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        queueMicrotask(() => {
          if (mountedRef.current) setUser(parsed);
        });
      } catch {
        // ignore invalid stored user
      }
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const passwordStrength = validatePasswordStrength(newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordStrength.isValid) {
      setPasswordError('A senha não atende aos requisitos de segurança');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    setPasswordLoading(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if API fails, clear local storage
      await tokenStorage.clear();
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  const roleLabels: Record<string, string> = {
    OWNER: 'Proprietário',
    MANAGER: 'Gerente',
    OPERATOR: 'Operador',
    VIEWER: 'Visualizador',
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências e conta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
            
            <hr className="my-4 border-border" />
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-500 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-5 h-5" />
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Perfil
              </h2>

              {user && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{user.name}</h3>
                      <p className="text-muted-foreground">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {roleLabels[user.role] || user.role}
                      </span>
                    </div>
                  </div>

                  <hr className="border-border" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome</p>
                      <p className="mt-1">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                      <p className="mt-1">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organização</p>
                      <p className="mt-1">{user.organizationName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                      <p className="mt-1">{roleLabels[user.role] || user.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </h2>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="settings-current-password" className="text-sm font-medium mb-2 block">Senha Atual</label>
                  <input
                    id="settings-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="settings-new-password" className="text-sm font-medium mb-2 block">Nova Senha</label>
                  <input
                    id="settings-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="settings-confirm-password" className="text-sm font-medium mb-2 block">Confirmar Nova Senha</label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    required
                  />
                </div>

                {newPassword && (
                  <div className="text-xs text-muted-foreground space-y-1 p-3 bg-secondary/30 rounded-lg" aria-live="polite">
                    <p className="font-semibold mb-1">Requisitos de senha:</p>
                    <p className={passwordStrength.checks.minLength ? 'text-green-500' : ''}>
                      {passwordStrength.checks.minLength ? '✓' : '○'} Mínimo 10 caracteres
                    </p>
                    <p className={passwordStrength.checks.hasUppercase ? 'text-green-500' : ''}>
                      {passwordStrength.checks.hasUppercase ? '✓' : '○'} Pelo menos 1 maiúscula
                    </p>
                    <p className={passwordStrength.checks.hasLowercase ? 'text-green-500' : ''}>
                      {passwordStrength.checks.hasLowercase ? '✓' : '○'} Pelo menos 1 minúscula
                    </p>
                    <p className={passwordStrength.checks.hasNumber ? 'text-green-500' : ''}>
                      {passwordStrength.checks.hasNumber ? '✓' : '○'} Pelo menos 1 número
                    </p>
                    <p className={passwordStrength.checks.hasSymbol ? 'text-green-500' : ''}>
                      {passwordStrength.checks.hasSymbol ? '✓' : '○'} Pelo menos 1 símbolo (!@#$%^&*)
                    </p>
                    <p className={passwordStrength.checks.notCommon ? 'text-green-500' : ''}>
                      {passwordStrength.checks.notCommon ? '✓' : '○'} Não é senha comum
                    </p>
                    <p className={newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-500' : ''}>
                      {newPassword === confirmPassword && newPassword.length > 0 ? '✓' : '○'} Senhas coincidem
                    </p>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 text-sm bg-green-500/10 text-green-500 rounded-lg border border-green-500/20 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {passwordSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferências de Notificação
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium">Notificações por E-mail</p>
                    <p className="text-sm text-muted-foreground">Receber atualizações por e-mail</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <span className="sr-only">Ativar notificações por e-mail</span>
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium">Alertas de Estoque Baixo</p>
                    <p className="text-sm text-muted-foreground">Ser notificado quando itens atingirem estoque mínimo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <span className="sr-only">Ativar alertas de estoque baixo</span>
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium">Atualizações de Pedidos</p>
                    <p className="text-sm text-muted-foreground">Notificar sobre mudanças de status em pedidos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <span className="sr-only">Ativar atualizações de pedidos</span>
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium">Relatórios Semanais</p>
                    <p className="text-sm text-muted-foreground">Receber resumo semanal por e-mail</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <span className="sr-only">Ativar relatórios semanais</span>
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                As configurações de notificação serão salvas automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
