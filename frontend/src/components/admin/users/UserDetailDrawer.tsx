import { useState, useEffect } from 'react';
import {
  X, ShieldCheck, GraduationCap, Flame, Zap, Mic, BookOpen,
  Headphones, PenLine, Trash2, KeyRound, AlertTriangle, Check,
  Loader2, User,
} from 'lucide-react';
import type { UserRow } from '@/pages/admin/UsersPage';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? 'Unknown error');
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface UserDetail extends UserRow {
  average_speaking:  number;
  average_reading:   number;
  average_listening: number;
  average_writing:   number;
}

interface SpeakingRow  { id: number; question: string; difficulty: string; score: number | null; xp_earned: number; transcribed: string; match: number | null; created_at: string; }
interface ReadingRow   { id: number; question: string; difficulty: string; score: number | null; xp_earned: number; selected: string; correct: boolean; created_at: string; }
interface ListeningRow { id: number; question: string; listening_type: string; difficulty: string; score: number | null; xp_earned: number; replays_used: number; correct: boolean; created_at: string; }
interface WritingRow   { id: number; question: string; difficulty: string; score: number | null; score_grammar: number | null; score_vocab: number | null; score_coherence: number | null; score_spelling: number | null; xp_earned: number; ai_feedback: string; created_at: string; }

type AttemptTab = 'speaking' | 'reading' | 'listening' | 'writing';

// ── Constants ──────────────────────────────────────────────────────────────

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const INPUT =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors';
const LABEL =
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-1.5';
const SELECT =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none';
const BTN_PRIMARY =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/60 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_DANGER =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

// ── Skill bar ──────────────────────────────────────────────────────────────

