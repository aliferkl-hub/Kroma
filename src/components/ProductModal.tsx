import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, ShoppingCart, Truck, Calendar, Store, ArrowUpRight, AlertCircle, Copy, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onDirectBuy?: (product: Product) => void;
  dropshipCheckoutEnabled: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onDirectBuy,
  dropshipCheckoutEnabled
}) => {
  const [copied, setCopied] = useState(false);

  if (!product) return null;

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

  const formattedDate = new Date(product.lastUpdated).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/api/redirect/${product.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAffiliateRedirect = () => {
    window.open(`/api/redirect/${product.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-[#111624] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Product Image & Gallery */}
        <div className="w-full md:w-1/2 bg-[#161D2E] p-6 flex flex-col items-center justify-center relative">
          <div className="w-full aspect-square max-h-[360px] flex items-center justify-center">
            <img
              src={product.imageUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="mt-4 w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-purple-400" />
              {product.sourceName}
            </span>
            <span className="font-mono text-[11px]">ID Original: {product.originalId}</span>
          </div>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Category and Brand */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span className="font-medium text-purple-400">{product.brand || 'Marca Oficial'}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category}</span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-4 leading-snug">
              {product.title}
            </h2>

            {/* Pricing Section */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Preço Atual Oficial</div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                  {formattedPrice}
                </span>
                {formattedOriginalPrice && (
                  <span className="text-sm text-slate-500 line-through tabular-nums">
                    {formattedOriginalPrice}
                  </span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Atualizado em: {formattedDate}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Descrição do Item
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-2">
                {product.description}
              </p>
            </div>

            {/* Dropshipping Specific Info or Affiliate Transparency Box */}
            {product.type === 'dropshipping' ? (
              <div className="mb-6 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200">
                <div className="font-semibold flex items-center gap-1.5 mb-1 text-emerald-400">
                  <Truck className="w-4 h-4" />
                  Envio Direto pelo Fornecedor Homologado
                </div>
                <p className="text-emerald-300/80">
                  Fornecedor: {product.dropshipDetails?.supplierName || 'Parceiro Verificado'}.
                  Prazo estimado de despacho: {product.dropshipDetails?.shippingDays || 5} dias úteis com código de rastreamento.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-slate-300">
                <div className="font-semibold text-purple-300 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Compra Concluída no Marketplace Parceiro
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Ao clicar para comprar, você será direcionado para o site oficial seguro ({product.sourceName}).
                  Este portal pode receber comissão por compras qualificadas, garantindo a você suporte e a proteção oficial do consumidor.
                </p>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            {product.type === 'dropshipping' ? (
              <button
                disabled={!dropshipCheckoutEnabled}
                onClick={() => {
                  if (onDirectBuy) onDirectBuy(product);
                  onClose();
                }}
                className={`w-full py-3 px-4 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                  dropshipCheckoutEnabled
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  {dropshipCheckoutEnabled ? 'Finalizar Compra Direta' : 'Checkout Próprio em Homologação'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleAffiliateRedirect}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
              >
                <span>Comprar na loja oficial ({product.sourceName})</span>
                <ArrowUpRight className="w-4 h-4 text-purple-200" />
              </button>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                onClick={handleCopyLink}
                className="hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link de afiliado copiado!' : 'Copiar link rastreado'}</span>
              </button>

              <a
                href={product.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                <span>Ver link original direto</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
