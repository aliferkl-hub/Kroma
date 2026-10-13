import React from 'react';
import { Search, ShieldCheck, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  totalProducts: number;
  onOpenAdmin: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  totalProducts,
  onOpenAdmin
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0F1423] via-[#0B0F19] to-[#0B0F19] pt-10 pb-12 border-b border-slate-800/80">
      {/* Subtle Fintech Glow background effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          
          {/* Status Kicker without pills - clean unboxed typography */}
          <div className="flex items-center gap-2 text-xs text-purple-400 font-medium mb-3">
            <span>Ecossistema Fintech</span>
            <span aria-hidden="true">·</span>
            <span>Mercados Oficiais Brasil</span>
            <span aria-hidden="true">·</span>
            <span>Rastreamento Seguro</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-4 text-balance">
            Produtos reais dos principais marketplaces e fornecedores oficiais.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
            Conexão direta com Mercado Livre Brasil, Shopee, Amazon e TikTok Shop. Transparência total
            em preços, disponibilidade atualizada e compras finalizadas com proteção oficial do consumidor.
          </p>

          {/* Integrated Search Bar */}
          <div className="relative max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos reais (ex: notebook, smartphone, cafeteira, tênis)..."
                className="w-full pl-12 pr-28 py-3.5 bg-[#141A29] border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-24 text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                className="absolute right-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Real Metrics Strip - Clean unboxed text with tabular numerals */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-8 text-xs text-slate-400">
            <div>
              <div className="text-lg font-bold text-white tabular-nums">{totalProducts}</div>
              <div className="text-slate-400">Produtos no Catálogo</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-lg font-bold text-white tabular-nums">4+</div>
              <div className="text-slate-400">Plataformas Integradas</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-lg font-bold text-purple-400">100% Real</div>
              <div className="text-slate-400">Zero Produtos Fictícios</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
