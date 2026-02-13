'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { validatePasswordStrength } from '@/lib/password-validator';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const mountedRef = useRef(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    if (!token) {
      queueMicrotask(() => {
        if (mountedRef.current) setError('Token de recuperação não encontrado');
      });
    }
    return () => {
      mountedRef.current = false;
    };
  }, [token]);

  const passwordStrength = validatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordStrength.isValid) {
      setError('A senha não atende aos requisitos de segurança');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg text-center">
            <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Senha Redefinida!</h1>
            <p className="text-muted-foreground mb-6">
              Sua senha foi alterada com sucesso. Você será redirecionado para o login...
            </p>

            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Redirecionando...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg text-center">
            <div className="inline-flex items-center justify-center p-4 bg-destructive/10 rounded-full mb-6">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
            <p className="text-muted-foreground mb-6">
              O link de recuperação de senha é inválido ou expirou.
            </p>

            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Solicitar Novo Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bot className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AAGC</h1>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Redefinir Senha</h2>
          <p className="text-muted-foreground mb-6">Digite sua nova senha abaixo.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-new-password" className="text-sm font-medium mb-2 block">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="text-sm font-medium mb-2 block">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1" aria-live="polite">
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
              <p className={password === confirmPassword && password.length > 0 ? 'text-green-500' : ''}>
                {password === confirmPassword && password.length > 0 ? '✓' : '○'} Senhas coincidem
              </p>
            </div>

            {error && (
              <div
                className="p-4 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordStrength.isValid || password !== confirmPassword}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

