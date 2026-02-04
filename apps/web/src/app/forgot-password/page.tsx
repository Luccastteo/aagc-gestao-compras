'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      
      // In development, the API returns the reset URL
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar email de recuperação');
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
            
            <h1 className="text-2xl font-bold mb-2">Email Enviado!</h1>
            <p className="text-muted-foreground mb-6">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>

            {resetUrl && (
              <div className="p-4 bg-primary/10 rounded-lg mb-6 text-left">
                <p className="text-sm font-medium mb-2">Modo desenvolvimento:</p>
                <a 
                  href={resetUrl} 
                  className="text-xs text-primary break-all hover:underline"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bot className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AAGC</h1>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Esqueceu sua senha?</h2>
          <p className="text-muted-foreground mb-6">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  Enviando...
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
