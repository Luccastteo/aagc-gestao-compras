'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, tokenStorage } from '@/lib/api';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { Bot, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'manager@demo.com',
      password: 'demo123',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');

    const email = (data.email ?? '').toString().trim().toLowerCase();
    const password = (data.password ?? '').toString().trim();

    try {
      const result = await authApi.login(email, password);
      const res = result?.data ?? result;

      if (res?.error) {
        setApiError(res.error);
        return;
      }

      const user = res?.user;
      const userId = user?.userId ?? user?.id;
      if (!user || !userId) {
        setApiError('Resposta inválida do servidor');
        return;
      }

      const accessToken = res?.accessToken;
      const refreshToken = res?.refreshToken;
      if (!accessToken) {
        setApiError('Sessão inválida. Tente novamente.');
        return;
      }

      await tokenStorage.set({
        accessToken,
        refreshToken: refreshToken ?? accessToken,
      });
      localStorage.setItem('userId', userId);
      localStorage.setItem('user', JSON.stringify({ ...user, userId }));
      router.push('/app/dashboard');
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err.response?.data?.message ?? err.response?.data?.error;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? '');
      const isCredentialError = text && (text.includes('Credenciais') || text.includes('inválidas') || err.response?.status === 401);
      setApiError(
        err.code === 'ERR_NETWORK'
          ? 'Não foi possível conectar à API. Verifique se o servidor está rodando (porta 3003).'
          : isCredentialError
            ? 'E-mail ou senha incorretos. Use as contas demo (ex.: manager@demo.com / demo123). Se acabou de instalar, rode: pnpm db:seed'
            : text || 'Falha no login. Tente novamente.',
      );
    }
  };

  const setDemoAccount = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bot className="w-10 h-10 text-primary" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AAGC</h1>
          <p className="text-muted-foreground mt-2">Gestão Inteligente de Compras</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Entrar na sua conta</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="text-sm font-medium mb-2 block">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition ${
                    errors.email ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="seu@email.com"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm font-medium mb-2 block">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition ${
                    errors.password ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="••••••••"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.password.message}
                </p>
              )}
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

            {apiError && (
              <div className="p-4 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20" role="alert">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
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
              onClick={() => setDemoAccount('owner@demo.com', 'demo123')}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
              type="button"
            >
              <p className="font-medium">Proprietário</p>
              <p className="text-muted-foreground">owner@demo.com</p>
            </button>
            <button 
              onClick={() => setDemoAccount('manager@demo.com', 'demo123')}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
              type="button"
            >
              <p className="font-medium">Gerente</p>
              <p className="text-muted-foreground">manager@demo.com</p>
            </button>
            <button 
              onClick={() => setDemoAccount('operator@demo.com', 'demo123')}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
              type="button"
            >
              <p className="font-medium">Operador</p>
              <p className="text-muted-foreground">operator@demo.com</p>
            </button>
            <button 
              onClick={() => setDemoAccount('viewer@demo.com', 'demo123')}
              className="p-2 bg-background rounded border border-border hover:border-primary/50 transition text-left"
              type="button"
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
