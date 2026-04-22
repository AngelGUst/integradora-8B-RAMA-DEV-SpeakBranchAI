import { BarChart2, Route, LogOut, BookOpen, BookMarked, Users, Library, Settings, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Logo from '@/shared/components/ui/Logo';

const NAV_ITEMS = [
  { label: 'Control Panel',    icon: BarChart2,  path: '/dashboard',        adminOnly: false },
  { label: 'Learning Path', icon: Route,      path: '/learn',            adminOnly: false },
  { label: 'Mi Vocabulary',      icon: Library,    path: '/vocabulary',       adminOnly: false },
  { label: 'Dashboard',           icon: LayoutDashboard, path: '/admin/dashboard', adminOnly: true  },
  { label: 'Questions',           icon: BookOpen,   path: '/admin/questions',  adminOnly: true  },
  { label: 'Vocabulary',         icon: BookMarked, path: '/admin/vocabulary', adminOnly: true  },
  { label: 'Users',            icon: Users,      path: '/admin/users',      adminOnly: true  },
  { label: 'Settings',       icon: Settings,   path: '/admin/system',     adminOnly: true  },
];

function UserAvatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
      {url
        ? <img src={url} alt={name} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-emerald-400">{name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full shrink-0 relative z-20">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'ADMIN').map(item => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <item.icon size={18} className={active ? 'text-emerald-400' : ''} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-1">
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${pathname === '/profile'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <UserAvatar name={user.first_name} url={user.avatar_url} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-zinc-200 truncate">{user.first_name}</p>
              <p className="text-[10px] text-zinc-500 truncate">
                {user.level} · {user.role === 'ADMIN' ? 'Admin' : 'Student'}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
