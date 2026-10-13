import React, { useState, useEffect } from 'react';
import { Save, Lock, ShieldCheck, Palette, Store } from 'lucide-react';

interface SettingsTabProps {
  adminPin: string;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ adminPin, onRefresh }) => {
  const [formData, setFormData] = useState({
    storeName: 'Kroma Marketplace',
    tagline: 'Marketplace Multicategoria & Ecossistema de Compras Inteligente',
    primaryColor: '#7C3AED',
    adminPin: 'admin123',
    disclaimerText: '',
    contactEmail: 'contato@kromamarketplace.com.br'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setFormData((prev) => ({
          ...prev,
          ...data,
          adminPin: adminPin
        }));
      })
      .catch((err) => console.error(err));
  }, [adminPin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const resp = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify(formData)
      });
      const data = await resp.json();

      if (resp.ok) {
        setMessage({ type: 'success', text: 'Configurações da loja salvas com sucesso!' });
        onRefresh();
      } else {
        throw new Error(data.error || 'Falha ao salvar configurações.');
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">Configurações & Identidade da Loja</h3>
        <p className="text-xs text-slate-400">
          Personalize as informações institucionais, políticas e credenciais de acesso da loja.
        </p>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
          message.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800 text-rose-300'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">Fechar</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#111624] border border-slate-800 space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Nome Oficial da Loja</label>
          <input
            type="text"
            required
            value={formData.storeName}
            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Slogan / Tagline Institucional</label>
          <input
            type="text"
            required
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">E-mail de Contato / Suporte</label>
          <input
            type="email"
            required
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            PIN Administrativo de Segurança (Controle de Acesso)
          </label>
          <input
            type="text"
            required
            value={formData.adminPin}
            onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Texto de Aviso de Transparência & CDC (Exibido no Rodapé)
          </label>
          <textarea
            rows={4}
            required
            value={formData.disclaimerText}
            onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white leading-relaxed"
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-purple-900/30"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
