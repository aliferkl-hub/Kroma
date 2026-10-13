import React from 'react';
import { ShieldAlert, RefreshCw, KeyRound, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { IntegrationConfig } from '../types';

interface EmptyCatalogStateProps {
  onOpenAdmin: () => void;
  integrations: Record<string, IntegrationConfig>;
}

export const EmptyCatalogState: React.FC<EmptyCatalogStateProps> = ({
  onOpenAdmin,
  integrations
}) => {
  return (
    <div className="bg-[#111624] border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/40 flex items-center justify-center mx-auto mb-6 text-purple-400">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 block mb-2">
        Catálogo 100% Autêntico e Verificado
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
        Catálogo Aguardando Ativação das Integrações Oficiais
      </h2>

      <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-8">
        Em conformidade com a nossa política de dados estritamente reais, este marketplace
        não exibe produtos de demonstração, imagens fictícias ou preços inventados. Os produtos serão
        carregados assim que os conectores com as APIs oficiais (Mercado Livre Brasil, Shopee, Amazon, TikTok Shop)
        ou fornecedores homologados forem autenticados e sincronizados na Central de Integrações.
      </p>

      {/* Grid of official connectors with their current status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-left">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Mercado Livre Brasil</span>
            <span className="text-[10px] text-amber-400 font-medium">Aguardando Sync</span>
          </div>
          <p className="text-xs text-slate-400">
            API Pública Oficial (MLB). Pronto para teste e sincronização em tempo real de produtos reais.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Shopee Brasil</span>
            <span className="text-[10px] text-slate-400 font-medium">Requer Credenciais</span>
          </div>
          <p className="text-xs text-slate-400">
            Open Platform API & Afiliados. Requer Partner ID e Partner Key homologados.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Amazon Brasil</span>
            <span className="text-[10px] text-slate-400 font-medium">Requer PA-API 5.0</span>
          </div>
          <p className="text-xs text-slate-400">
            Programa de Associados. Requer Associate Tag e chaves autorizadas AWS.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">TikTok Shop</span>
            <span className="text-[10px] text-slate-400 font-medium">Requer TTSP</span>
          </div>
          <p className="text-xs text-slate-400">
            TikTok Shop Partner API. Requer cadastro e token de autorização.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onOpenAdmin}
          className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 group"
        >
          <KeyRound className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
          Acessar Central de Integrações
          <ArrowRight className="w-4 h-4 text-purple-200" />
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Zero Produtos Fictícios
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          Segurança de Credenciais no Backend
        </span>
        <span className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          Validação Real de Conexão
        </span>
      </div>
    </div>
  );
};
