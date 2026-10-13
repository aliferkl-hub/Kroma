import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { EmptyCatalogState } from './components/EmptyCatalogState';
import { DropshipCheckoutModal } from './components/DropshipCheckoutModal';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Footer } from './components/Footer';
import { Product, StoreStatus, IntegrationConfig } from './types';
import { Filter, SlidersHorizontal, Heart, ShieldCheck, CheckCircle2, ShoppingCart, RefreshCw, X, Layers } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'store' | 'admin'>('store');
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem('vendplus_admin_token') || '');
  
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedOriginType, setSelectedOriginType] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vendplus_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
  const [orderConfirmationCode, setOrderConfirmationCode] = useState<string | null>(null);

  // Check URL params for OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'mercadolivre') {
      alert('Sucesso! A conta do Mercado Livre Brasil foi vinculada oficialmente via OAuth 2.0.');
      window.history.replaceState({}, '', window.location.pathname);
      loadData();
    } else if (params.get('oauth_error')) {
      alert(`Falha na autorização OAuth: ${params.get('oauth_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, prodRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/products')
      ]);

      const statusData = await statusRes.json();
      const prodData = await prodRes.json();

      setStatus(statusData);
      setProducts(prodData.products || []);

      if (adminToken) {
        try {
          const intRes = await fetch('/api/integrations', {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'x-admin-token': adminToken
            }
          });
          if (intRes.ok) {
            const intData = await intRes.json();
            setIntegrations(intData);
          }
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminToken]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem('vendplus_favorites', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleOpenAdmin = () => {
    if (adminToken) {
      setActiveView('admin');
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAuthenticated = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('vendplus_admin_token', token);
    setActiveView('admin');
  };

  // Filter products on client for fluid responsive feedback
  const filteredProducts = products.filter((p) => {
    if (onlyFavorites && !favorites.includes(p.id)) return false;
    if (selectedCategory !== 'all') {
      const catNorm = selectedCategory.toLowerCase();
      if (!p.category.toLowerCase().includes(catNorm)) return false;
    }
    if (selectedSource !== 'all' && p.source !== selectedSource) return false;
    if (selectedOriginType !== 'all' && p.originType !== selectedOriginType) return false;
    if (selectedType !== 'all' && p.type !== selectedType) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.originalId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort
  if (sortOption === 'price_asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'price_desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else {
    filteredProducts.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }

  // Count by category
  const categoriesWithCount: Record<string, number> = {};
  for (const p of products) {
    categoriesWithCount[p.category] = (categoriesWithCount[p.category] || 0) + 1;
  }

  if (activeView === 'admin') {
    return (
      <AdminDashboard
        onBackToStore={() => {
          setActiveView('store');
          loadData();
        }}
        adminToken={adminToken}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white font-sans">
      
      {/* Top Header */}
      <Header
        onOpenAdmin={handleOpenAdmin}
        activeView={activeView}
        setActiveView={setActiveView}
        favoritesCount={favorites.length}
        hasConnectedSources={status?.hasConnectedIntegrations || false}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* Fintech Hero Banner */}
        <Hero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          totalProducts={products.length}
          onOpenAdmin={handleOpenAdmin}
        />

        {/* Categories Bar */}
        <CategoryNav
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setOnlyFavorites(false);
          }}
          categoriesWithCount={categoriesWithCount}
        />

        {/* Catalog Section */}
        <div id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Catálogo VEND+</span>
                <span className="text-xs font-mono font-medium text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md tabular-nums">
                  {filteredProducts.length} itens reais
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Produtos auditados com preços oficiais, procedência verificada e proteção ao consumidor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Modalidade / Origin Type Filter requested */}
              <div className="flex items-center gap-1 bg-[#111624] border border-slate-800 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400">Modalidade:</span>
                <select
                  value={selectedOriginType}
                  onChange={(e) => setSelectedOriginType(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#111624]">Todas as Modalidades</option>
                  <option value="proprio" className="bg-[#111624]">Produtos Próprios</option>
                  <option value="dropship" className="bg-[#111624]">Fornecedor Homologado (Dropship)</option>
                  <option value="afiliado" className="bg-[#111624]">Afiliados Oficiais (Externo)</option>
                </select>
              </div>

              {/* Marketplace Source Filter */}
              <div className="flex items-center gap-1 bg-[#111624] border border-slate-800 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400">Canal:</span>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#111624]">Todos os Canais</option>
                  <option value="mercadolivre" className="bg-[#111624]">Mercado Livre Brasil</option>
                  <option value="shopee" className="bg-[#111624]">Shopee Brasil</option>
                  <option value="amazon" className="bg-[#111624]">Amazon Brasil</option>
                  <option value="tiktok" className="bg-[#111624]">TikTok Shop</option>
                  <option value="dropship_supplier" className="bg-[#111624]">Fornecedor Homologado</option>
                  <option value="proprio_vendplus" className="bg-[#111624]">VEND+ Próprio</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-1 bg-[#111624] border border-slate-800 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400">Ordenar:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#111624]">Mais Recentes</option>
                  <option value="price_asc" className="bg-[#111624]">Menor Preço</option>
                  <option value="price_desc" className="bg-[#111624]">Maior Preço</option>
                </select>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                  onlyFavorites
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : 'bg-[#111624] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current text-rose-400' : ''}`} />
                <span>Favoritos ({favorites.length})</span>
              </button>

            </div>
          </div>

          {/* Catalog Body: Zero-Fake Condition */}
          {products.length === 0 ? (
            /* ABSOLUTE RULE COMPLIANCE: If zero products are connected, display official waiting message */
            <EmptyCatalogState
              onOpenAdmin={handleOpenAdmin}
              integrations={integrations}
            />
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111624] border border-slate-800 text-slate-400 text-sm max-w-lg mx-auto">
              Nenhum produto encontrado para os filtros selecionados.
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSource('all');
                    setSelectedOriginType('all');
                    setSelectedType('all');
                    setSearchQuery('');
                    setOnlyFavorites(false);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelectedProduct}
                  onDirectBuy={(prod) => {
                    if (status?.dropshipCheckoutEnabled) {
                      setCheckoutProduct(prod);
                    } else {
                      setSelectedProduct(prod);
                    }
                  }}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

        </div>

      </main>

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onDirectBuy={(prod) => {
          setSelectedProduct(null);
          setCheckoutProduct(prod);
        }}
        dropshipCheckoutEnabled={Boolean(status?.dropshipCheckoutEnabled)}
      />

      {/* Dropship Direct Checkout Modal */}
      {checkoutProduct && (
        <DropshipCheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onOrderSuccess={(orderId) => {
            setCheckoutProduct(null);
            setOrderSuccessId(orderId);
            setOrderConfirmationCode(`VP-${Math.floor(100000 + Math.random() * 900000)}`);
            loadData();
          }}
        />
      )}

      {/* Order Success Banner Modal */}
      {orderSuccessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111624] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pedido Registrado com Sucesso!</h3>
            <p className="text-xs text-slate-300 mb-2">
              Pedido <span className="font-mono text-purple-400 font-bold">#{orderSuccessId}</span>
            </p>
            {orderConfirmationCode && (
              <div className="mb-4 p-3 bg-purple-950/40 border border-purple-800 rounded-xl text-center">
                <span className="text-[11px] text-purple-300 block">Código de Confirmação de Entrega:</span>
                <span className="text-lg font-bold text-white font-mono tracking-wider">{orderConfirmationCode}</span>
                <span className="text-[10px] text-slate-400 block mt-1">Apresente ao entregador no recebimento</span>
              </div>
            )}
            <div className="p-3 bg-slate-900 rounded-xl text-slate-400 text-xs mb-6 text-left space-y-1">
              <div>✓ Envio direto por fornecedor homologado</div>
              <div>✓ Notificações enviadas para o e-mail cadastrado</div>
              <div>✓ Rastreamento emitido após o despacho</div>
            </div>
            <button
              onClick={() => {
                setOrderSuccessId(null);
                setOrderConfirmationCode(null);
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* Admin / Master Owner Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      {/* Footer */}
      <Footer
        onOpenAdmin={handleOpenAdmin}
        disclaimerText={status?.disclaimerText || 'Transparência de afiliados e fornecedores conforme CDC.'}
      />

    </div>
  );
}
