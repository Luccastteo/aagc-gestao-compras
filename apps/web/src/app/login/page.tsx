'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Bot, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('manager@demo.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authApi.login(email, password);
      
      // Check if the API returned an error
      if (result.error) {
        setError(result.error);
        return;
      }

      // Check if user data exists
      if (!result.user || !result.user.userId) {
        setError('Resposta inválida do servidor');
        return;
      }

      // Save tokens and user data
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('userId', result.user.userId);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      // Redirect to dashboard
      router.push('/app/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Falha no login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bot className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AAGC</h1>
          <p className="text-muted-foreground mt-2">Gestão Inteligente de Compras</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Entrar na sua conta</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-muted-foreground">Lembrar-me</span>
              </label>
              <Link href="/forgot-password" className="text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </div>

            {error && (
              <div className="p-4 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
          <p className="text-sm font-medium mb-3 text-center">Contas de Demonstração</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button 
              onClick={() => { setEmail('owner@demo.com'); setPassword('demo123'); }}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
            >
              <p className="font-medium">Proprietário</p>
              <p className="text-muted-foreground">owner@demo.com</p>
            </button>
            <button 
              onClick={() => { setEmail('manager@demo.com'); setPassword('demo123'); }}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
            >
              <p className="font-medium">Gerente</p>
              <p className="text-muted-foreground">manager@demo.com</p>
            </button>
            <button 
              onClick={() => { setEmail('operator@demo.com'); setPassword('demo123'); }}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
            >
              <p className="font-medium">Operador</p>
              <p className="text-muted-foreground">operator@demo.com</p>
            </button>
            <button 
              onClick={() => { setEmail('viewer@demo.com'); setPassword('demo123'); }}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
            >
              <p className="font-medium">Visualizador</p>
              <p className="text-muted-foreground">viewer@demo.com</p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Senha: demo123</p>
        </div>
      </div>
    </div>
  );
}
