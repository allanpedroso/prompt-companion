import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, FileSearch, Receipt, Search, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/documentos', icon: FileSearch, label: 'Revisão' },
  { to: '/despesas', icon: Receipt, label: 'Despesas' },
  { to: '/busca', icon: Search, label: 'Busca' },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5">
          <img src="/gestcorp_icon.png" alt="Gest Corp" className="w-8 h-8 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Gest Corp</span>
            <span className="text-[10px] text-blue-400/70">Soluções Integradas</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] text-white`} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground truncate">{email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-md text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
