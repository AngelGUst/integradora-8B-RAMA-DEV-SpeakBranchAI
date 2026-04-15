import { useEffect, useState } from 'react';
import { systemConfigService, type SystemConfig, type LogSource } from '@/services/systemConfigService';
import AppSidebar from '@/shared/components/layout/AppSidebar';

export default function SystemConfigPage() {
  const [config, setConfig]     = useState<SystemConfig | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // Logs state
  const [logSource, setLogSource] = useState<LogSource>('all');
  const [logs, setLogs]           = useState<string[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  // Local form state (derivado de config)
  const [thresholdUp, setThresholdUp]     = useState('');
  const [thresholdDown, setThresholdDown] = useState('');

  useEffect(() => {
    systemConfigService.get().then(cfg => {
      setConfig(cfg);
      setThresholdUp(String(cfg.adaptive_threshold_up));
      setThresholdDown(String(cfg.adaptive_threshold_down));
    });
  }, []);

  const handleSaveThresholds = async () => {
    const up   = parseFloat(thresholdUp);
    const down = parseFloat(thresholdDown);
    if (isNaN(up) || isNaN(down)) return setError('Los umbrales deben ser números.');
    if (down >= up) return setError('El umbral inferior debe ser menor que el superior.');
    setSaving(true); setError(null);
    try {
      const updated = await systemConfigService.update({
        adaptive_threshold_up: up,
        adaptive_threshold_down: down,
      });
      setConfig(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRegistration = async () => {
    if (!config) return;
    setSaving(true); setError(null);
    try {
      const updated = await systemConfigService.update({
        registration_enabled: !config.registration_enabled,
      });
      setConfig(updated);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await systemConfigService.getLogs(logSource, 100);
      setLogs(res.lines);
      setLogsTotal(res.total);
    } finally {
      setLogsLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex min-h-screen bg-[#07090F]">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">Cargando configuración…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07090F]">
      <AppSidebar />
      <div className="flex-1 overflow-auto">
        <div className="text-white p-8 space-y-10 max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold">Configuración del Sistema</h1>

          {/* ── Motor adaptativo ── */}
          <section className="bg-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium">Motor Adaptativo</h2>
            <p className="text-sm text-slate-400">
              El promedio de habilidad se calcula como un EMA (α=0.2). Si el promedio supera
              el umbral superior, el siguiente ejercicio será HARD. Si cae por debajo del
              inferior, será EASY.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Umbral superior (→ HARD)</span>
                <input
                  type="number" step="0.5" min="1" max="99"
                  value={thresholdUp}
                  onChange={e => setThresholdUp(e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Umbral inferior (→ EASY)</span>
                <input
                  type="number" step="0.5" min="1" max="99"
                  value={thresholdDown}
                  onChange={e => setThresholdDown(e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-emerald-400 text-sm">Guardado correctamente.</p>}
            <button
              onClick={handleSaveThresholds}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar umbrales'}
            </button>
          </section>

          {/* ── Registro de usuarios ── */}
          <section className="bg-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium">Registro de Nuevos Usuarios</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                {config.registration_enabled
                  ? 'El registro está activo. Nuevos usuarios pueden crear cuentas.'
                  : 'El registro está desactivado. Nuevos usuarios no pueden registrarse.'}
              </span>
              <button
                onClick={handleToggleRegistration}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  config.registration_enabled ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.registration_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </section>  
        </div>
      </div>
    </div>
  );
}
