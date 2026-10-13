import React, { useState } from 'react';
import { Lock, KeyRound, X, AlertCircle, Mail, ShieldCheck } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (token: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const [authMode, setAuthMode] = useState<'pin' | 'credentials'>('credentials');
  const [email, setEmail] = useState('admin@vendplus.com.br');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = authMode === 'credentials'
        ? { email, password }
        : { pin };

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciais de acesso Master Owner inválidas.');
      }

      onAuthenticated(data.token || pin);
      onClose();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#111624] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-700/50 flex items-center justify-center mb-4 text-purple-400 shadow-md shadow-purple-950/40">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          Acesso Master Owner VEND+
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Autenticação administrativa com controle de acesso para a Central de Integrações e Governança do Marketplace.
        </p>

        {/* Toggle Mode */}
        <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 mb-5 text-xs">
          <button
            type="button"
            onClick={() => setAuthMode('credentials')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              authMode === 'credentials'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            E-mail & Senha Master
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('pin')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              authMode === 'pin'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PIN de Segurança
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'credentials' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail do Master Owner
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@vendplus.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha Master
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                PIN Administrativo
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Digite o PIN de segurança..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-900/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Autenticando Master Owner...' : 'Acessar Central de Integrações'}
          </button>
        </form>

        <div className="mt-4 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-mono text-[10px]">
            <span>Master Owner Inicial:</span>
            <span className="text-purple-400">admin@vendplus.com.br</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>Senha / PIN:</span>
            <span className="text-purple-300">vendplus_master_owner_2026 / vendplus2026</span>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-500">
            Sessão autenticada protegida com token criptográfico de 24 horas.
          </span>
        </div>
      </div>
    </div>
  );
};
