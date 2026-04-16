import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Users, ShieldCheck, GraduationCap } from 'lucide-react';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import UserDetailDrawer from '@/components/admin/users/UserDetailDrawer';

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

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.03] shrink-0" />
          <div className="space-y-1.5">
            <div className="w-24 h-3 rounded bg-white/[0.03]" />
            <div className="w-32 h-2.5 rounded bg-white/[0.03]" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="w-16 h-5 rounded-full bg-white/[0.03]" /></td>
      <td className="px-4 py-3"><div className="w-8 h-5 rounded-md bg-white/[0.03]" /></td>
      <td className="px-4 py-3"><div className="w-12 h-3 rounded bg-white/[0.03]" /></td>
      <td className="px-4 py-3"><div className="w-8 h-3 rounded bg-white/[0.03]" /></td>
      <td className="px-4 py-3"><div className="w-20 h-3 rounded bg-white/[0.03]" /></td>
      <td className="px-4 py-3"><div className="w-9 h-5 rounded-full bg-white/[0.03]" /></td>
    </tr>
  );
}

// ── Types ──────────────────────────────────────────────────────

export interface UserRow {
  id: number;
  first_name: string;
  email: string;
  role: 'ADMIN' | 'STUDENT';
  level: string;
  is_active: boolean;
  gender: string | null;
  age: number | null;
  avatar_url: string | null;
  created_at: string | null;
  total_xp: number;
  streak_days: number;
  last_activity: string | null;
}

interface ListResponse {
  count: number;
  page: number;
  pages: number;
  results: UserRow[];
}

// ── Constants ──────────────────────────────────────────────────

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-slate-700 text-slate-200',
  A2: 'bg-slate-600 text-slate-100',
  B1: 'bg-blue-900/60 text-blue-300',
  B2: 'bg-blue-800/60 text-blue-200',
  C1: 'bg-violet-900/60 text-violet-300',
  C2: 'bg-violet-700/60 text-violet-200',
};

const SELECT =
  'bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/60 focus:outline-none focus:border-violet-500/50 transition-colors appearance-none';

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ user }: { user: UserRow }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.first_name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white">
      {user.first_name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Status toggle ─────────────────────────────────────────────

function StatusToggle({
  userId,
  isActive,
  onChange,
}: {
  userId: number;
  isActive: boolean;
  onChange: (newVal: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    try {
      await apiFetch(`/auth/users/${userId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !isActive }),
      });
      onChange(!isActive);
    } catch {
      // revert silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none
        ${isActive ? 'bg-emerald-600' : 'bg-zinc-700'} ${loading ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
          ${isActive ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function UsersPage() {
  const { ref, inView } = useReveal();

  const [users, setUsers]           = useState<UserRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);

  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [levelFilter, setLevel]     = useState('');
  const [statusFilter, setStatus]   = useState('');

  const [pageSize, setPageSize]     = useState(5);
  const [pageSizeInput, setPSInput] = useState('20');

  function applyPageSize() {
    const n = parseInt(pageSizeInput, 10);
    if (!isNaN(n) && n >= 1) setPageSize(n);
    else setPSInput(String(pageSize));
  }

  const [selected, setSelected]     = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search',    search);
      if (roleFilter)   params.set('role',      roleFilter);
      if (levelFilter)  params.set('level',     levelFilter);
      if (statusFilter) params.set('is_active', statusFilter);
      params.set('page',      String(pg));
      params.set('page_size', String(pageSize));

      const data = await apiFetch<ListResponse>(`/auth/users/?${params}`);
      setUsers(data.results);
      setTotal(data.count);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, levelFilter, statusFilter, pageSize]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  function handleStatusChange(userId: number, newVal: boolean) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newVal } : u));
    if (selected?.id === userId) setSelected(prev => prev ? { ...prev, is_active: newVal } : null);
  }

  function handleUserUpdated(updated: UserRow) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setSelected(updated);
  }

  function handleUserDeleted(userId: number) {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setSelected(null);
  }

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
              <span className="font-mono text-[11px] text-white/20 tracking-widest">006</span>
              <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                User Management
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff] mb-8">
              Manage your users.
            </h1>

            {/* Filters toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o email…"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={SELECT}>
                <option value="">Todos los roles</option>
                <option value="STUDENT">Estudiante</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select value={levelFilter} onChange={e => setLevel(e.target.value)} className={SELECT}>
                <option value="">Todos los niveles</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <select value={statusFilter} onChange={e => setStatus(e.target.value)} className={SELECT}>
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>

              {/* Page size */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-white/30 whitespace-nowrap">Show</span>
                <input
                  type="number"
                  min={1}
                  value={pageSizeInput}
                  onChange={e => setPSInput(e.target.value)}
                  onBlur={applyPageSize}
                  onKeyDown={e => e.key === 'Enter' && applyPageSize()}
                  className="w-14 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/70 text-[12px] px-2 py-1.5 text-center focus:outline-none focus:border-violet-500/50 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
                <span className="text-[11px] text-white/30">rows</span>
              </div>
            </div>
          </motion.div>

          {/* ── Table ── */}
          <motion.div
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            custom={1}
            className="border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.01]"
          >
            {loading ? (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Usuario</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Rol</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Nivel</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">XP</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Racha</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Último acceso</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Users className="h-9 w-9 text-white/10" />
                <p className="text-[14px] text-white/25 leading-relaxed">No se encontraron usuarios.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Usuario</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Rol</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Nivel</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">XP</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Racha</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Último acceso</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr
                      key={user.id}
                      onClick={() => setSelected(user)}
                      className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors
                        ${selected?.id === user.id ? 'bg-violet-500/[0.08]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} />
                          <div>
                            <p className="text-white/85 font-medium">{user.first_name}</p>
                            <p className="text-[11px] text-white/30">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-900/40 text-amber-300 text-[11px] font-medium px-2 py-0.5 rounded-full">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-400 text-[11px] font-medium px-2 py-0.5 rounded-full">
                            <GraduationCap className="h-2.5 w-2.5" />
                            Estudiante
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${LEVEL_COLOR[user.level] ?? 'bg-zinc-700 text-zinc-300'}`}>
                          {user.level}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {user.total_xp.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-white/60">
                        {user.streak_days > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            🔥 <span>{user.streak_days}d</span>
                          </span>
                        ) : '—'}
                      </td>

                      <td className="px-4 py-3 text-white/40 text-[12px]">
                        {user.last_activity ?? '—'}
                      </td>

                      <td className="px-4 py-3">
                        <StatusToggle
                          userId={user.id}
                          isActive={user.is_active}
                          onChange={v => handleStatusChange(user.id, v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <motion.div
              variants={reveal}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              custom={2}
              className="mt-4 flex items-center justify-between"
            >
              <p className="text-[12px] text-white/20">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} usuario{total !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchUsers(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`el-${i}`} className="px-1 text-[12px] text-white/20">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => fetchUsers(p as number)}
                        className={`min-w-[28px] h-7 rounded-lg text-[12px] font-medium transition-colors ${
                          page === p
                            ? 'bg-violet-600 text-white'
                            : 'text-white/30 hover:text-white/70 hover:bg-white/[0.05]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => fetchUsers(page + 1)}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <UserDetailDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUserUpdated}
          onDeleted={handleUserDeleted}
        />
      )}
    </div>
  );
}
