import React, { useMemo, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './ui/sheet';
import { Building2, CheckSquare, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const itemButtonBase =
  'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all duration-300';

const SidebarRow = ({
  item,
  active,
  expanded,
  onSelect
}) => {
  const Icon = item.icon;

  const content = (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`${itemButtonBase} ${
        active
          ? 'bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.24),0_0_30px_rgba(34,211,238,0.08)]'
          : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
      } ${expanded ? 'justify-start' : 'justify-center'}`}
    >
      <span
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
          active
            ? 'border-cyan-300/20 bg-cyan-300/14 text-cyan-100'
            : 'border-white/8 bg-white/[0.03] text-slate-300 group-hover:border-white/14 group-hover:bg-white/[0.06]'
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>

      {expanded && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{item.label}</span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.description}</span>
        </span>
      )}
    </button>
  );

  if (expanded) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-slate-100">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
};

const SidebarFooterButton = ({ icon: Icon, label, danger = false, expanded, onClick }) => {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`${itemButtonBase} ${expanded ? 'justify-start' : 'justify-center'} ${
        danger
          ? 'text-rose-300 hover:bg-rose-400/12 hover:text-rose-100'
          : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
        <Icon className="h-4.5 w-4.5" />
      </span>
      {expanded && <span className="text-sm font-medium">{label}</span>}
    </button>
  );

  if (expanded) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-slate-100">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const SidebarContent = ({
  expanded,
  items,
  activeItem,
  onSelectItem,
  workspaceName,
  user,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onClients,
  onTasks,
  onLogout,
  onToggleDesktop
}) => {
  const userInitial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-full flex-col">
        <div className="border-b border-white/8 px-3 py-4">
          <div className={`flex items-center ${expanded ? 'justify-between' : 'justify-center'}`}>
            {expanded ? (
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-300/80">Alfred</p>
                <h1 className="mt-2 truncate text-lg font-semibold text-white">Central financeira</h1>
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-100">
                <Building2 className="h-4.5 w-4.5" />
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleDesktop}
              className="hidden rounded-full border border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white lg:flex"
            >
              {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </div>

          <div className={`mt-4 ${expanded ? 'block' : 'hidden'}`}>
            <Badge variant="outline" className="w-full justify-center rounded-full border-cyan-400/18 bg-cyan-400/10 py-1 text-cyan-100">
              <Building2 className="mr-2 h-3.5 w-3.5" />
              {workspaceName}
            </Badge>

            {workspaces?.length > 0 && (
              <select
                value={currentWorkspaceId}
                onChange={(event) => onWorkspaceChange(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {items.map((item) => (
              <SidebarRow
                key={item.id}
                item={item}
                active={activeItem === item.id}
                expanded={expanded}
                onSelect={onSelectItem}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-white/8 px-2 py-4">
          <div className={`rounded-[24px] border border-white/8 bg-white/[0.03] p-2 ${expanded ? '' : 'flex flex-col items-center'}`}>
            <div className={`flex items-center gap-3 px-2 pb-2 ${expanded ? '' : 'justify-center'}`}>
              <Avatar className="h-11 w-11 border border-cyan-400/18 bg-cyan-400/10">
                <AvatarFallback className="bg-transparent text-sm font-semibold text-cyan-100">
                  {userInitial}
                </AvatarFallback>
              </Avatar>

              {expanded && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <SidebarFooterButton expanded={expanded} icon={Building2} label="Clientes" onClick={onClients} />
              <SidebarFooterButton expanded={expanded} icon={CheckSquare} label="Tarefas" onClick={onTasks} />
              <SidebarFooterButton expanded={expanded} icon={LogOut} label="Sair" danger onClick={onLogout} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

const Sidebar = ({
  items,
  activeItem,
  onSelectItem,
  workspaceName,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  user,
  onClients,
  onTasks,
  onLogout
}) => {
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [desktopPinned, setDesktopPinned] = useState(false);

  const expanded = desktopExpanded || desktopPinned;

  const sidebarWidth = useMemo(() => (expanded ? 220 : 72), [expanded]);

  const contentProps = {
    items,
    activeItem,
    onSelectItem,
    workspaceName,
    workspaces,
    currentWorkspaceId,
    onWorkspaceChange,
    user,
    onClients,
    onTasks,
    onLogout,
    onToggleDesktop: () => {
      setDesktopPinned((value) => {
        const nextPinned = !value;
        setDesktopExpanded(nextPinned);
        return nextPinned;
      });
    }
  };

  return (
    <>
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="rounded-2xl border border-white/10 bg-slate-950/85 text-white shadow-[0_20px_50px_rgba(2,8,23,0.42)] backdrop-blur-xl hover:bg-slate-900"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[292px] border-white/10 bg-[#071321]/96 p-0 text-white sm:max-w-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu principal do Alfred</SheetTitle>
              <SheetDescription>Navegação e ações principais</SheetDescription>
            </SheetHeader>
            <SidebarContent {...contentProps} expanded />
          </SheetContent>
        </Sheet>
      </div>

      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen lg:block"
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => !desktopPinned && setDesktopExpanded(false)}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="h-full border-r border-white/8 bg-[#06111d]/86 backdrop-blur-2xl transition-[width] duration-300 ease-out">
          <SidebarContent {...contentProps} expanded={expanded} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
