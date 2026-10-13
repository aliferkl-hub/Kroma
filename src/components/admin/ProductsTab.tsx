import React, { useState } from 'react';
import { Trash2, Plus, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Search, Filter, Layers } from 'lucide-react';
import { Product } from '../../types';

interface ProductsTabProps {
  products: Product[];
  onRefresh: () => void;
  adminToken: string;
  initialSourceFilter?: string;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  onRefresh,
  adminToken,
  initialSourceFilter
}) => {
  const [filterSource, setFilterSource] = useState(initialSourceFilter || 'all');
  const [filterOriginType, setFilterOriginType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New product form
  const [formData, setFormData] = useState({
    originalId: '',
    sku: '',
    title: '',
    description: '',
    price: '',
    category: 'Eletrônicos',
    brand: '',
    imageUrl: '',
    originalUrl: '',
    originType: 'dropship' as 'proprio' | 'dropship' | 'afiliado',
    source: 'dropship_supplier' as 'dropship_supplier' | 'mercadolivre' | 'shopee' | 'amazon' | 'tiktok' | 'proprio_vendplus',
    stock: '10',
    supplierName: '',
    costPrice: ''
  });

  const filteredProducts = products.filter((p) => {
    if (filterSource !== 'all' && p.source !== filterSource) return false;
    if (filterOriginType !== 'all' && p.originType !== filterOriginType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.originalId.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este produto do catálogo?')) return;
    try {
      const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      const data = await resp.json();
      if (resp.ok) {
        setMessage({ type: 'success', text: data.message });
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleClearSource = async (source: string) => {
    if (!window.confirm(`Tem certeza que deseja remover TODOS os produtos sincronizados da fonte "${source}"?`)) return;
    try {
      const resp = await fetch(`/api/products/source/${source}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      const data = await resp.json();
      if (resp.ok) {
        setMessage({ type: 'success', text: data.message });
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.originalId || !formData.title || !formData.price || !formData.imageUrl) {
      alert('Preencha os campos obrigatórios (ID Original, Nome, Preço, Imagem).');
      return;
    }

    setLoading(true);
    try {
      const isDropship = formData.originType === 'dropship';
      const isProprio = formData.originType === 'proprio';

      const resp = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10) || 0,
          source: isProprio ? 'proprio_vendplus' : (isDropship ? 'dropship_supplier' : formData.source),
          sourceName: isProprio ? 'VEND+ Próprio' : (isDropship ? (formData.supplierName || 'Fornecedor Homologado') : 'Marketplace Parceiro'),
          type: isDropship ? 'dropshipping' : 'affiliate',
          dropshipDetails: isDropship ? {
            supplierId: 'SUP_MANUAL',
            supplierName: formData.supplierName || 'Fornecedor Homologado',
            costPrice: parseFloat(formData.costPrice) || parseFloat(formData.price) * 0.7,
            marginPercent: 30,
            shippingDays: 5,
            returnPolicy: 'Garantia legal de 90 dias (CDC)'
          } : undefined
        })
      });

      const data = await resp.json();
      if (resp.ok) {
        setMessage({ type: 'success', text: 'Produto cadastrado com sucesso no catálogo VEND+.' });
        setShowAddModal(false);
        setFormData({
          originalId: '',
          sku: '',
          title: '',
          description: '',
          price: '',
          category: 'Eletrônicos',
          brand: '',
          imageUrl: '',
          originalUrl: '',
          originType: 'dropship',
          source: 'dropship_supplier',
          stock: '10',
          supplierName: '',
          costPrice: ''
        });
        onRefresh();
      } else {
        throw new Error(data.error || 'Falha ao salvar produto.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Catálogo de Produtos VEND+</h3>
          <p className="text-xs text-slate-400">
            Total de {products.length} itens reais. Classificados entre Próprios, Dropshipping Homologado e Afiliados Oficiais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto Homologado</span>
          </button>
        </div>
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

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome, SKU ou ID original..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Origin Type Filter requested */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400">Modalidade:</span>
            <select
              value={filterOriginType}
              onChange={(e) => setFilterOriginType(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="all" className="bg-[#111624]">Todas as Modalidades</option>
              <option value="proprio" className="bg-[#111624]">Produtos Próprios</option>
              <option value="dropship" className="bg-[#111624]">Fornecedores Homologados (Dropship)</option>
              <option value="afiliado" className="bg-[#111624]">Afiliados Oficiais (Externo)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-400">Canal:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="all" className="bg-[#111624]">Todos os Canais</option>
              <option value="mercadolivre" className="bg-[#111624]">Mercado Livre Brasil</option>
              <option value="shopee" className="bg-[#111624]">Shopee Brasil</option>
              <option value="amazon" className="bg-[#111624]">Amazon Brasil</option>
              <option value="tiktok" className="bg-[#111624]">TikTok Shop</option>
              <option value="dropship_supplier" className="bg-[#111624]">Dropshipping Homologado</option>
              <option value="proprio_vendplus" className="bg-[#111624]">VEND+ Próprio</option>
              <option value="custom_feed" className="bg-[#111624]">Feed Autorizado</option>
            </select>
          </div>

          {filterSource !== 'all' && (
            <button
              onClick={() => handleClearSource(filterSource)}
              className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-lg text-xs transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Canal</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111624] border border-slate-800 text-slate-400 text-xs">
          Nenhum produto encontrado para os filtros atuais. Conecte e sincronize produtos reais na Central de Integrações.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111624]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Origem / Canal</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4">Preço Oficial</th>
                <th className="py-3 px-4">Última Sincronização</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-10 h-10 object-contain rounded-lg bg-slate-900 p-1 border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0 max-w-xs">
                      <div className="font-semibold text-white truncate" title={prod.title}>{prod.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {prod.sku ? `SKU: ${prod.sku}` : `ID: ${prod.originalId}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200">{prod.sourceName}</span>
                    <span className="text-[10px] text-slate-400 block">{prod.sellerName || 'Vendedor Oficial'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      prod.originType === 'proprio'
                        ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                        : prod.originType === 'dropship'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                        : 'bg-purple-950/60 text-purple-300 border border-purple-800'
                    }`}>
                      {prod.originType === 'proprio' ? 'Próprio VEND+' : prod.originType === 'dropship' ? 'Dropshipping' : 'Afiliado Oficial'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                    R$ {prod.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(prod.lastUpdated).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={prod.affiliateUrl || prod.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Abrir URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Product Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-[#111624] border border-slate-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1">
              Cadastrar Produto Homologado VEND+
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cadastro restrito a itens legítimos de fornecedores autorizados para dropshipping ou vendedores cadastrados.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ID / Código Externo *</label>
                  <input
                    type="text"
                    required
                    value={formData.originalId}
                    onChange={(e) => setFormData({ ...formData, originalId: e.target.value })}
                    placeholder="Ex: SKU-8842 ou MLB-992"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SKU do Produto</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: PROD-TEC-001"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modalidade de Comercialização *</label>
                <select
                  value={formData.originType}
                  onChange={(e) => setFormData({ ...formData, originType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="dropship">Fornecedor Homologado (Dropshipping com Envio Direto)</option>
                  <option value="proprio">Produto Próprio (Estoque VEND+ / Lojista)</option>
                  <option value="afiliado">Afiliado Oficial (Redirecionamento Externo)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome real e especificações do item"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="199.90"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Fornecedor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="120.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estoque Físico Real</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="15"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Informática, Ferramentas..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fornecedor / Fabricante</label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    placeholder="Distribuidora Tech Brasil Ltda"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">URL da Imagem Original Autorizada *</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://... (URL pública da foto oficial do produto)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Especificações técnicas autênticas..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
                >
                  {loading ? 'Salvando...' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
