import React, { useState } from 'react';
import { ExternalLink, ShoppingCart, ShieldCheck, Heart, Info, ArrowUpRight } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onDirectBuy?: (product: Product) => void;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onDirectBuy,
  isFavorite,
  onToggleFavorite
}) => {
  const [imageError, setImageError] = useState(false);

  // Format price in BRL
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: product.currency || 'BRL'
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: product.currency || 'BRL'
      }).format(product.originalPrice)
    : null;

  // Source logo/label
  const getSourceBadge = () => {
    switch (product.source) {
      case 'mercadolivre':
        return { name: 'Mercado Livre Brasil', color: 'text-amber-400 border-amber-900/50 bg-amber-950/30' };
      case 'shopee':
        return { name: 'Shopee Brasil', color: 'text-orange-400 border-orange-900/50 bg-orange-950/30' };
      case 'amazon':
        return { name: 'Amazon Brasil', color: 'text-cyan-400 border-cyan-900/50 bg-cyan-950/30' };
      case 'tiktok':
        return { name: 'TikTok Shop', color: 'text-rose-400 border-rose-900/50 bg-rose-950/30' };
      case 'dropship_supplier':
        return { name: 'Fornecedor Homologado', color: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30' };
      default:
        return { name: product.sourceName, color: 'text-purple-400 border-purple-900/50 bg-purple-950/30' };
    }
  };

  const sourceInfo = getSourceBadge();

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.type === 'dropshipping' && onDirectBuy) {
      onDirectBuy(product);
    } else {
      // Affiliate click - trigger redirect with tracking
      window.open(`/api/redirect/${product.id}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative bg-[#111624] border border-slate-800/90 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-purple-950/20"
    >
      {/* Top Media Container */}
      <div className="relative aspect-square w-full bg-[#182032] overflow-hidden flex items-center justify-center p-4">
        {!imageError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-4 text-center">
            <Info className="w-8 h-8 mb-2 text-slate-600" />
            <span className="text-xs font-medium text-slate-400">{product.brand || 'Produto Oficial'}</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all ${
            isFavorite
              ? 'bg-rose-500 text-white'
              : 'bg-[#0B0F19]/70 text-slate-400 hover:text-white hover:bg-[#0B0F19]'
          }`}
          title={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Source attribution tag */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border backdrop-blur-md bg-[#0B0F19]/80 border-slate-700/60 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>{product.sourceName}</span>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata clean unboxed text */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="truncate max-w-[140px]">{product.brand || 'Marca Oficial'}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[120px]">{product.category}</span>
          </div>

          {/* Product Title */}
          <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2 group-hover:text-purple-300 transition-colors">
            {product.title}
          </h3>
        </div>

        {/* Price & Action */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-white tabular-nums tracking-tight">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs text-slate-500 line-through tabular-nums">
                {formattedOriginalPrice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.type === 'dropshipping' ? (
              <button
                onClick={handleBuyClick}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Compra Direta</span>
              </button>
            ) : (
              <button
                onClick={handleBuyClick}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-purple-900/60 hover:text-purple-200 border border-slate-700 hover:border-purple-600 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                title={`Ir para ${product.sourceName}`}
              >
                <span>Comprar na loja oficial</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
              </button>
            )}
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="font-mono">
              {product.sku ? `SKU: ${product.sku}` : `ID: ${product.originalId}`}
            </span>
            <span>{product.available ? 'Disponível' : 'Indisponível'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
