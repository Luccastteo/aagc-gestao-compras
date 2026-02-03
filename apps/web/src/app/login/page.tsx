'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Bot } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('manager@demo.com');
  const [password, setPassword] = useState('demo123');
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

      // Save user data
      localStorage.setItem('userId', result.user.userId);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      // Redirect to dashboard
      router.push('/app/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">AAGC</h1>
          </div>
          <p className="text-muted-foreground">Agente Administrativo de Gestão de Compras</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
              required
            />
          </div>

          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Contas de Demonstração:</strong></p>
          <p>owner@demo.com / demo123 (Proprietário)</p>
          <p>manager@demo.com / demo123 (Gerente)</p>
          <p>operator@demo.com / demo123 (Operador)</p>
          <p>viewer@demo.com / demo123 (Visualizador)</p>
        </div>
      </div>
    </div>
  );
}
