import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Play,
  Save,
  BookOpen,
  Server,
  Zap,
  Info,
  PowerOff,
  Eye,
  Lock,
  ArrowRight
} from 'lucide-react';
import { IntegrationConfig, IntegrationStatus } from '../../types';

interface IntegrationsTabProps {
  integrations: Record<string, IntegrationConfig>;
  onRefresh: () => void;
  adminToken: string;
  onViewImportedProducts: (source: string) => void;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  integrations,
  onRefresh,
  adminToken,
  onViewImportedProducts
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Sync Form State
  const [syncQuery, setSyncQuery] = useState('smartphone');
  const [syncCategory, setSyncCategory] = useState('all');
  const [syncItemId, setSyncItemId] = useState('');
  const [syncLimit, setSyncLimit] = useState(12);

  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Logs modal
  const [selectedLogsItem, setSelectedLogsItem] = useState<IntegrationConfig | null>(null);

  // Credentials edit modal
  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
  const [credentialsForm, setCredentialsForm] = useState<Record<string, string>>({});
  const [affiliateTagForm, setAffiliateTagForm] = useState('');
  const [authorizedNotesForm, setAuthorizedNotesForm] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

  // Custom feed modal
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedJson, setFeedJson] = useState('');
  const [feedLoading, setFeedLoading] = useState(false);

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'conectado':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Conectado
          </span>
        );
      case 'aguardando_autorizacao':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/60 border border-amber-800 text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Aguardando autorização
          </span>
        );
      case 'erro_autenticacao':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-950/60 border border-rose-800 text-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Erro de autenticação
          </span>
        );
      case 'permissao_insuficiente':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/60 border border-amber-700 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Permissão insuficiente
          </span>
        );
      case 'nao_configurado':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Não configurado
          </span>
        );
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/integrations/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Teste Real Concluído: ${data.message}`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Diagnóstico do Conector: ${data.message}`
        });
      }
      onRefresh();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Erro ao testar integração: ${err.message}`
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja desconectar esta integração e revogar as credenciais?')) return;
    setDisconnectingId(id);
    try {
      const response = await fetch(`/api/integrations/${id}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'info', text: data.message });
        onRefresh();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleOAuthLogin = async (id: string) => {
    try {
      const response = await fetch(`/api/integrations/${id}/oauth-url`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Configure o App ID antes de iniciar a autorização OAuth.');
      }
    } catch (err: any) {
      alert(`Falha ao obter URL OAuth: ${err.message}`);
    }
  };

  const handleSyncProducts = async (id: string) => {
    setSyncingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/integrations/${id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          query: syncQuery,
          category: syncCategory,
          itemId: syncItemId.trim() || undefined,
          limit: syncLimit
        })
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Sincronização Concluída: ${data.message}`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Falha na Sincronização: ${data.message}`
        });
      }
      onRefresh();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Erro durante sincronização: ${err.message}`
      });
    } finally {
      setSyncingId(null);
    }
  };

  const openEditModal = (config: IntegrationConfig) => {
    setEditingConfig(config);
    setCredentialsForm({ ...config.credentials });
    setAffiliateTagForm(config.affiliateTag || '');
    setAuthorizedNotesForm(config.authorizedNotes || '');
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    setSavingCredentials(true);
    try {
      const response = await fetch(`/api/integrations/${editingConfig.id}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          credentials: credentialsForm,
          affiliateTag: affiliateTagForm,
          authorizedNotes: authorizedNotesForm
        })
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Credenciais de ${editingConfig.name} criptografadas e salvas no backend.`
        });
        setEditingConfig(null);
        onRefresh();
      } else {
        throw new Error(data.error || 'Falha ao salvar credenciais.');
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Erro ao salvar credenciais: ${err.message}`
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleImportFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/integrations/custom_feed/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          url: feedUrl.trim() || undefined,
          itemsJson: feedJson.trim() || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowFeedModal(false);
        setFeedUrl('');
        setFeedJson('');
        onRefresh();
      } else {
        throw new Error(data.message || 'Falha ao importar feed.');
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Erro ao importar feed: ${err.message}`
      });
    } finally {
      setFeedLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 flex items-start gap-3">
        <Server className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-white block mb-0.5">
            Central de Integrações Oficiais VEND+ — Master Owner Console
          </span>
          Todas as chaves privadas e tokens de acesso são protegidos por criptografia de ponta a ponta (AES-256-GCM) no servidor. O status "Conectado" é concedido exclusivamente após teste real com resposta de rede dos servidores parceiros.
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          message.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : message.type === 'error'
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-blue-950/40 border-blue-800 text-blue-300'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white ml-2">Fechar</button>
        </div>
      )}

      {/* Synchronizer Control Console */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Sincronizador Oficial em Tempo Real (Mercado Livre Brasil)
            </h3>
            <p className="text-xs text-slate-400">
              Sincronize produtos reais por palavra-chave, categoria ou identificador específico (MLB...).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOAuthLogin('mercadolivre')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Autorizar via OAuth 2.0</span>
            </button>
            <button
              onClick={() => handleTestConnection('mercadolivre')}
              disabled={testingId === 'mercadolivre'}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingId === 'mercadolivre' ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Busca por Palavra-chave</label>
            <input
              type="text"
              value={syncQuery}
              onChange={(e) => setSyncQuery(e.target.value)}
              placeholder="Ex: smartphone 128gb, notebook..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Ou por ID Específico (Item)</label>
            <input
              type="text"
              value={syncItemId}
              onChange={(e) => setSyncItemId(e.target.value)}
              placeholder="Ex: MLB3549281923"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Categoria Oficial MLB</label>
            <select
              value={syncCategory}
              onChange={(e) => setSyncCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">Todas as Categorias</option>
              <option value="MLB1051">Celulares e Smartphones</option>
              <option value="MLB1648">Informática</option>
              <option value="MLB1000">Eletrônicos, Áudio e Vídeo</option>
              <option value="MLB1574">Casa e Móveis</option>
              <option value="MLB1246">Beleza e Cosméticos</option>
              <option value="MLB263532">Ferramentas</option>
              <option value="MLB1276">Esportes</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Limite & Execução</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="30"
                value={syncLimit}
                onChange={(e) => setSyncLimit(parseInt(e.target.value) || 12)}
                className="w-16 px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
              <button
                onClick={() => handleSyncProducts('mercadolivre')}
                disabled={syncingId === 'mercadolivre'}
                className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className={`w-3.5 h-3.5 ${syncingId === 'mercadolivre' ? 'animate-spin' : ''}`} />
                <span>{syncingId === 'mercadolivre' ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.values(integrations).map((item) => {
          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[#111624] border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Tag de Afiliado: <code className="text-purple-300 font-mono">{item.affiliateTag || 'Não definida'}</code>
                    </span>
                  </div>

                  <div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {item.authorizedNotes}
                </p>

                {item.accountInfo && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-300 mb-3">
                    <span className="font-semibold block">Conta Vinculada: {item.accountInfo.nickname}</span>
                    <span className="text-slate-400 font-mono text-[10px]">ID: {item.accountInfo.userId}</span>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 mb-4 font-mono">
                  <div className="flex justify-between">
                    <span>Produtos sincronizados:</span>
                    <span className="text-white font-bold tabular-nums">{item.productsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Último teste:</span>
                    <span className="text-slate-300">
                      {item.lastTested ? new Date(item.lastTested).toLocaleString('pt-BR') : 'Nunca testado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última sincronização:</span>
                    <span className="text-slate-300">
                      {item.lastSync ? new Date(item.lastSync).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Functional Buttons requested: Testar conexão, Sincronizar agora, Ver produtos importados, Ver erros, Desconectar */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => openEditModal(item)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    title="Configurar chaves e credenciais"
                  >
                    <Sliders className="w-3 h-3 text-purple-400" />
                    <span>Credenciais</span>
                  </button>

                  <button
                    onClick={() => handleTestConnection(item.id)}
                    disabled={testingId === item.id}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingId === item.id ? 'animate-spin' : ''}`} />
                    <span>Testar conexão</span>
                  </button>

                  <button
                    onClick={() => onViewImportedProducts(item.id)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-purple-400" />
                    <span>Ver produtos</span>
                  </button>

                  <button
                    onClick={() => setSelectedLogsItem(item)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Ver erros ({item.errorLog.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.id === 'custom_feed' && (
                    <button
                      onClick={() => setShowFeedModal(true)}
                      className="px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 font-medium rounded-lg border border-purple-700/50 transition-colors"
                    >
                      Importar Feed
                    </button>
                  )}

                  {item.status === 'conectado' && (
                    <button
                      onClick={() => handleDisconnect(item.id)}
                      disabled={disconnectingId === item.id}
                      className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 font-medium rounded-lg border border-rose-850 transition-colors flex items-center gap-1"
                      title="Desconectar e limpar credenciais"
                    >
                      <PowerOff className="w-3 h-3" />
                      <span>Desconectar</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Error & Sync Log Viewer Modal */}
      {selectedLogsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#111624] border border-slate-800 rounded-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Registro de Erros & Auditoria: {selectedLogsItem.name}
                </h3>
                <span className="text-[11px] text-slate-400">Histórico de tentativas e diagnósticos oficiais</span>
              </div>
              <button
                onClick={() => setSelectedLogsItem(null)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {selectedLogsItem.errorLog.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum erro registrado para este conector.
                </div>
              ) : (
                selectedLogsItem.errorLog.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1 font-mono text-[10px]">
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      {log.code && <span className="text-rose-400 font-bold">Código: {log.code}</span>}
                    </div>
                    <p className="text-rose-200 leading-relaxed font-sans">{log.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLogsItem(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#111624] border border-slate-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1">
              Configurar Credenciais: {editingConfig.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Informe as chaves oficiais. Credenciais sensíveis são criptografadas com AES-256-GCM no backend e nunca expostas em texto puro.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tag de Afiliado Oficial</label>
                <input
                  type="text"
                  value={affiliateTagForm}
                  onChange={(e) => setAffiliateTagForm(e.target.value)}
                  placeholder="Ex: tag_afiliado_oficial"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              {Object.keys(editingConfig.credentials).map((fieldKey) => (
                <div key={fieldKey}>
                  <label className="block text-slate-300 font-semibold mb-1 capitalize">
                    {fieldKey.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    type="text"
                    value={credentialsForm[fieldKey] || ''}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, [fieldKey]: e.target.value })}
                    placeholder={`Valor de ${fieldKey}`}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              ))}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas de Homologação / Requisitos</label>
                <textarea
                  rows={2}
                  value={authorizedNotesForm}
                  onChange={(e) => setAuthorizedNotesForm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCredentials}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCredentials ? 'Criptografando...' : 'Salvar no Servidor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Feed Import Modal */}
      {showFeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-[#111624] border border-slate-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1">
              Importar Feed Oficial Autorizado (JSON/CSV)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Importação estrita de fornecedores homologados. Itens sem preço real, URL ou imagem original serão rejeitados automaticamente.
            </p>

            <form onSubmit={handleImportFeed} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">URL Pública do Feed (HTTP/HTTPS)</label>
                <input
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://fornecedor.com.br/api/feed.json"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="text-center text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                Ou cole o conteúdo JSON diretamente
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payload JSON de Produtos</label>
                <textarea
                  rows={6}
                  value={feedJson}
                  onChange={(e) => setFeedJson(e.target.value)}
                  placeholder='[{"originalId": "SKU-992", "title": "Produto Real", "price": 149.90, "category": "Informática", "imageUrl": "https://...", "originalUrl": "https://..."}]'
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={feedLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <span>{feedLoading ? 'Processando Feed...' : 'Validar & Importar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
