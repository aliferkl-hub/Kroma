import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DropshipSupplier, DropshipOrder } from '../../types';

interface DropshipTabProps {
  adminToken: string;
}

export const DropshipTab: React.FC<DropshipTabProps> = ({ adminToken }) => {
  const [suppliers, setSuppliers] = useState<DropshipSupplier[]>([]);
  const [orders, setOrders] = useState<DropshipOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    cnpj: '',
    contactEmail: '',
    contactPhone: '',
    category: 'Geral',
    slaDeliveryDays: '5',
    defaultMarginPercent: '25',
    shippingOrigin: 'São Paulo - SP',
    contractRef: '',
    returnPolicy: 'Garantia legal de 90 dias (CDC) e logística reversa conforme contrato.',
    notes: ''
  });

  // Order status update state
  const [selectedOrder, setSelectedOrder] = useState<DropshipOrder | null>(null);
  const [newStatus, setNewStatus] = useState<DropshipOrder['status']>('aguardando_pagamento');
  const [trackingInput, setTrackingInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppResp, ordResp, setResp] = await Promise.all([
        fetch('/api/dropshipping/suppliers', {
          headers: { 'Authorization': `Bearer ${adminToken}`, 'x-admin-token': adminToken }
        }),
        fetch('/api/dropshipping/orders', {
          headers: { 'Authorization': `Bearer ${adminToken}`, 'x-admin-token': adminToken }
        }),
        fetch('/api/settings')
      ]);

      const [suppData, ordData, setData] = await Promise.all([
        suppResp.json(),
        ordResp.json(),
        setResp.json()
      ]);

      setSuppliers(Array.isArray(suppData) ? suppData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
      setCheckoutEnabled(Boolean(setData.dropshipCheckoutEnabled));
    } catch (err: any) {
      console.error('Error fetching dropship data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminToken]);

  const handleToggleCheckout = async () => {
    // Check if there is at least one homologated supplier
    const hasHomologated = suppliers.some(s => s.status === 'homologado');
    if (!checkoutEnabled && !hasHomologated) {
      alert('Não é possível ativar o checkout próprio sem pelo menos um fornecedor devidamente HOMOLOGADO e com contrato aprovado pelo Master Owner.');
      return;
    }

    const nextState = !checkoutEnabled;
    try {
      const resp = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ dropshipCheckoutEnabled: nextState })
      });
      if (resp.ok) {
        setCheckoutEnabled(nextState);
        setMessage({
          type: 'success',
          text: nextState
            ? 'Checkout próprio ativado com sucesso para produtos de fornecedores homologados.'
            : 'Checkout próprio pausado com segurança.'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/dropshipping/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify(supplierForm)
      });
      const data = await resp.json();
      if (resp.ok) {
        setMessage({
          type: 'success',
          text: 'Fornecedor cadastrado como "Pendente de Aprovação". O Master Owner deve homologar antes da ativação de produtos.'
        });
        setShowSupplierModal(false);
        setSupplierForm({
          name: '',
          cnpj: '',
          contactEmail: '',
          contactPhone: '',
          category: 'Geral',
          slaDeliveryDays: '5',
          defaultMarginPercent: '25',
          shippingOrigin: 'São Paulo - SP',
          contractRef: '',
          returnPolicy: 'Garantia legal de 90 dias (CDC) e logística reversa conforme contrato.',
          notes: ''
        });
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  // Master Owner Approval Action
  const handleUpdateSupplierStatus = async (id: string, status: DropshipSupplier['status']) => {
    try {
      const resp = await fetch(`/api/dropshipping/suppliers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          status,
          approvedBy: 'Master Owner'
        })
      });
      if (resp.ok) {
        setMessage({
          type: 'success',
          text: `Situação do fornecedor atualizada para "${status.replace('_', ' ').toUpperCase()}".`
        });
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('Excluir este fornecedor?')) return;
    try {
      const resp = await fetch(`/api/dropshipping/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      if (resp.ok) {
        setMessage({ type: 'success', text: 'Fornecedor removido com sucesso.' });
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const resp = await fetch(`/api/dropshipping/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          status: newStatus,
          trackingCode: trackingInput.trim() || undefined
        })
      });
      if (resp.ok) {
        setMessage({ type: 'success', text: `Status do pedido #${selectedOrder.id} atualizado.` });
        setSelectedOrder(null);
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Checkout Governance Banner */}
      <div className="p-5 rounded-2xl bg-[#111624] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white">Módulo de Checkout Próprio (Dropshipping Homologado)</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              checkoutEnabled
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/60 text-amber-300 border-amber-800'
            }`}>
              {checkoutEnabled ? 'Ativo na Loja' : 'Pausado / Exige Homologação'}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Apenas fornecedores analisados e homologados pelo Master Owner com CNPJ e comprovação contratual podem operar com checkout próprio.
          </p>
        </div>

        <button
          onClick={handleToggleCheckout}
          className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shrink-0 ${
            checkoutEnabled
              ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
          }`}
        >
          {checkoutEnabled ? (
            <>
              <ToggleRight className="w-4 h-4" />
              <span>Desativar Checkout</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              <span>Ativar Checkout Próprio</span>
            </>
          )}
        </button>
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

      {/* Suppliers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Fornecedores & Homologação</h3>
            <p className="text-xs text-slate-400">Análise, homologação de CNPJ e termos de despacho pelo Master Owner.</p>
          </div>
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Fornecedor</span>
          </button>
        </div>

        {suppliers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#111624] border border-slate-800 text-slate-400 text-xs">
            Nenhum fornecedor cadastrado. Cadastre distribuidores para análise do Master Owner.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supp) => {
              const isHomologado = supp.status === 'homologado';
              const isPendente = supp.status === 'pendente_aprovacao';

              return (
                <div key={supp.id} className="p-4 rounded-xl bg-[#111624] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-white truncate">{supp.name}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isHomologado
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : isPendente
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-rose-950/60 border-rose-800 text-rose-300'
                      }`}>
                        {supp.status === 'homologado' ? 'Homologado' : supp.status === 'pendente_aprovacao' ? 'Pendente' : 'Suspenso'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 mb-3">
                      <div>CNPJ: <span className="text-slate-200 font-mono">{supp.cnpj}</span></div>
                      <div>E-mail: <span className="text-slate-300">{supp.contactEmail}</span></div>
                      <div>Origem: <span className="text-slate-300">{supp.shippingOrigin}</span></div>
                      <div>Prazo de Envio: <span className="text-purple-300 font-bold">{supp.slaDeliveryDays} dias úteis</span></div>
                      <div>Margem Comercial: <span className="text-purple-300 font-bold">{supp.defaultMarginPercent}%</span></div>
                      {supp.contractRef && (
                        <div>Contrato: <span className="text-slate-300 font-mono text-[11px]">{supp.contractRef}</span></div>
                      )}
                      {supp.approvedBy && (
                        <div className="text-emerald-400 text-[10px]">Aprovado por: {supp.approvedBy}</div>
                      )}
                    </div>
                  </div>

                  {/* Master Owner Action Strip */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {!isHomologado ? (
                        <button
                          onClick={() => handleUpdateSupplierStatus(supp.id, 'homologado')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Homologar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateSupplierStatus(supp.id, 'suspenso')}
                          className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg text-[11px] font-medium transition-colors"
                        >
                          Suspender
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteSupplier(supp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Orders Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-white">Pedidos & Rastreamento com Código de Confirmação</h3>
          <p className="text-xs text-slate-400">Controle de envios, código de confirmação de entrega e status de despacho.</p>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#111624] border border-slate-800 text-slate-400 text-xs">
            Nenhum pedido de dropshipping gerado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111624]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Código Confirmação</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rastreamento</th>
                  <th className="py-3 px-4 text-right">Gerenciar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">#{ord.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400">{ord.shippingAddress.city} - {ord.shippingAddress.state}</div>
                    </td>
                    <td className="py-3 px-4">
                      {ord.items.map((it, i) => (
                        <div key={i} className="truncate max-w-xs">{it.quantity}x {it.title}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-400 tabular-nums">
                      R$ {ord.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {ord.confirmationCode || 'VP-994821'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-200">{ord.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {ord.trackingCode || <span className="text-slate-500">Pendente</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setNewStatus(ord.status);
                          setTrackingInput(ord.trackingCode || '');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-xs"
                      >
                        Atualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#111624] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Cadastrar Fornecedor para Homologação</h3>
            <p className="text-xs text-slate-400 mb-4">Insira os dados do parceiro comercial. O cadastro entrará em análise do Master Owner.</p>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Razão Social / Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Distribuidora Tech Brasil Ltda"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">CNPJ *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.cnpj}
                  onChange={(e) => setSupplierForm({ ...supplierForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">E-mail Comercial *</label>
                  <input
                    type="email"
                    required
                    value={supplierForm.contactEmail}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })}
                    placeholder="comercial@fornecedor.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Telefone</label>
                  <input
                    type="text"
                    value={supplierForm.contactPhone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPhone: e.target.value })}
                    placeholder="(11) 3333-4444"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Contrato / Comprovação de Autorização</label>
                <input
                  type="text"
                  value={supplierForm.contractRef}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contractRef: e.target.value })}
                  placeholder="Ex: Contrato de Fornecimento nº 2026/VP-88"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">SLA Despacho (dias úteis)</label>
                  <input
                    type="number"
                    value={supplierForm.slaDeliveryDays}
                    onChange={(e) => setSupplierForm({ ...supplierForm, slaDeliveryDays: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Margem Comercial (%)</label>
                  <input
                    type="number"
                    value={supplierForm.defaultMarginPercent}
                    onChange={(e) => setSupplierForm({ ...supplierForm, defaultMarginPercent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
                >
                  Enviar para Análise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#111624] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Gerenciar Pedido #{selectedOrder.id}</h3>
            <p className="text-xs text-slate-400 mb-4">Código de confirmação: <span className="font-mono text-purple-400 font-bold">{selectedOrder.confirmationCode || 'VP-994821'}</span></p>

            <form onSubmit={handleUpdateOrderStatus} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Status do Pedido</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pago_em_processamento">Pago / Em Processamento com Fornecedor</option>
                  <option value="enviado">Enviado / Em Trânsito</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="devolvido">Devolvido</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Código de Rastreamento (Correios/Transportadora)</label>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="BR123456789SP"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
                >
                  Salvar Atualização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
