import React from 'react';
import { ShieldCheck, Lock, ExternalLink, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  disclaimerText: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, disclaimerText }) => {
  return (
    <footer className="bg-[#080B12] border-t border-slate-800 text-slate-400 text-xs">
      {/* Transparency & Legal Disclosure Bar */}
      <div id="transparency-section" className="border-b border-slate-800/80 bg-[#0B0F19]/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center shrink-0 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">
                Transparência Regulatória & Proteção ao Consumidor (CDC e CONAR)
              </span>
              {disclaimerText}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                K
              </div>
              <span className="text-sm font-bold text-white tracking-tight">Kroma Fintech Market</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Marketplace multicategoria inteligente. Conectores oficiais com os maiores ecossistemas de e-commerce do Brasil e fornecedores certificados.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Criptografia de ponta a ponta</span>
            </div>
          </div>

          <div id="integrations-info-section">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Marketplaces Parceiros
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-300">Mercado Livre Brasil</span>
                <span className="text-[10px] text-slate-400 block">API Developers Oficial (MLB)</span>
              </li>
              <li>
                <span className="text-slate-300">Shopee Brasil</span>
                <span className="text-[10px] text-slate-400 block">Open Platform & Afiliados</span>
              </li>
              <li>
                <span className="text-slate-300">Amazon Brasil</span>
                <span className="text-[10px] text-slate-400 block">PA-API 5.0 & Associados</span>
              </li>
              <li>
                <span className="text-slate-300">TikTok Shop</span>
                <span className="text-[10px] text-slate-400 block">TTSP Partner Oficial</span>
              </li>
            </ul>
          </div>

          <div id="dropship-info-section">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Módulos Comerciais
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-300">Programa de Afiliados</span>
                <span className="text-[10px] text-slate-400 block">Rastreamento de cliques e conversões oficiais</span>
              </li>
              <li>
                <span className="text-slate-300">Dropshipping Homologado</span>
                <span className="text-[10px] text-slate-400 block">Fornecedores com contrato e envio direto</span>
              </li>
              <li>
                <span className="text-slate-300">Auditoria & Logs</span>
                <span className="text-[10px] text-slate-400 block">Registro de erros e histórico de sincronização</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Administração
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Painel protegido para lojistas, gerência de credenciais, sincronização de dados reais e controle de pedidos.
            </p>
            <button
              onClick={onOpenAdmin}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white border border-slate-800 transition-colors text-xs font-medium"
            >
              Acesso ao Painel Administrativo
            </button>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} Kroma Marketplace Fintech. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <span>Privacidade de Dados</span>
            <span>·</span>
            <span>Termos de Uso</span>
            <span>·</span>
            <span>Segurança Operacional</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