function SkillBar({ label, icon: Icon, value, color }: { label: string; icon: React.ElementType; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[12px] text-white/50">
          <Icon size={12} className={color} />
          {label}
        </span>
        <span className="text-[12px] font-medium text-white/70">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Score badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-white/20">—</span>;
  const color =
    score >= 80 ? 'text-emerald-400' :
    score >= 50 ? 'text-amber-400'   : 'text-red-400';
  return <span className={`font-semibold tabular-nums ${color}`}>{score.toFixed(0)}</span>;
}

// ── Attempts tabs ──────────────────────────────────────────────────────────

function AttemptsPanel({ userId }: { userId: number }) {
  const [activeTab, setActiveTab] = useState<AttemptTab>('speaking');
  const [data, setData]           = useState<unknown[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setData([]);
    apiFetch<{ tab: string; results: unknown[] }>(`/api/auth/users/${userId}/attempts/?tab=${activeTab}`)
      .then(r => setData(r.results))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [userId, activeTab]);

  const TABS: { key: AttemptTab; label: string; icon: React.ElementType }[] = [
    { key: 'speaking',  label: 'Speaking',  icon: Mic },
    { key: 'reading',   label: 'Reading',   icon: BookOpen },
    { key: 'listening', label: 'Listening', icon: Headphones },
    { key: 'writing',   label: 'Writing',   icon: PenLine },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.06] pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors
              ${activeTab === t.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-white/30 hover:text-white/60'}`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={18} className="animate-spin text-white/20" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-[12px] text-white/20 py-10">Sin intentos registrados</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scroll">
          {activeTab === 'speaking'  && (data as SpeakingRow[]).map(r  => <SpeakingRow  key={r.id} r={r} />)}
          {activeTab === 'reading'   && (data as ReadingRow[]).map(r   => <ReadingRow   key={r.id} r={r} />)}
          {activeTab === 'listening' && (data as ListeningRow[]).map(r => <ListeningRow key={r.id} r={r} />)}
          {activeTab === 'writing'   && (data as WritingRow[]).map(r   => <WritingRow   key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

function AttemptCard({ children, date, score, xp }: { children: React.ReactNode; date: string; score: number | null; xp: number }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-[12px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="text-right shrink-0">
          <ScoreBadge score={score} />
          <p className="text-[10px] text-amber-500 mt-0.5">+{xp} XP</p>
        </div>
      </div>
      <p className="text-[10px] text-white/20 mt-1.5">{date}</p>
    </div>
  );
}

function SpeakingRow({ r }: { r: SpeakingRow }) {
  return (
    <AttemptCard date={r.created_at} score={r.score} xp={r.xp_earned}>
      <p className="text-white/60 truncate">{r.question}</p>
      {r.transcribed && <p className="text-white/30 italic mt-0.5 truncate">"{r.transcribed}"</p>}
      <span className="inline-block mt-1 text-[10px] bg-white/[0.05] rounded px-1.5 py-0.5 text-white/30">{r.difficulty}</span>
    </AttemptCard>
  );
}

function ReadingRow({ r }: { r: ReadingRow }) {
  return (
    <AttemptCard date={r.created_at} score={r.score} xp={r.xp_earned}>
      <p className="text-white/60 truncate">{r.question}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-[10px] font-medium ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
          {r.correct ? '✓ Correcto' : '✗ Incorrecto'}
        </span>
        <span className="text-[10px] bg-white/[0.05] rounded px-1.5 py-0.5 text-white/30">{r.difficulty}</span>
      </div>
    </AttemptCard>
  );
}

function ListeningRow({ r }: { r: ListeningRow }) {
  return (
    <AttemptCard date={r.created_at} score={r.score} xp={r.xp_earned}>
      <p className="text-white/60 truncate">{r.question}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-[10px] bg-white/[0.05] rounded px-1.5 py-0.5 text-white/30">
          {r.listening_type === 'LISTENING_SHADOWING' ? 'Shadowing' : 'Comprensión'}
        </span>
        <span className="text-[10px] bg-white/[0.05] rounded px-1.5 py-0.5 text-white/30">{r.difficulty}</span>
        {r.replays_used > 0 && (
          <span className="text-[10px] text-white/20">{r.replays_used} replay{r.replays_used !== 1 ? 's' : ''}</span>
        )}
      </div>
    </AttemptCard>
  );
}

function WritingRow({ r }: { r: WritingRow }) {
  return (
    <AttemptCard date={r.created_at} score={r.score} xp={r.xp_earned}>
      <p className="text-white/60 truncate">{r.question}</p>
      {(r.score_grammar !== null) && (
        <div className="flex gap-3 mt-1 text-[10px] text-white/30 flex-wrap">
          <span>G: {r.score_grammar?.toFixed(0)}</span>
          <span>V: {r.score_vocab?.toFixed(0)}</span>
          <span>C: {r.score_coherence?.toFixed(0)}</span>
          <span>O: {r.score_spelling?.toFixed(0)}</span>
        </div>
      )}
      {r.ai_feedback && (
        <p className="text-[10px] text-white/25 mt-1 line-clamp-2">{r.ai_feedback}</p>
      )}
    </AttemptCard>
  );
}

// ── Confirmation dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <p className="text-[13px] text-white/70 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className={BTN_GHOST}>Cancelar</button>
          <button onClick={onConfirm} className={BTN_DANGER}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────────────────────

export default function UserDetailDrawer({
  user: initialUser,
  onClose,
  onUpdated,
  onDeleted,
}: {
  user: UserRow;
  onClose: () => void;
  onUpdated: (u: UserRow) => void;
  onDeleted: (id: number) => void;
}) {
  const [detail, setDetail]         = useState<UserDetail | null>(null);
  const [loadingDetail, setLD]      = useState(true);

  // Edit fields
  const [level, setLevel]           = useState(initialUser.level);
  const [role, setRole]             = useState(initialUser.role);

  // Password reset
  const [newPassword, setNewPwd]    = useState('');
  const [pwdError, setPwdError]     = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [savingPwd, setSavingPwd]   = useState(false);

  // Save state
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [saved, setSaved]           = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  // Active section tab
  const [section, setSection]       = useState<'profile' | 'history'>('profile');

  useEffect(() => {
    setLD(true);
    apiFetch<UserDetail>(`/api/auth/users/${initialUser.id}/`)
      .then(d => {
        setDetail(d);
        setLevel(d.level);
        setRole(d.role);
      })
      .catch(() => {})
      .finally(() => setLD(false));
  }, [initialUser.id]);

  async function handleSave() {
    if (!detail) return;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const updated = await apiFetch<UserDetail>(`/api/auth/users/${detail.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ level, role }),
      });
      setDetail(updated);
      setLevel(updated.level);
      setRole(updated.role);
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    setPwdError('');
    setPwdSuccess(false);
    if (newPassword.length < 8) {
      setPwdError('Mínimo 8 caracteres');
      return;
    }
    setSavingPwd(true);
    try {
      await apiFetch(`/api/auth/users/${initialUser.id}/reset-password/`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
      });
      setNewPwd('');
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (e: unknown) {
      setPwdError(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/auth/users/${initialUser.id}/`, { method: 'DELETE' });
      onDeleted(initialUser.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const user = detail ?? initialUser;

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar la cuenta de ${user.first_name}? Esta acción es irreversible y borrará todos sus intentos y progreso.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-[420px] bg-zinc-950 border-l border-white/[0.07] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.first_name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[13px] font-bold text-white">
                {user.first_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold text-white/90">{user.first_name}</p>
              <p className="text-[11px] text-white/30">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.04] border-b border-white/[0.06] shrink-0">
          {[
            { label: 'XP Total',  value: user.total_xp.toLocaleString(), icon: Zap,   color: 'text-amber-400' },
            { label: 'Racha',     value: `${user.streak_days}d`,         icon: Flame, color: 'text-orange-400' },
            { label: 'Nivel',     value: user.level,                     icon: User,  color: 'text-indigo-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-950 flex flex-col items-center py-3 gap-1">
              <s.icon size={14} className={s.color} />
              <p className="text-[15px] font-bold text-white/85">{s.value}</p>
              <p className="text-[10px] text-white/25">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-white/[0.06] shrink-0">
          {(['profile', 'history'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors
                ${section === s ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/30 hover:text-white/60'}`}
            >
              {s === 'profile' ? 'Perfil & Progreso' : 'Historial'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-white/20" />
            </div>
          ) : section === 'profile' ? (
            <>
              {/* ── Profile edit ── */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-3">Ajustes de cuenta</p>
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Nivel CEFR</label>
                    <select value={level} onChange={e => setLevel(e.target.value)} className={SELECT}>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Rol</label>
                    <select value={role} onChange={e => setRole(e.target.value as 'ADMIN' | 'STUDENT')} className={SELECT}>
                      <option value="STUDENT">Estudiante</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                {saveError && <p className="mt-2 text-[11px] text-red-400">{saveError}</p>}

                <button onClick={handleSave} disabled={saving} className={`${BTN_PRIMARY} mt-3`}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
                  {saved ? 'Guardado' : 'Guardar cambios'}
                </button>
              </div>

              {/* ── Skill averages ── */}
              {detail && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-3">Promedios por habilidad</p>
                  <div className="space-y-3">
                    <SkillBar label="Speaking"  icon={Mic}        value={detail.average_speaking}  color="text-emerald-400" />
                    <SkillBar label="Reading"   icon={BookOpen}   value={detail.average_reading}   color="text-blue-400" />
                    <SkillBar label="Listening" icon={Headphones} value={detail.average_listening} color="text-violet-400" />
                    <SkillBar label="Writing"   icon={PenLine}    value={detail.average_writing}   color="text-rose-400" />
                  </div>
                </div>
              )}

              {/* ── Password reset ── */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-3">Nueva contraseña</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    className={INPUT}
                  />
                  <button onClick={handlePasswordReset} disabled={savingPwd} className={BTN_GHOST}>
                    {savingPwd ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                    <span className="whitespace-nowrap">Cambiar</span>
                  </button>
                </div>
                {pwdError   && <p className="mt-1.5 text-[11px] text-red-400">{pwdError}</p>}
                {pwdSuccess && <p className="mt-1.5 text-[11px] text-emerald-400 flex items-center gap-1"><Check size={11} /> Contraseña actualizada</p>}
              </div>

              {/* ── Danger zone ── */}
              <div className="border border-red-900/30 rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-red-500/60 mb-2">Zona de peligro</p>
                <p className="text-[12px] text-white/30 mb-3">
                  Eliminar la cuenta borra permanentemente todos los intentos, progreso y vocabulario diario del usuario.
                </p>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                  className={BTN_DANGER}
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Eliminar cuenta
                </button>
              </div>

              {/* Role badge info */}
              <div className="flex items-center gap-2 text-[11px] text-white/20">
                {user.role === 'ADMIN' ? (
                  <><ShieldCheck size={12} className="text-amber-400/60" /> Cuenta de administrador</>
                ) : (
                  <><GraduationCap size={12} /> Creado el {user.created_at ?? '—'}</>
                )}
              </div>
            </>
          ) : (
            /* ── History ── */
            <AttemptsPanel userId={initialUser.id} />
          )}
        </div>
      </aside>
    </>
  );
}
