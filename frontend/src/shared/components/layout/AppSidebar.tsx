import { BarChart2, Route, LogOut, BookOpen, BookMarked } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Logo from '@/shared/components/ui/Logo';

const NAV_ITEMS = [
  { label: 'Panel de Control',    icon: BarChart2, path: '/dashboard',        adminOnly: false },
  { label: 'Ruta de Aprendizaje', icon: Route,     path: '/learn',            adminOnly: false },
  { label: 'Preguntas',           icon: BookOpen,  path: '/admin/questions',  adminOnly: true  },
  { label: 'Vocabulario',         icon: BookMarked, path: '/admin/vocabulary', adminOnly: true  },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen shrink-0 relative z-20">
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

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
