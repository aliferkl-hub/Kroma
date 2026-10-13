import React, { useState, useEffect } from 'react';
import { MousePointerClick, ExternalLink, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { ClickLog } from '../../types';

interface ClicksTabProps {
  adminPin: string;
}

export const ClicksTab: React.FC<ClicksTabProps> = ({ adminPin }) => {
  const [clicks, setClicks] = useState<ClickLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClicks = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/clicks?limit=100', {
        headers: { 'x-admin-pin': adminPin }
      });
      const data = await resp.json();
      if (Array.isArray(data)) {
        setClicks(data);
      }
    } catch (err: unknown) {
      console.error('Error fetching clicks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClicks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-white block mb-0.5">
            Rastreamento de Cliques Auditado (Conformidade Rigorosa)
          </span>
          De acordo com as regras operacionais deste marketplace, cliques são contabilizados estritamente como interações de tráfego qualificado. Não estimamos comissões fictícias nem registramos cliques como vendas confirmadas até o envio de relatórios oficiais ou webhooks pelas plataformas parceiras.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Log de Cliques Registrados</h3>
          <p className="text-xs text-slate-400">Total de {clicks.length} redirecionamentos oficiais gravados.</p>
        </div>
        <button
          onClick={fetchClicks}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Log</span>
        </button>
      </div>

      {clicks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111624] border border-slate-800 text-slate-400 text-xs">
          Nenhum clique de afiliado registrado ainda. Conforme os visitantes clicarem nos links dos produtos sincronizados, o histórico aparecerá aqui em tempo real.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111624]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Canal / Marketplace</th>
                <th className="py-3 px-4">Navegador / Dispositivo</th>
                <th className="py-3 px-4 text-right">Destino Autorizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {clicks.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(c.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-white truncate max-w-xs" title={c.productTitle}>
                    {c.productTitle}
                  </td>
                  <td className="py-3 px-4 font-sans capitalize text-purple-300">
                    {c.source}
                  </td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-[180px]" title={c.userAgent}>
                    {c.userAgent}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <a
                      href={c.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      <span>Ver URL</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
