import React from 'react';
import { ShieldCheck, SlidersHorizontal, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  onOpenAdmin: () => void;
  activeView: 'store' | 'admin';
  setActiveView: (view: 'store' | 'admin') => void;
  favoritesCount: number;
  onOpenFavorites?: () => void;
  hasConnectedSources: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  activeView,
  setActiveView,
  favoritesCount,
  onOpenFavorites,
  hasConnectedSources
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (4-5 single line nav links) — Zone 3 (1 primary action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView('store')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-transform">
              <span className="font-bold text-base text-white tracking-wider">K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Kroma <span className="text-purple-400 font-medium text-xs tracking-widest ml-1 uppercase">Fintech Market</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              setActiveView('store');
              const el = document.getElementById('catalog-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-purple-400 transition-colors whitespace-nowrap shrink-0"
          >
            Catálogo Oficial
          </button>
          <button
            onClick={() => {
              setActiveView('store');
              const el = document.getElementById('categories-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-purple-400 transition-colors whitespace-nowrap shrink-0"
          >
            Categorias
          </button>
          <button
            onClick={() => {
              setActiveView('store');
              const el = document.getElementById('integrations-info-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-purple-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Fontes Homologadas
          </button>
          <button
            onClick={() => {
              setActiveView('store');
              const el = document.getElementById('dropship-info-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-purple-400 transition-colors whitespace-nowrap shrink-0"
          >
            Fornecedores Diretos
          </button>
          <button
            onClick={() => {
              setActiveView('store');
              const el = document.getElementById('transparency-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-purple-400 transition-colors whitespace-nowrap shrink-0"
          >
            Transparência & CDC
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {activeView === 'store' ? (
            <button
              onClick={onOpenAdmin}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-lg shadow-sm shadow-purple-900/50 transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Painel Lojista & Integrações
            </button>
          ) : (
            <button
              onClick={() => setActiveView('store')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              Voltar à Loja
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
