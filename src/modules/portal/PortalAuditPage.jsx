import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Activity, Search, Database, Clock, User, Filter } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { PageHeader, Spinner } from '../../components/ui/Primitives';
import { cn } from '../../utils/format';

export default function PortalAuditPage() {
  const { user } = useSupabaseAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = logs.filter((l) => {
    const q = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      l.action?.toLowerCase().includes(q) ||
      l.user_email?.toLowerCase().includes(q) ||
      l.entity?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-slide-up" data-testid="portal-audit-page">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Portal Cloud Supabase"
        title="Historial de Auditoría y Eventos"
        description="Registro inmutable de acciones realizadas en la base de datos (inicios de sesión, creación de usuarios, ediciones y eliminaciones)."
        testId="portal-audit-header"
        actions={
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            data-testid="refresh-audit-logs-btn"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            <span>Actualizar Logs</span>
          </button>
        }
      />

      <div className="flex items-center gap-3 rounded-2xl border border-moss-200 bg-white p-3 shadow-soft">
        <Search className="h-4 w-4 text-moss-400 ml-2" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por acción, usuario o entidad..."
          className="input border-0 focus:ring-0 w-full text-sm"
        />
      </div>

      <div className="table-container shadow-soft">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center gap-3 text-moss-600">
            <Spinner className="h-6 w-6" />
            <span className="text-xs">Cargando registros de auditoría desde PostgreSQL...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center text-moss-600">
            <Activity className="h-8 w-8 text-moss-300 mb-2" />
            <p className="font-semibold text-moss-900">Sin registros de auditoría</p>
            <p className="text-xs text-moss-500 mt-0.5">Las acciones administrativas se registrarán aquí automáticamente.</p>
          </div>
        ) : (
          <table className="table min-w-[950px]">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Fecha y Hora</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Acción</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Entidad</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Usuario</th>
                <th scope="col" className="px-5 py-4 text-right font-bold text-moss-800">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="transition hover:bg-moss-50/50">
                  <td className="px-5 py-4 align-middle text-moss-600 font-mono text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <span className="badge badge-green font-bold uppercase text-[10px] py-0.5 px-2">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle text-moss-800 font-semibold text-xs">
                    {log.entity}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700 text-[10px] font-bold text-white shadow-xs">
                        {(log.user_email || 'S')[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-mono text-moss-700 truncate max-w-[150px]" title={log.user_email}>
                        {log.user_email || 'Sistema'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-right font-mono text-[11px] text-moss-500 truncate max-w-xs" title={JSON.stringify(log.details || {})}>
                    {JSON.stringify(log.details || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
