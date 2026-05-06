import React from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { dashboardTheme } from "../../lib/dashboardTheme";

export default function DashboardHeader({
  ShieldCheckIcon,
  SparklesIcon,
  TopIconButton,
  SearchIcon,
  BellIcon,
  ThemeIcon,
  ScopeSwitcher,
  activeSectionMeta,
  billingDescription,
  billingHeadline,
  billingStatusLabels,
  dashboardThemeValue = dashboardTheme,
  navigate,
  setFinancialView,
  shouldShowBillingCta,
  subscriptionAccess,
  themeMode,
  toggleThemeMode,
  topNanoInsights,
  financialView,
}) {
  return (
    <div className="mb-6 space-y-4">
      {shouldShowBillingCta ? (
        <div
          className={`${dashboardThemeValue.panel} border-red-500/25 bg-gradient-to-r from-red-500/14 via-slate-950/78 to-slate-950/70 px-5 py-5 shadow-[0_18px_50px_rgba(127,29,29,0.24)]`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-red-200/75">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                <span>Assinatura pendente</span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                Ative seu plano para concluir a entrada no Nano
              </h3>
              <p className="mt-2 text-sm leading-7 text-zinc-300">
                {billingDescription}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-red-200/70">
                {billingHeadline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-amber-500/15 text-amber-200">
                {billingStatusLabels[subscriptionAccess?.status] || "sem assinatura ativa"}
              </Badge>
              <Button
                type="button"
                className="h-11 bg-white px-5 text-slate-950 hover:bg-slate-100"
                onClick={() => navigate("/billing")}
              >
                Assinar agora
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${dashboardThemeValue.panel} ${dashboardThemeValue.glow} px-5 py-4`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-red-200/65">
              {activeSectionMeta.label}
            </p>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-white">
              {activeSectionMeta.description}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ScopeSwitcher
              options={[
                { id: "general", label: "Geral" },
                { id: "personal", label: "Pessoal" },
                { id: "business", label: "Empresa" },
              ]}
              value={financialView}
              onChange={setFinancialView}
            />
            <TopIconButton icon={SearchIcon} />
            <TopIconButton icon={BellIcon} />
            <TopIconButton
              icon={ThemeIcon}
              onClick={toggleThemeMode}
              title={
                themeMode === "light"
                  ? "Modo claro ativo. Clique para mudar para o escuro"
                  : "Modo escuro ativo. Clique para mudar para o claro"
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topNanoInsights.map((item, index) => (
            <div
              key={`header-insight-${index}`}
              className={`${dashboardThemeValue.panelSecondary} px-4 py-3`}
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-red-200/70">
                <SparklesIcon className="h-3.5 w-3.5" />
                <span>{item.label || "Leitura do Nano"}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                {item.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
