import React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Building2,
  CheckSquare,
  ChevronDown,
  LogOut,
  Menu,
  Users2,
} from "lucide-react";
import NanoMark from "./NanoMark";
import { dashboardClass, dashboardTheme } from "../lib/dashboardTheme";

const SidebarItem = ({ item, active, expanded, onClick }) => {
  const Icon = item.icon;

  const content = (
    <button
      type="button"
      onClick={onClick}
      className={`group/item flex h-11 w-full items-center gap-3 overflow-hidden rounded-2xl px-3 text-left transition-all duration-200 ${
        active
          ? "border border-red-400/16 bg-[linear-gradient(135deg,rgba(127,29,29,0.44),rgba(15,23,42,0.86))] text-red-50 shadow-[0_12px_28px_rgba(127,29,29,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-slate-400 hover:bg-white/[0.045] hover:text-zinc-100"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-red-500/12 text-red-100"
            : "bg-white/[0.03] text-slate-500 group-hover/item:text-zinc-200"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span
        className={`truncate text-sm font-medium transition-all duration-200 ${
          expanded
            ? "max-w-[150px] opacity-100"
            : "max-w-0 opacity-0 group-hover/sidebar:max-w-[150px] group-hover/sidebar:opacity-100"
        }`}
      >
        {item.label}
      </span>
    </button>
  );

  if (expanded) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        side="right"
        className="rounded-xl border border-slate-700/30 bg-slate-950/90 px-3 py-1.5 text-xs text-zinc-100 backdrop-blur-sm"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
};

const SidebarSection = ({
  title,
  items,
  activeItem,
  expanded,
  onSelectItem,
}) => (
  <div className="space-y-2">
    <div
      className={`px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 transition-all duration-200 ${
        expanded
          ? "opacity-100"
          : "opacity-0 group-hover/sidebar:opacity-100"
      }`}
    >
      {title}
    </div>
    <div className="space-y-1">
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item}
          active={activeItem === item.id}
          expanded={expanded}
          onClick={() => onSelectItem(item.id)}
        />
      ))}
    </div>
  </div>
);

const DesktopSidebar = ({
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
}) => {
  const groupedItems = items.reduce((accumulator, item) => {
    const key = item.group || "Geral";
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

  const secondaryItems = [
    { id: "clients", label: "Clientes", icon: Users2, action: onClients },
    { id: "tasks", label: "Tarefas", icon: CheckSquare, action: onTasks },
  ];

  const userInitial = (user?.name || user?.email || "N").charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={80}>
      <aside className="group/sidebar fixed inset-y-4 left-4 z-40 hidden w-[74px] transition-[width] duration-300 hover:w-[236px] lg:flex">
        <div className={`flex h-full w-full flex-col gap-3 rounded-[28px] border border-slate-700/30 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.12),_transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.82)_0%,rgba(9,9,11,0.72)_100%)] px-0 py-2 shadow-[0_20px_55px_rgba(2,6,23,0.5)] backdrop-blur-xl`}>
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <NanoMark className="h-10 w-10" />
            </div>
            <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
              <p className="truncate text-base font-semibold text-white">Nano</p>
              <p className="truncate text-xs text-slate-500">Gestao financeira</p>
            </div>
          </div>

          <div className="px-1">
            <div className={`${dashboardTheme.panelSecondary} p-2`}>
              <div className="flex items-center justify-center group-hover/sidebar:justify-between px-2">
                <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-xs font-medium text-zinc-100">
                    {workspaceName}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" />
              </div>

              <div className="mt-2 hidden group-hover/sidebar:block">
                <select
                  value={currentWorkspaceId}
                  onChange={(event) => onWorkspaceChange(event.target.value)}
                  className={`h-10 w-full ${dashboardClass.input} px-3`}
                >
                  {workspaces?.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-2 py-3">
            <div className="nano-sidebar-scroll h-full space-y-5 overflow-y-auto pr-1">
              {Object.entries(groupedItems).map(([title, sectionItems]) => (
                <SidebarSection
                  key={title}
                  title={title}
                  items={sectionItems}
                  activeItem={activeItem}
                  expanded={false}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          </div>

          <div className="p-2">
            <div className="space-y-1">
              {secondaryItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={false}
                  expanded={false}
                  onClick={item.action}
                />
              ))}
            </div>

            <div className={`${dashboardTheme.panelSecondary} mt-4 p-2`}>
              <div className="flex items-center justify-center gap-3 group-hover/sidebar:justify-start">
                <Avatar className="h-10 w-10 shrink-0 border border-red-400/18 bg-gradient-to-br from-red-500 to-rose-700">
                  <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.name || "Admin"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-slate-700/30 bg-slate-950/60 px-3 text-sm text-zinc-300 transition hover:border-red-400/16 hover:bg-red-500/10 hover:text-red-100 group-hover/sidebar:justify-start"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  Sair
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};

const MobileSidebar = (props) => {
  const groupedItems = props.items.reduce((accumulator, item) => {
    const key = item.group || "Geral";
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

  return (
    <div className="fixed left-4 top-4 z-50 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-2xl border border-slate-700/30 bg-slate-950/85 text-white shadow-[0_16px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm hover:bg-slate-900"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] border-r border-slate-700/30 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(9,9,11,0.92))] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu do Nano</SheetTitle>
            <SheetDescription>Navegacao principal do sistema.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col px-4 py-4">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex h-10 w-10 items-center justify-center">
              <NanoMark className="h-10 w-10" />
            </div>
              <div>
                <p className="text-base font-semibold text-white">Nano</p>
                <p className="text-xs text-slate-500">Gestao financeira</p>
              </div>
            </div>

            <div className={`mt-4 ${dashboardTheme.panelSecondary} p-3`}>
              <p className="truncate text-sm font-medium text-white">{props.workspaceName}</p>
              <select
                value={props.currentWorkspaceId}
                onChange={(event) => props.onWorkspaceChange(event.target.value)}
                className={`mt-3 h-10 w-full ${dashboardClass.input} px-3`}
              >
                {props.workspaces?.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex-1 space-y-5 overflow-y-auto">
              {Object.entries(groupedItems).map(([title, sectionItems]) => (
                <SidebarSection
                  key={title}
                  title={title}
                  items={sectionItems}
                  activeItem={props.activeItem}
                  expanded
                  onSelectItem={props.onSelectItem}
                />
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start rounded-2xl text-zinc-300 hover:bg-white/[0.045]"
                onClick={props.onClients}
              >
                <Users2 className="mr-3 h-4.5 w-4.5" />
                Clientes
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start rounded-2xl text-zinc-300 hover:bg-white/[0.045]"
                onClick={props.onTasks}
              >
                <CheckSquare className="mr-3 h-4.5 w-4.5" />
                Tarefas
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start rounded-2xl border border-red-500/14 bg-red-500/[0.06] text-red-100 hover:bg-red-500/10"
                onClick={props.onLogout}
              >
                <LogOut className="mr-3 h-4.5 w-4.5" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Sidebar = (props) => (
  <>
    <style>{`
      .nano-sidebar-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      .nano-sidebar-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .nano-sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .nano-sidebar-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 999px;
      }
      .nano-sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.16);
      }
    `}</style>
    <DesktopSidebar {...props} />
    <MobileSidebar {...props} />
  </>
);

export default Sidebar;
