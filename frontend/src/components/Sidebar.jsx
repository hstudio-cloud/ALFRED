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
      className={`group/item relative flex h-11 w-full items-center gap-3 overflow-visible rounded-2xl px-3 text-left transition-all duration-250 ${
        active
          ? "text-red-50"
          : "text-slate-500 hover:text-zinc-100"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 hidden h-7 w-[2px] -translate-y-1/2 rounded-full transition-all duration-250 group-hover/sidebar:block ${
          active ? "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]" : "bg-transparent"
        }`}
      />
      <span
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-all duration-250 ${
          active
            ? "border-red-400/22 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.24),rgba(127,29,29,0.16))] text-red-100 shadow-[0_10px_28px_rgba(127,29,29,0.24)]"
            : "border-white/6 bg-white/[0.02] text-slate-500 group-hover/item:border-white/10 group-hover/item:bg-white/[0.04] group-hover/item:text-zinc-200"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span
        className={`truncate text-sm font-medium transition-all duration-200 ${
          expanded
            ? "max-w-[150px] opacity-100"
            : "pointer-events-none absolute left-[56px] top-1/2 z-20 -translate-y-1/2 rounded-full border border-red-400/14 bg-[linear-gradient(135deg,rgba(196,19,36,0.96),rgba(160,18,32,0.88))] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-[0_14px_28px_rgba(127,29,29,0.26)] transition-all duration-200 group-hover/item:translate-x-1 group-hover/item:opacity-100"
        }`}
      >
        {item.label}
      </span>
    </button>
  );

  return content;
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
    <aside className="group/sidebar fixed inset-y-4 left-4 z-40 hidden w-[88px] transition-[width] duration-300 hover:w-[224px] lg:flex">
        <div className="relative flex h-full w-full flex-col gap-3 px-0 py-2">
          <div className="pointer-events-none absolute left-[43px] top-[112px] bottom-[124px] w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02),rgba(255,255,255,0.08))]" />

          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.84),rgba(8,8,10,0.7))] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <NanoMark className="h-10 w-10" />
            </div>
            <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
              <p className="truncate text-base font-semibold text-white">Nano</p>
              <p className="truncate text-xs text-slate-500">Gestao financeira</p>
            </div>
          </div>

          <div className="px-2">
            <div className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(10,10,12,0.8),rgba(10,10,12,0.62))] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
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

            <div className="mt-4 rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(10,10,12,0.8),rgba(10,10,12,0.62))] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
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
                className={`mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-2xl px-3 text-sm transition hover:border-red-400/16 hover:bg-red-500/10 hover:text-red-100 group-hover/sidebar:justify-start ${dashboardClass.buttonGhost}`}
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
            className={`h-12 w-12 rounded-2xl ${dashboardTheme.panelSecondary} text-white`}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className={`w-[300px] border-r p-0 ${dashboardTheme.panel}`}>
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
