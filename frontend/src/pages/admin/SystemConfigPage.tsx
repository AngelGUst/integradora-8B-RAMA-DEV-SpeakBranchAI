import { useRef, useState, useEffect } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Save, RefreshCw, ToggleLeft, ToggleRight, Activity, Users, ScrollText, TrendingUp } from 'lucide-react';
import { systemConfigService, type SystemConfig, type LogSource } from '@/services/systemConfigService';
import AppSidebar from '@/shared/components/layout/AppSidebar';

// ── Animation (matches QuestionsPage) ─────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.07 },
  }),
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return { ref, inView };
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonSection() {
  return (
    <div className="border border-white/[0.05] rounded-2xl p-6 animate-pulse space-y-4 bg-white/[0.01]">
      <div className="w-32 h-3 rounded bg-white/[0.03]" />
      <div className="w-64 h-2.5 rounded bg-white/[0.03]" />
      <div className="flex gap-4 mt-2">
        <div className="flex-1 h-10 rounded-xl bg-white/[0.03]" />
        <div className="flex-1 h-10 rounded-xl bg-white/[0.03]" />
      </div>
      <div className="w-28 h-9 rounded-xl bg-white/[0.03]" />
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">
        {label}
      </span>
      <input
        type="number"
        step="0.5"
        min="1"
        max="99"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/80 text-sm px-3 py-2.5 focus:outline-none focus:border-violet-500/50 transition-colors"
        style={{ colorScheme: 'dark' }}
      />
      {hint && <span className="text-[11px] text-white/20">{hint}</span>}
    </label>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function SystemConfigPage() {
  const { ref, inView } = useReveal();

  const [config, setConfig]   = useState<SystemConfig | null>(null);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [thresholdUp,   setThresholdUp]   = useState('');
  const [thresholdDown, setThresholdDown] = useState('');

  const [xpA1, setXpA1] = useState('');
  const [xpA2, setXpA2] = useState('');
  const [xpB1, setXpB1] = useState('');
  const [xpB2, setXpB2] = useState('');
  const [savingXp, setSavingXp]     = useState(false);
  const [xpError, setXpError]       = useState<string | null>(null);
  const [xpSuccess, setXpSuccess]   = useState(false);

  // Logs
  const [logSource, setLogSource]       = useState<LogSource>('all');
  const [logs, setLogs]                 = useState<string[]>([]);
  const [logsTotal, setLogsTotal]       = useState(0);
  const [logsLoading, setLogsLoading]   = useState(false);
  const [logsLoaded, setLogsLoaded]     = useState(false);

  useEffect(() => {
    systemConfigService.get().then((cfg) => {
      setConfig(cfg);
      setThresholdUp(String(cfg.adaptive_threshold_up));
      setThresholdDown(String(cfg.adaptive_threshold_down));
      setXpA1(String(cfg.xp_level_a1));
      setXpA2(String(cfg.xp_level_a2));
      setXpB1(String(cfg.xp_level_b1));
      setXpB2(String(cfg.xp_level_b2));
    });
  }, []);

  const handleSaveThresholds = async () => {
    const up   = parseFloat(thresholdUp);
    const down = parseFloat(thresholdDown);
    if (isNaN(up) || isNaN(down)) return setError('Los umbrales deben ser números.');
    if (down >= up) return setError('El umbral inferior debe ser menor que el superior.');
    setSaving(true);
    setError(null);
    try {
      const updated = await systemConfigService.update({
        adaptive_threshold_up: up,
        adaptive_threshold_down: down,
      });
      setConfig(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveXpLevels = async () => {
    const vals = [xpA1, xpA2, xpB1, xpB2].map(Number);
    if (vals.some(isNaN) || vals.some(v => v <= 0))
      return setXpError('Todos los valores deben ser enteros positivos.');
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i] >= vals[i + 1])
        return setXpError('Los XP deben ser estrictamente ascendentes: A1 < A2 < B1 < B2.');
    }
    setSavingXp(true);
    setXpError(null);
    try {
      const updated = await systemConfigService.update({
        xp_level_a1: vals[0], xp_level_a2: vals[1],
        xp_level_b1: vals[2], xp_level_b2: vals[3],
      });
      setConfig(updated);

      setXpSuccess(true);
      setTimeout(() => setXpSuccess(false), 2500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setXpError(err?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSavingXp(false);
    }
  };

  const handleToggleRegistration = async () => {
    if (!config) return;
    setToggling(true);
    setError(null);
    try {
      const updated = await systemConfigService.update({
        registration_enabled: !config.registration_enabled,
      });
      setConfig(updated);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setToggling(false);
    }
  };

  const handleLoadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await systemConfigService.getLogs(logSource, 100);
      setLogs(res.lines);
      setLogsTotal(res.total);
      setLogsLoaded(true);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#06060A] text-[#f5f3ff]">
      <AppSidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-5">

          {/* ── Section header ── */}
          <motion.div
            ref={ref}
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[11px] text-white/20 tracking-widest">007</span>
              <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                System
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff]">
              System configuration.
            </h1>
          </motion.div>

          {/* ── Content ── */}
          {!config ? (
            <div className="space-y-4">
              <SkeletonSection />
              <SkeletonSection />
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Adaptive engine ── */}
              <motion.div
                variants={reveal}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                custom={1}
                className="border border-white/[0.05] rounded-2xl p-6 bg-white/[0.01]"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <Activity className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white/80">Motor Adaptativo</h2>
                </div>
                <p className="text-[12px] text-white/30 mb-5 leading-relaxed">
                  El promedio de habilidad usa EMA (α=0.2). Por encima del umbral superior → HARD.
                  Por debajo del inferior → EASY.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <FieldInput
                    label="Umbral superior → HARD"
                    value={thresholdUp}
                    onChange={setThresholdUp}
                    hint="Default: 16.0"
                  />
                  <FieldInput
                    label="Umbral inferior → EASY"
                    value={thresholdDown}
                    onChange={setThresholdDown}
                    hint="Default: 10.0"
                  />
                </div>

                {error && (
                  <p className="text-[12px] text-red-400 mb-3">{error}</p>
                )}
                {success && (
                  <p className="text-[12px] text-emerald-400 mb-3">Guardado correctamente.</p>
                )}

                <button
                  onClick={handleSaveThresholds}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-[13px] font-semibold text-white transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Guardando…' : 'Guardar umbrales'}
                </button>
              </motion.div>

              {/* ── XP por nivel ── */}
              <motion.div
                variants={reveal}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                custom={2}
                className="border border-white/[0.05] rounded-2xl p-6 bg-white/[0.01]"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white/80">XP por Nivel CEFR</h2>
                </div>
                <p className="text-[12px] text-white/30 mb-5 leading-relaxed">
                  XP total necesario para completar cada nivel y desbloquear el siguiente.
                  Deben ser valores positivos estrictamente ascendentes.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'A1 → A2', value: xpA1, onChange: setXpA1, hint: 'Default: 200' },
                    { label: 'A2 → B1', value: xpA2, onChange: setXpA2, hint: 'Default: 500' },
                    { label: 'B1 → B2', value: xpB1, onChange: setXpB1, hint: 'Default: 1000' },
                    { label: 'Techo B2', value: xpB2, onChange: setXpB2, hint: 'Default: 2000' },
                  ].map(f => (
                    <FieldInput
                      key={f.label}
                      label={f.label}
                      value={f.value}
                      onChange={f.onChange}
                      hint={f.hint}
                    />
                  ))}
                </div>

                {xpError && <p className="text-[12px] text-red-400 mb-3">{xpError}</p>}
                {xpSuccess && <p className="text-[12px] text-emerald-400 mb-3">Guardado correctamente.</p>}

                <button
                  onClick={handleSaveXpLevels}
                  disabled={savingXp}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-[13px] font-semibold text-white transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingXp ? 'Guardando…' : 'Guardar XP de niveles'}
                </button>
              </motion.div>

              {/* ── Registration toggle ── */}
              <motion.div
                variants={reveal}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                custom={3}
                className="border border-white/[0.05] rounded-2xl p-6 bg-white/[0.01]"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <Users className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white/80">Registro de Usuarios</h2>
                </div>
                <p className="text-[12px] text-white/30 mb-5 leading-relaxed">
                  Controla si nuevos usuarios pueden crear cuentas en la plataforma.
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">
                      {config.registration_enabled ? 'Registro activo' : 'Registro desactivado'}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      {config.registration_enabled
                        ? 'Nuevos usuarios pueden registrarse.'
                        : 'El registro está bloqueado temporalmente.'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleRegistration}
                    disabled={toggling}
                    className="disabled:opacity-50 transition-opacity"
                    aria-label="Toggle registration"
                  >
                    {config.registration_enabled ? (
                      <ToggleRight className="h-9 w-9 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-white/20" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* ── Error logs ── */}
              <motion.div
                variants={reveal}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                custom={4}
                className="border border-white/[0.05] rounded-2xl p-6 bg-white/[0.01]"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <ScrollText className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white/80">Error Logs</h2>
                </div>
                <p className="text-[12px] text-white/30 mb-5 leading-relaxed">
                  Últimas entradas del log de errores, filtradas por servicio.
                </p>

                <div className="flex items-center gap-3 mb-4">
                  {(['all', 'whisper', 'gpt'] as LogSource[]).map((src) => (
                    <button
                      key={src}
                      onClick={() => setLogSource(src)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                        logSource === src
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/60'
                      }`}
                    >
                      {src === 'all' ? 'All' : src.charAt(0).toUpperCase() + src.slice(1)}
                    </button>
                  ))}
                  <button
                    onClick={handleLoadLogs}
                    disabled={logsLoading}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 rounded-lg text-[12px] text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} />
                    {logsLoading ? 'Cargando…' : 'Cargar'}
                  </button>
                </div>

                {logsLoaded && (
                  <div className="rounded-xl bg-black/30 border border-white/[0.05] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
                      <span className="font-mono text-[10px] text-white/20 tracking-widest">
                        {logsTotal} entries · showing last {logs.length}
                      </span>
                    </div>
                    <div className="overflow-y-auto max-h-72 p-4 space-y-1">
                      {logs.length === 0 ? (
                        <p className="text-[12px] text-white/20 text-center py-6">
                          No hay entradas para este filtro.
                        </p>
                      ) : (
                        logs.map((line, i) => (
                          <p
                            key={i}
                            className="font-mono text-[11px] text-white/40 leading-relaxed break-all"
                          >
                            {line}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
