import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  TrendingUp,
  CheckSquare,
  Calendar,
  MessageSquare,
  FileText,
  DollarSign,
  BarChart3,
  Zap,
  Plug,
  UsersRound,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/leads', icon: UserPlus, label: 'Leads' },
    { path: '/sales-funnel', icon: TrendingUp, label: 'Funil de Vendas' },
    { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
    { path: '/calendar', icon: Calendar, label: 'Agenda' },
    { path: '/messages', icon: MessageSquare, label: 'Mensagens' },
    { path: '/contracts', icon: FileText, label: 'Contratos' },
    { path: '/financial', icon: DollarSign, label: 'Financeiro' },
    { path: '/analytics', icon: BarChart3, label: 'Relatórios' },
    { path: '/automation', icon: Zap, label: 'Automação' },
    { path: '/integrations', icon: Plug, label: 'Integrações' },
    { path: '/team', icon: UsersRound, label: 'Equipe' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
    { path: '/support', icon: HelpCircle, label: 'Suporte' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className={`p-6 border-b border-slate-800 ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Alfred
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        
        {!collapsed && currentWorkspace && (
          <div className="mt-4">
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-400 w-full justify-center">
              <Building2 className="w-3 h-3 mr-1" />
              {currentWorkspace.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${active 
                    ? 'bg-cyan-500/20 text-cyan-400 border-l-4 border-cyan-500' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-l-4 border-transparent'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className={`border-t border-slate-800 p-4 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`
          hidden lg:flex flex-col
          ${collapsed ? 'w-20' : 'w-64'}
          bg-slate-900/50 backdrop-blur-sm border-r border-slate-800
          transition-all duration-300 fixed left-0 top-0 h-screen z-30
        `}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`
          lg:hidden flex flex-col w-64
          bg-slate-900 border-r border-slate-800
          fixed left-0 top-0 h-screen z-50
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
