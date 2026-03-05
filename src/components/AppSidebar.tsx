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
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50"
      style={{ background: 'var(--gradient-sidebar)' }}>
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <FileText className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-sidebar-accent-foreground tracking-tight">DocFinance</h1>
          <p className="text-[11px] text-sidebar-foreground">Organização financeira</p>
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
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-sidebar-primary' : ''}`} />
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
