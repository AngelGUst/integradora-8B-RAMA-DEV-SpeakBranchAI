import { useState, useEffect } from 'react';
import {
  User as UserIcon, Mail, Calendar, Venus, Zap, Flame,
  Mic, BookOpen, Headphones, Repeat, Save, X, Pencil, Link,
  KeyRound, Trash2, AlertTriangle, Check, Loader2, PenLine,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLearnProgress } from '@/shared/hooks/useLearnProgress';
import { authApi } from '@/features/auth/api/authApi';
import apiClient from '@/shared/api/client';
import type { Gender } from '@/features/auth/types/auth.types';
import AppSidebar from '@/shared/components/layout/AppSidebar';

// -- Constants --------------------------------------------------

const GENDER_LABELS: Record<Gender, string> = {
  M: 'Masculino', F: 'Femenino', NB: 'No binario', P: 'Prefiero no decirlo',
};

const CEFR_LABEL: Record<string, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-Int.', C1: 'Advanced', C2: 'Mastery',
};

const SKILL_META = [
  { key: 'speaking', label: 'Speaking', Icon: Mic, color: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-400' },
  { key: 'reading', label: 'Reading', Icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10', bar: 'bg-sky-400' },
  { key: 'listening', label: 'Listening', Icon: Headphones, color: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-400' },
  { key: 'writing', label: 'Writing', Icon: PenLine, color: 'text-violet-400', bg: 'bg-violet-500/10', bar: 'bg-violet-400' },
] as const;

type PageTab = 'profile' | 'history' | 'security';
type AttemptTab = 'speaking' | 'reading' | 'listening' | 'writing';

// -- API helpers ------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function fetchAttempts(tab: AttemptTab) {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}/auth/attempts/?tab=${tab}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch attempts');
  return res.json() as Promise<{ tab: string; results: unknown[] }>;
}

// -- Attempt row types ------------------------------------------

interface SpeakingRow { id: number; question: string; difficulty: string; score: number | null; xp_earned: number; transcribed: string; created_at: string; }
interface ReadingRow { id: number; question: string; difficulty: string; score: number | null; xp_earned: number; correct: boolean; created_at: string; }
interface ListeningRow { id: number; question: string; listening_type: string; difficulty: string; score: number | null; xp_earned: number; replays_used: number; correct: boolean; created_at: string; }
interface WritingRow { id: number; question: string; difficulty: string; score: number | null; score_grammar: number | null; score_vocab: number | null; score_coherence: number | null; score_spelling: number | null; xp_earned: number; ai_feedback: string; created_at: string; }

// -- Shared sub-components --------------------------------------

function Avatar({ name, url, size = 'lg' }: { name: string; url: string | null; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${dim} rounded-full overflow-hidden bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center shrink-0`}>
      {url
        ? <img src={url} alt={name} className="w-full h-full object-cover" />
        : <span className="font-bold text-emerald-400">{name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <Icon size={16} className={color} />
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600">-</span>;
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-semibold tabular-nums ${color}`}>{score.toFixed(0)}</span>;
}

function AttemptCard({ children, date, score, xp }: { children: React.ReactNode; date: string; score: number | null; xp: number }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-[13px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="text-right shrink-0">
          <ScoreBadge score={score} />
          <p className="text-[10px] text-amber-500 mt-0.5">+{xp} XP</p>
        </div>
      </div>
      <p className="text-[11px] text-zinc-600 mt-1.5">{date}</p>
    </div>
  );
}

// -- History tab panel ------------------------------------------

function HistoryPanel() {
  const [activeTab, setActiveTab] = useState<AttemptTab>('speaking');
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData([]);
    fetchAttempts(activeTab)
      .then(r => setData(r.results))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const TABS: { key: AttemptTab; label: string; icon: React.ElementType }[] = [
    { key: 'speaking', label: 'Speaking', icon: Mic },
    { key: 'reading', label: 'Reading', icon: BookOpen },
    { key: 'listening', label: 'Listening', icon: Headphones },
    { key: 'writing', label: 'Writing', icon: PenLine },
  ];

  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium border-b-2 -mb-px transition-colors
              ${activeTab === t.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-zinc-600" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-[13px] text-zinc-600 py-12">No recorded attempts para esta habilidad.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {activeTab === 'speaking' && (data as SpeakingRow[]).map(r => (
              <AttemptCard key={r.id} date={r.created_at} score={r.score} xp={r.xp_earned}>
                <p className="text-zinc-300 truncate">{r.question}</p>
                {r.transcribed && <p className="text-zinc-500 italic mt-0.5 truncate">"{r.transcribed}"</p>}
                <span className="inline-block mt-1 text-[10px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">{r.difficulty}</span>
              </AttemptCard>
            ))}
            {activeTab === 'reading' && (data as ReadingRow[]).map(r => (
              <AttemptCard key={r.id} date={r.created_at} score={r.score} xp={r.xp_earned}>
                <p className="text-zinc-300 truncate">{r.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] font-medium ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.correct ? ' Correcto' : 'S× Incorrecto'}
                  </span>
                  <span className="text-[10px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">{r.difficulty}</span>
                </div>
              </AttemptCard>
            ))}
            {activeTab === 'listening' && (data as ListeningRow[]).map(r => (
              <AttemptCard key={r.id} date={r.created_at} score={r.score} xp={r.xp_earned}>
                <p className="text-zinc-300 truncate">{r.question}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">
                    {r.listening_type === 'LISTENING_SHADOWING' ? 'Shadowing' : 'Comprehension'}
                  </span>
                  <span className="text-[10px] bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">{r.difficulty}</span>
                  {r.replays_used > 0 && <span className="text-[10px] text-zinc-500">{r.replays_used} replay{r.replays_used !== 1 ? 's' : ''}</span>}
                </div>
              </AttemptCard>
            ))}
            {activeTab === 'writing' && (data as WritingRow[]).map(r => (
              <AttemptCard key={r.id} date={r.created_at} score={r.score} xp={r.xp_earned}>
                <p className="text-zinc-300 truncate">{r.question}</p>
                {r.score_grammar !== null && (
                  <div className="flex gap-3 mt-1 text-[10px] text-zinc-500 flex-wrap">
                    <span>Gram: {r.score_grammar?.toFixed(0)}</span>
                    <span>Vocab: {r.score_vocab?.toFixed(0)}</span>
                    <span>Coh: {r.score_coherence?.toFixed(0)}</span>
                    <span>Ort: {r.score_spelling?.toFixed(0)}</span>
                  </div>
                )}
                {r.ai_feedback && (
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{r.ai_feedback}</p>
                )}
              </AttemptCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// -- Security panel ---------------------------------------------

function SecurityPanel() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Delete account
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handlePasswordChange() {
    setPwdError('');
    setPwdSuccess(false);
    if (!currentPwd) { setPwdError('Enter your current password.'); return; }
    if (newPwd.length < 8) { setPwdError('The new password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return; }

    setSavingPwd(true);
    try {
      await apiClient.post('/auth/password/change/', {
        current_password: currentPwd,
        new_password: newPwd,
      });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPwdError(msg ?? 'Could not change password. Try again.');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      await apiClient.delete('/auth/me/');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setDeleteError('Could not delete the account. Try again.');
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Change password */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} className="text-zinc-400" />
          <h3 className="font-semibold text-zinc-100">Change Password</h3>
        </div>

        <div className="space-y-3 max-w-sm">
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">New password</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {pwdError && <p className="text-sm text-red-400">{pwdError}</p>}
          {pwdSuccess && (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5">
              <Check size={13} /> Current passwordizada correctamente.
            </p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={savingPwd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-1"
          >
            {savingPwd ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {savingPwd ? 'Saving...' : 'Change password'}
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border border-red-900/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-500/70" />
          <h3 className="font-semibold text-red-500/70 text-sm uppercase tracking-wider">Zona de Peligro</h3>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Deleting your account permanently removes all your progress, XP, streaks, daily vocabulary, and attempt history. This action is irreversible.
        </p>

        {deleteError && <p className="text-sm text-red-400 mb-3">{deleteError}</p>}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete my account
          </button>
        ) : (
          <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                <X size={13} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// -- Main page --------------------------------------------------

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { totalXP, streakDays, skillAverages } = useLearnProgress();

  const [pageTab, setPageTab] = useState<PageTab>('profile');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [age, setAge] = useState<string>(user?.age != null ? String(user.age) : '');
  const [gender, setGender] = useState<Gender | ''>(user?.gender ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');

  function startEdit() {
    setFirstName(user?.first_name ?? '');
    setAge(user?.age != null ? String(user.age) : '');
    setGender(user?.gender ?? '');
    setAvatarUrl(user?.avatar_url ?? '');
    setError(null);
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); setError(null); }

  async function save() {
    if (!firstName.trim()) { setError('Name cannot be empty.'); return; }
    const parsedAge = age === '' ? null : Number(age);
    if (age !== '' && (isNaN(parsedAge!) || parsedAge! < 1 || parsedAge! > 120)) {
      setError('Ingresa una edad válida (1-120).'); return;
    }
    setSaving(true); setError(null);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        age: parsedAge,
        gender: gender === '' ? null : gender,
        avatar_url: avatarUrl.trim() === '' ? null : avatarUrl.trim(),
      });
      await refreshUser();
      setEditing(false);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const PAGE_TABS: { key: PageTab; label: string }[] = [
    { key: 'profile', label: 'Profile & Stats' },
    { key: 'history', label: 'History' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="bg-[#07090F] text-zinc-50 h-screen flex font-sans overflow-hidden">
      <AppSidebar />

      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">

          {/* Header */}
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          </header>

          {/* Profile card (always visible) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-start gap-6">
              <Avatar name={user.first_name} url={editing ? (avatarUrl || null) : user.avatar_url} size="lg" />

              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Nombre</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Edad</label>
                        <input
                          type="number" min={1} max={120} value={age}
                          onChange={e => setAge(e.target.value)} placeholder="-"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Gender</label>
                        <select
                          value={gender} onChange={e => setGender(e.target.value as Gender | '')}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="">- Not specified -</option>
                          {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([val, lbl]) => (
                            <option key={val} value={val}>{lbl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Profile picture URL</label>
                      <div className="flex items-center gap-2">
                        <Link size={14} className="text-zinc-500 shrink-0" />
                        <input
                          type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={save} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Save size={14} />
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        onClick={cancelEdit} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-zinc-100">{user.first_name}</h2>
                        <p className="text-sm text-zinc-400">{user.email}</p>
                      </div>
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors shrink-0"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        {user.level} · {CEFR_LABEL[user.level] ?? user.level}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs">
                        {user.role === 'ADMIN'
                          ? <><ShieldCheck size={11} className="text-amber-400" /> Administrator</>
                          : 'Student'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-500">
                      <span className="flex items-center gap-1.5"><Mail size={13} />{user.email}</span>
                      {user.age != null && <span className="flex items-center gap-1.5"><Calendar size={13} />{user.age} years</span>}
                      {user.gender && <span className="flex items-center gap-1.5"><Venus size={13} />{GENDER_LABELS[user.gender]}</span>}
                      {!user.age && !user.gender && (
                        <span className="flex items-center gap-1.5 text-zinc-600 italic">
                          <UserIcon size={13} /> Personal information incomplete
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-zinc-800 -mb-2">
            {PAGE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setPageTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${pageTab === t.key
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pt-5">
            {/* Tab content */}
            {pageTab === 'profile' && (
              <div className="space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={Zap} label="XP Total" value={`${totalXP} XP`} color="text-emerald-400" />
                  <StatCard icon={Flame} label="Streak" value={`${streakDays} days`} color="text-amber-400" />
                  <StatCard icon={UserIcon} label="Level" value={user.level} color="text-sky-400" />
                  <StatCard icon={UserIcon} label="Accuracy" value={`${Math.round(user.average_precision)}%`} color="text-violet-400" />
                </div>

                {/* Skill precision */}
                <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-zinc-100 mb-5">Accuracy por Habilidad</h3>
                  <div className="space-y-4">
                    {SKILL_META.map(skill => {
                      const score = Math.round(
                        skill.key === 'speaking' ? (skillAverages?.speaking ?? 0) :
                          skill.key === 'reading' ? (skillAverages?.reading ?? 0) :
                            skill.key === 'listening' ? (skillAverages?.listening ?? 0) :
                              (skillAverages?.writing ?? 0)
                      );
                      return (
                        <div key={skill.key} className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${skill.bg} shrink-0`}>
                            <skill.Icon size={15} className={skill.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-zinc-300">{skill.label}</span>
                              <span className={`text-sm font-semibold tabular-nums ${skill.color}`}>{score}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${skill.bar}`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {pageTab === 'history' && <HistoryPanel />}

            {pageTab === 'security' && <SecurityPanel />}

          </div>

        </div>
      </main>
    </div>
  );
}


