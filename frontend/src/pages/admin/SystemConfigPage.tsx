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
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}>) {
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

function getErrorMessage(error: unknown, fallback: string): string {
  const responseError = error as { response?: { data?: { error?: string } } };
  return responseError?.response?.data?.error ?? fallback;
}

function parseThresholdValues(thresholdUp: string, thresholdDown: string): { up: number; down: number } | { error: string } {
  const up = Number.parseFloat(thresholdUp);
  const down = Number.parseFloat(thresholdDown);

  if (Number.isNaN(up) || Number.isNaN(down)) {
    return { error: 'Los umbrales deben ser números.' };
  }

  if (down >= up) {
    return { error: 'El umbral inferior debe ser menor que el superior.' };
  }

  return { up, down };
}

function parseXpValues(values: string[]): { values: number[] } | { error: string } {
  const parsedValues = values.map(Number);

  if (parsedValues.some(Number.isNaN) || parsedValues.some((value) => value <= 0)) {
    return { error: 'Todos los valores deben ser enteros positivos.' };
  }

  for (let index = 0; index < parsedValues.length - 1; index += 1) {
    if (parsedValues[index] >= parsedValues[index + 1]) {
      return { error: 'Los XP deben ser estrictamente ascendentes: A1 < A2 < B1 < B2.' };
    }
  }

  return { values: parsedValues };
}

interface AdaptiveEngineSectionProps {
  inView: boolean;
  thresholdUp: string;
  thresholdDown: string;
  error: string | null;
  success: boolean;
  saving: boolean;
  onThresholdUpChange: (value: string) => void;
  onThresholdDownChange: (value: string) => void;
  onSave: () => void;
}

function AdaptiveEngineSection({
  inView,
  thresholdUp,
  thresholdDown,
  error,
  success,
  saving,
  onThresholdUpChange,
  onThresholdDownChange,
  onSave,
}: Readonly<AdaptiveEngineSectionProps>) {
  return (
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
          onChange={onThresholdUpChange}
          hint="Default: 16.0"
        />
        <FieldInput
          label="Umbral inferior → EASY"
          value={thresholdDown}
          onChange={onThresholdDownChange}
          hint="Default: 10.0"
        />
      </div>

      {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}
      {success && <p className="text-[12px] text-emerald-400 mb-3">Guardado correctamente.</p>}

      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-[13px] font-semibold text-white transition-colors"
      >
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Guardando…' : 'Guardar umbrales'}
      </button>
    </motion.div>
  );
}

interface XpLevelsSectionProps {
  inView: boolean;
  xpA1: string;
  xpA2: string;
  xpB1: string;
  xpB2: string;
  xpError: string | null;
  xpSuccess: boolean;
  savingXp: boolean;
  onXpA1Change: (value: string) => void;
  onXpA2Change: (value: string) => void;
  onXpB1Change: (value: string) => void;
  onXpB2Change: (value: string) => void;
  onSave: () => void;
}

function XpLevelsSection({
  inView,
  xpA1,
  xpA2,
  xpB1,
  xpB2,
  xpError,
  xpSuccess,
  savingXp,
  onXpA1Change,
  onXpA2Change,
  onXpB1Change,
  onXpB2Change,
  onSave,
}: Readonly<XpLevelsSectionProps>) {
  const xpFields = [
    { label: 'A1 → A2', value: xpA1, onChange: onXpA1Change, hint: 'Default: 200' },
    { label: 'A2 → B1', value: xpA2, onChange: onXpA2Change, hint: 'Default: 500' },
    { label: 'B1 → B2', value: xpB1, onChange: onXpB1Change, hint: 'Default: 1000' },
    { label: 'Techo B2', value: xpB2, onChange: onXpB2Change, hint: 'Default: 2000' },
  ];

  return (
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
        {xpFields.map((field) => (
          <FieldInput
            key={field.label}
            label={field.label}
            value={field.value}
            onChange={field.onChange}
            hint={field.hint}
          />
        ))}
      </div>

      {xpError && <p className="text-[12px] text-red-400 mb-3">{xpError}</p>}
      {xpSuccess && <p className="text-[12px] text-emerald-400 mb-3">Guardado correctamente.</p>}

      <button
        onClick={onSave}
        disabled={savingXp}
        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-[13px] font-semibold text-white transition-colors"
      >
        <Save className="h-3.5 w-3.5" />
        {savingXp ? 'Guardando…' : 'Guardar XP de niveles'}
      </button>
    </motion.div>
  );
}

interface RegistrationSectionProps {
  inView: boolean;
  registrationEnabled: boolean;
  toggling: boolean;
  onToggle: () => void;
}

function RegistrationSection({ inView, registrationEnabled, toggling, onToggle }: Readonly<RegistrationSectionProps>) {
  return (
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
            {registrationEnabled ? 'Registro activo' : 'Registro desactivado'}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            {registrationEnabled
              ? 'Nuevos usuarios pueden registrarse.'
              : 'El registro está bloqueado temporalmente.'}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling}
          className="disabled:opacity-50 transition-opacity"
          aria-label="Toggle registration"
        >
          {registrationEnabled ? (
            <ToggleRight className="h-9 w-9 text-emerald-400" />
          ) : (
            <ToggleLeft className="h-9 w-9 text-white/20" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

interface LogsSectionProps {
  inView: boolean;
  logSource: LogSource;
  logs: string[];
  logsTotal: number;
  logsLoading: boolean;
  logsLoaded: boolean;
  onLogSourceChange: (source: LogSource) => void;
  onLoadLogs: () => void;
}

function LogsSection({
  inView,
  logSource,
  logs,
  logsTotal,
  logsLoading,
  logsLoaded,
  onLogSourceChange,
  onLoadLogs,
}: Readonly<LogsSectionProps>) {
  const logEntries = logs.map((line) => (
    <p
      key={`${logsTotal}-${line}`}
      className="font-mono text-[11px] text-white/40 leading-relaxed break-all"
    >
      {line}
    </p>
  ));

  return (
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
        {(['all', 'whisper', 'gpt'] as LogSource[]).map((source) => (
          <button
            key={source}
            onClick={() => onLogSourceChange(source)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              logSource === source
                ? 'bg-violet-600 text-white'
                : 'bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/60'
            }`}
          >
            {source === 'all' ? 'All' : source.charAt(0).toUpperCase() + source.slice(1)}
          </button>
        ))}
        <button
          onClick={onLoadLogs}
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
              logEntries
            )}
          </div>
        </div>
      )}
    </motion.div>
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
    const parsedThresholds = parseThresholdValues(thresholdUp, thresholdDown);
    if ('error' in parsedThresholds) {
      setError(parsedThresholds.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await systemConfigService.update({
        adaptive_threshold_up: parsedThresholds.up,
        adaptive_threshold_down: parsedThresholds.down,
      });
      setConfig(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Error al guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveXpLevels = async () => {
    const parsedXpValues = parseXpValues([xpA1, xpA2, xpB1, xpB2]);
    if ('error' in parsedXpValues) {
      setXpError(parsedXpValues.error);
      return;
    }

    setSavingXp(true);
    setXpError(null);
    try {
      const updated = await systemConfigService.update({
        xp_level_a1: parsedXpValues.values[0], xp_level_a2: parsedXpValues.values[1],
        xp_level_b1: parsedXpValues.values[2], xp_level_b2: parsedXpValues.values[3],
      });
      setConfig(updated);

      setXpSuccess(true);
      setTimeout(() => setXpSuccess(false), 2500);
    } catch (e: unknown) {
      setXpError(getErrorMessage(e, 'Error al guardar.'));
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
      setError(getErrorMessage(e, 'Error al guardar.'));
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

          {config === null ? (
            <div className="space-y-4">
              <SkeletonSection />
              <SkeletonSection />
            </div>
          ) : (
            <div className="space-y-4">
              <AdaptiveEngineSection
                inView={inView}
                thresholdUp={thresholdUp}
                thresholdDown={thresholdDown}
                error={error}
                success={success}
                saving={saving}
                onThresholdUpChange={setThresholdUp}
                onThresholdDownChange={setThresholdDown}
                onSave={handleSaveThresholds}
              />

              <XpLevelsSection
                inView={inView}
                xpA1={xpA1}
                xpA2={xpA2}
                xpB1={xpB1}
                xpB2={xpB2}
                xpError={xpError}
                xpSuccess={xpSuccess}
                savingXp={savingXp}
                onXpA1Change={setXpA1}
                onXpA2Change={setXpA2}
                onXpB1Change={setXpB1}
                onXpB2Change={setXpB2}
                onSave={handleSaveXpLevels}
              />

              <RegistrationSection
                inView={inView}
                registrationEnabled={config.registration_enabled}
                toggling={toggling}
                onToggle={handleToggleRegistration}
              />

              <LogsSection
                inView={inView}
                logSource={logSource}
                logs={logs}
                logsTotal={logsTotal}
                logsLoading={logsLoading}
                logsLoaded={logsLoaded}
                onLogSourceChange={setLogSource}
                onLoadLogs={handleLoadLogs}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
