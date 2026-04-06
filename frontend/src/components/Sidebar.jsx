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

const SidebarItem = ({ item, active, expanded, onClick }) => {
  const Icon = item.icon;

  const content = (
    <button
      type="button"
      onClick={onClick}
      className={`group/item flex h-11 w-full items-center gap-3 overflow-hidden rounded-2xl px-3 text-left transition-all duration-200 ${
        active
          ? "bg-red-500/12 text-red-50 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]"
          : "text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-100"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-red-500/12 text-red-200"
            : "bg-white/[0.03] text-zinc-500 group-hover/item:text-zinc-200"
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
        className="rounded-xl border border-white/8 bg-[#14090b] px-3 py-1.5 text-xs text-zinc-100"
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
      className={`px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-600 transition-all duration-200 ${
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
        <div className="flex h-full w-full flex-col gap-3 px-0 py-2 bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.12),_transparent_22%),linear-gradient(180deg,rgba(14,3,5,0.76)_0%,rgba(8,2,3,0.44)_100%)]">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <NanoMark className="h-10 w-10" />
            </div>
            <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
              <p className="truncate text-base font-semibold text-white">Nano</p>
              <p className="truncate text-xs text-zinc-500">Gestao financeira</p>
            </div>
          </div>

          <div className="px-1">
            <div className="rounded-2xl bg-red-500/[0.03] p-2 backdrop-blur-md">
              <div className="flex items-center justify-center group-hover/sidebar:justify-between px-2">
                <Building2 className="h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-xs font-medium text-zinc-100">
                    {workspaceName}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-600 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" />
              </div>

              <div className="mt-2 hidden group-hover/sidebar:block">
                <select
                  value={currentWorkspaceId}
                  onChange={(event) => onWorkspaceChange(event.target.value)}
                  className="h-10 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm text-zinc-100 outline-none transition focus:border-red-400/30"
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

            <div className="mt-4 rounded-2xl bg-red-500/[0.03] p-2 backdrop-blur-md">
              <div className="flex items-center justify-center gap-3 group-hover/sidebar:justify-start">
                <Avatar className="h-10 w-10 shrink-0 border border-red-400/18 bg-red-600/90">
                  <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.name || "Admin"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 text-sm text-zinc-300 transition hover:border-red-400/16 hover:bg-red-500/10 hover:text-red-100 group-hover/sidebar:justify-start"
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
            className="h-12 w-12 rounded-2xl border border-white/10 bg-[#08090f]/90 text-white hover:bg-[#0d1018]"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] border-r border-white/8 bg-[#08090f] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu do Nano</SheetTitle>
            <SheetDescription>Navegacao principal do sistema.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col px-4 py-4">
            <div className="flex items-center gap-3 border-b border-white/6 pb-4">
            <div className="flex h-10 w-10 items-center justify-center">
              <NanoMark className="h-10 w-10" />
            </div>
              <div>
                <p className="text-base font-semibold text-white">Nano</p>
                <p className="text-xs text-zinc-500">Gestao financeira</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/[0.025] p-3">
              <p className="truncate text-sm font-medium text-white">{props.workspaceName}</p>
              <select
                value={props.currentWorkspaceId}
                onChange={(event) => props.onWorkspaceChange(event.target.value)}
                className="mt-3 h-10 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm text-zinc-100"
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

            <div className="space-y-2 border-t border-white/6 pt-4">
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
                className="h-11 w-full justify-start rounded-2xl border border-red-500/14 text-red-100 hover:bg-red-500/10"
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
