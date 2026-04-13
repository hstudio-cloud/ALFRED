import React from "react";
import {
  CreditCard,
  FileUp,
  Landmark,
  Plus,
  Search,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { dashboardClass, dashboardTheme } from "../lib/dashboardTheme";

const fieldClass = dashboardClass.input;
const actionButtonClass = dashboardClass.buttonPrimary;

const Panel = ({ title, action, children }) => (
  <Card className={`${dashboardTheme.panel} p-6`}>
    {(title || action) && (
      <div className="mb-5 flex items-center justify-between gap-3">
        {title ? <h3 className="text-[18px] font-semibold text-white">{title}</h3> : <span />}
        {action}
      </div>
    )}
    {children}
  </Card>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className={`flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-red-500/12 bg-black/20 px-6 py-10 text-center`}>
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-200">
      <Icon className="h-7 w-7" />
    </div>
    <h4 className="mt-5 text-[28px] font-semibold text-white">{title}</h4>
    <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">{description}</p>
  </div>
);

const InfoRow = ({ title, subtitle, value }) => (
  <div className={`flex items-center justify-between gap-4 ${dashboardTheme.panelSecondary} px-4 py-4`}>
    <div>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
    <span className="text-right text-sm font-semibold text-white">{value}</span>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className={`${dashboardTheme.panelSecondary} p-4`}>
    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const pageHeader = (eyebrow, title, description, action) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
        {eyebrow}
      </p>
      <div>
        <h1 className="text-4xl font-semibold leading-tight text-white">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{description}</p>
      </div>
    </div>
    {action}
  </div>
);

export const BanksSection = ({
  currencyFormatter,
  scopeLabel,
  activeAccounts,
  statementImports,
  totalAccountBalance,
  accountForm,
  setAccountForm,
  submitAccount,
  openFinanceConnections = [],
  openFinanceAccounts = [],
  openFinanceSyncingId = null,
  onOpenFinanceConnect,
  onOpenFinanceSync,
}) => (
  <div className="space-y-6">
    {pageHeader(
      "Instituicoes Bancarias",
      "Gerencie contas bancarias e visualize saldos",
      "Contas pessoais e empresariais, saldo por conta e historico de extratos ficam na mesma leitura financeira do Nano.",
      <Button
        type="button"
        onClick={() =>
          document
            .getElementById("nano-account-form")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        className={`h-12 ${actionButtonClass}`}
      >
        <Plus className="mr-2 h-4.5 w-4.5" />
        Adicionar Conta
      </Button>,
    )}

    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="Nova conta" action={<span className="text-sm text-zinc-400">{scopeLabel}</span>}>
        <form id="nano-account-form" onSubmit={submitAccount} className="grid gap-3">
          <Input
            placeholder="Nome da conta"
            value={accountForm.name}
            onChange={(event) =>
              setAccountForm({ ...accountForm, name: event.target.value })
            }
            className={fieldClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Instituicao"
              value={accountForm.institution}
              onChange={(event) =>
                setAccountForm({ ...accountForm, institution: event.target.value })
              }
              className={fieldClass}
            />
            <select
              className={fieldClass}
              value={accountForm.account_type}
              onChange={(event) =>
                setAccountForm({ ...accountForm, account_type: event.target.value })
              }
            >
              <option value="checking">Conta corrente</option>
              <option value="savings">Conta poupanca</option>
              <option value="cash">Caixa</option>
              <option value="investment">Investimento</option>
              <option value="wallet">Carteira</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={fieldClass}
              value={accountForm.account_scope}
              onChange={(event) =>
                setAccountForm({ ...accountForm, account_scope: event.target.value })
              }
            >
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
            <Input
              type="number"
              step="0.01"
              placeholder="Saldo inicial"
              value={accountForm.initial_balance}
              onChange={(event) =>
                setAccountForm({ ...accountForm, initial_balance: event.target.value })
              }
              className={fieldClass}
            />
          </div>
          <Input
            type="color"
            value={accountForm.color}
            onChange={(event) =>
              setAccountForm({ ...accountForm, color: event.target.value })
            }
            className="h-12 rounded-2xl border border-red-500/12 bg-black/30 px-2"
          />
          <Button type="submit" className={`h-12 ${actionButtonClass}`}>
            Salvar conta
          </Button>
        </form>
      </Panel>

      <div className="space-y-6">
        <Panel
          title="Open Finance"
          action={
            <Button
              type="button"
              onClick={onOpenFinanceConnect}
              className={`h-11 ${actionButtonClass}`}
            >
              <Landmark className="mr-2 h-4.5 w-4.5" />
              Conectar banco
            </Button>
          }
        >
          {openFinanceConnections.length ? (
            <div className="space-y-3">
              {openFinanceConnections.map((connection) => (
                <div
                  key={connection.id}
                  className={`flex items-center justify-between gap-3 ${dashboardTheme.panelSecondary} px-4 py-3`}
                >
                  <div>
                    <p className="font-semibold text-white">
                      {connection.institution_name || "Instituicao conectada"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                      {connection.provider} • {connection.status}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => onOpenFinanceSync?.(connection)}
                    className="h-9 rounded-full border border-white/12 bg-white/[0.04] px-3 text-xs text-zinc-200 hover:bg-white/[0.08]"
                    disabled={openFinanceSyncingId === connection.id}
                  >
                    {openFinanceSyncingId === connection.id ? "Sincronizando..." : "Sincronizar"}
                  </Button>
                </div>
              ))}
              <p className="text-xs text-zinc-500">
                Contas importadas: {openFinanceAccounts.length}
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Landmark}
              title="Nenhuma conexão Open Finance"
              description="Conecte seu banco via agregador (Pluggy/Belvo) para sincronizar contas e transações automaticamente."
            />
          )}
        </Panel>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Contas ativas" value={String(activeAccounts.length)} />
          <MiniStat
            label="Saldo consolidado"
            value={currencyFormatter.format(totalAccountBalance)}
          />
          <MiniStat
            label="Extratos importados"
            value={String(statementImports.length)}
          />
        </div>

        <Panel title="Contas rastreadas">
          {activeAccounts.length ? (
            <div className="space-y-3">
              {activeAccounts.map((account) => (
                <InfoRow
                  key={account.id}
                  title={account.name}
                  subtitle={`${account.institution || "Instituicao nao informada"} • ${
                    account.account_scope === "personal" ? "Pessoal" : "Empresa"
                  }`}
                  value={currencyFormatter.format(account.balance || 0)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Landmark}
              title="Nenhuma conta cadastrada"
              description="Adicione sua primeira conta para separar melhor o caixa pessoal e empresarial."
            />
          )}
        </Panel>

        <Panel title="Extratos recentes">
          {statementImports.length ? (
            <div className="space-y-3">
              {statementImports.slice(0, 5).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.file_name}
                  subtitle={`${item.file_type} • ${item.status}`}
                  value={`${item.row_count || 0} linhas`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileUp}
              title="Nenhum extrato importado"
              description="Quando voce importar CSV, XLSX ou PDF, o Nano mostra a fila de leitura aqui."
            />
          )}
        </Panel>
      </div>
    </div>
  </div>
);

export const CardsSection = ({
  currencyFormatter,
  scopeLabel,
  activeAccounts,
  activeCards,
  totalCardLimit,
  totalCardInvoice,
  cardTransactions,
  cardLookup,
  cardForm,
  setCardForm,
  submitCard,
}) => (
  <div className="space-y-6">
    {pageHeader(
      "Cartoes de Credito",
      "Gerencie seus cartoes, limites e faturas",
      "Limite, fatura, vencimento e parcelamentos entram de forma nativa na leitura financeira do Nano.",
      <Button
        type="button"
        onClick={() =>
          document
            .getElementById("nano-card-form")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        className={`h-12 ${actionButtonClass}`}
      >
        <Plus className="mr-2 h-4.5 w-4.5" />
        Adicionar Cartao
      </Button>,
    )}

    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="Novo cartao" action={<span className="text-sm text-zinc-400">{scopeLabel}</span>}>
        <form id="nano-card-form" onSubmit={submitCard} className="grid gap-3">
          <Input
            placeholder="Nome do cartao"
            value={cardForm.name}
            onChange={(event) =>
              setCardForm({ ...cardForm, name: event.target.value })
            }
            className={fieldClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Instituicao"
              value={cardForm.institution}
              onChange={(event) =>
                setCardForm({ ...cardForm, institution: event.target.value })
              }
              className={fieldClass}
            />
            <Input
              placeholder="Bandeira"
              value={cardForm.brand}
              onChange={(event) =>
                setCardForm({ ...cardForm, brand: event.target.value })
              }
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={fieldClass}
              value={cardForm.account_scope}
              onChange={(event) =>
                setCardForm({ ...cardForm, account_scope: event.target.value })
              }
            >
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
            <select
              className={fieldClass}
              value={cardForm.linked_account_id}
              onChange={(event) =>
                setCardForm({
                  ...cardForm,
                  linked_account_id: event.target.value,
                })
              }
            >
              <option value="">Sem conta vinculada</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              type="number"
              step="0.01"
              placeholder="Limite"
              value={cardForm.limit_amount}
              onChange={(event) =>
                setCardForm({ ...cardForm, limit_amount: event.target.value })
              }
              className={fieldClass}
            />
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="Fechamento"
              value={cardForm.closing_day}
              onChange={(event) =>
                setCardForm({ ...cardForm, closing_day: event.target.value })
              }
              className={fieldClass}
            />
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="Vencimento"
              value={cardForm.due_day}
              onChange={(event) =>
                setCardForm({ ...cardForm, due_day: event.target.value })
              }
              className={fieldClass}
            />
          </div>
          <Input
            type="color"
            value={cardForm.color}
            onChange={(event) =>
              setCardForm({ ...cardForm, color: event.target.value })
            }
            className="h-12 rounded-2xl border border-red-500/12 bg-black/30 px-2"
          />
          <Button type="submit" className={`h-12 ${actionButtonClass}`}>
            Salvar cartao
          </Button>
        </form>
      </Panel>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Cartoes ativos" value={String(activeCards.length)} />
          <MiniStat
            label="Limite total"
            value={currencyFormatter.format(totalCardLimit)}
          />
          <MiniStat
            label="Fatura projetada"
            value={currencyFormatter.format(totalCardInvoice)}
          />
        </div>

        <Panel title="Portifolio de cartoes">
          {activeCards.length ? (
            <div className="space-y-3">
              {activeCards.map((card) => (
                <InfoRow
                  key={card.id}
                  title={card.name}
                  subtitle={`${card.institution || "Instituicao nao informada"} • fechamento dia ${card.closing_day} • vence dia ${card.due_day}`}
                  value={`${currencyFormatter.format(card.invoice_amount || 0)} / ${currencyFormatter.format(card.limit_amount || 0)}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="Nenhum cartao cadastrado"
              description="Cadastre cartoes para o Nano entender melhor fatura, limite e compras parceladas."
            />
          )}
        </Panel>

        <Panel title="Compras no credito">
          {cardTransactions.length ? (
            <div className="space-y-3">
              {cardTransactions.slice(0, 5).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.description || item.category}
                  subtitle={`${item.category} • ${new Date(item.date).toLocaleDateString("pt-BR")} ${
                    item.card_id && cardLookup[item.card_id]
                      ? `• ${cardLookup[item.card_id].name}`
                      : ""
                  }`}
                  value={currencyFormatter.format(item.amount)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="Sem compras no cartao"
              description="Assim que voce lancar compras no credito, o Nano monta a leitura da fatura aqui."
            />
          )}
        </Panel>
      </div>
    </div>
  </div>
);

export const ReportsSection = ({
  currencyFormatter,
  scopeLabel,
  reportPeriod,
  refreshReport,
  statementFile,
  setStatementFile,
  uploadStatement,
  uploadingStatement,
  reportKpis,
  trendData,
  cashflowItems,
  categoryReport,
  accountReport,
  statementImportResult,
  statementImports,
  reportMessage,
  openBills,
}) => (
  <div className="space-y-6">
    {pageHeader(
      "Relatorios",
      "Analises detalhadas e demonstrativos financeiros",
      "Receitas, despesas, fluxo de caixa e desempenho por conta saem das rotas novas que o Nano usa para analisar e agir.",
      <Button
        type="button"
        variant="outline"
        className="h-12 rounded-2xl border-[#eadfd6] bg-white px-5 text-[#4b4039] hover:bg-[#fbf4ef]"
      >
        Exportar PDF
      </Button>,
    )}

    <Panel>
      <div className="grid gap-3 xl:grid-cols-5">
        {["7d", "30d", "90d", "12m"].map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => refreshReport(period)}
            className={`h-12 rounded-2xl border px-4 text-sm font-medium transition ${
              reportPeriod === period
                ? "border-[#f0cfd1] bg-[#f9e8e8] text-[#991b1b]"
                : "border-[#eadfd6] bg-white text-[#4b4039] hover:bg-[#fbf4ef]"
            }`}
          >
            {period}
          </button>
        ))}
        <label className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-[#e2d4cb] bg-[#fffaf6] px-4 text-sm text-[#85776e]">
          <input
            type="file"
            accept=".csv,.xls,.xlsx,.pdf"
            onChange={(event) => setStatementFile(event.target.files?.[0] || null)}
            className="hidden"
          />
          Escolher extrato
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={uploadStatement}
          disabled={!statementFile || uploadingStatement}
          className={`h-12 ${actionButtonClass}`}
        >
          {uploadingStatement ? "Lendo arquivo..." : "Importar extrato"}
        </Button>
        <span className="inline-flex h-11 items-center rounded-2xl border border-red-500/12 bg-black/25 px-4 text-sm font-medium text-zinc-300">
          {scopeLabel}
        </span>
      </div>
    </Panel>

    <div className="grid gap-4 xl:grid-cols-4">
      <MiniStat
        label="Balanco do periodo"
        value={currencyFormatter.format(reportKpis.profit_or_loss || 0)}
      />
      <MiniStat
        label="Receitas do periodo"
        value={currencyFormatter.format(reportKpis.total_income || 0)}
      />
      <MiniStat
        label="Despesas do periodo"
        value={currencyFormatter.format(reportKpis.total_expenses || 0)}
      />
      <MiniStat
        label="Media mensal"
        value={currencyFormatter.format(reportKpis.average_monthly || 0)}
      />
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <Panel title="Receitas x despesas">
        <div className="space-y-5">
          <div className="h-[280px] rounded-[24px] border border-red-500/10 bg-black/20 p-4">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              {Array.from({ length: 5 }).map((_, index) => (
                <line
                  key={index}
                  x1="0"
                  y1={index * 25}
                  x2="100"
                  y2={index * 25}
                  stroke="#2a1014"
                  strokeDasharray="1.5 2"
                  strokeWidth="0.4"
                />
              ))}
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.2"
                points={trendData
                  .map((item, index) => {
                    const maxValue = Math.max(
                      ...trendData.flatMap((entry) => [entry.income, entry.expense]),
                      1,
                    );
                    const x = (index / Math.max(trendData.length - 1, 1)) * 100;
                    const y = 100 - (item.income / maxValue) * 85;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              <polyline
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.2"
                points={trendData
                  .map((item, index) => {
                    const maxValue = Math.max(
                      ...trendData.flatMap((entry) => [entry.income, entry.expense]),
                      1,
                    );
                    const x = (index / Math.max(trendData.length - 1, 1)) * 100;
                    const y = 100 - (item.expense / maxValue) * 85;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-5 text-sm">
              <span className="flex items-center gap-2 text-[#166534]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                Receitas
              </span>
              <span className="flex items-center gap-2 text-[#b91c1c]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                Despesas
              </span>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              {trendData.map((item) => (
                <span key={item.key}>{item.label}</span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Fluxo de caixa futuro">
        <div className="space-y-4">
          {cashflowItems.map((item) => (
            <div
              key={item.days}
              className="rounded-[24px] border border-red-500/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Projecao em {item.days} dias
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Entradas {currencyFormatter.format(item.projected_income || item.incomes || 0)} •
                    Saidas {currencyFormatter.format(item.projected_expenses || item.expenses || 0)}
                  </p>
                </div>
                <span
                  className={`text-lg font-semibold ${
                    (item.projected_balance || item.balance || 0) < 0
                      ? "text-red-300"
                      : "text-emerald-300"
                  }`}
                >
                  {currencyFormatter.format(item.projected_balance || item.balance || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.9fr_0.8fr_0.9fr]">
      <Panel title="Por categoria">
        {categoryReport.length ? (
          <div className="space-y-3">
            {categoryReport.slice(0, 6).map((item) => (
              <InfoRow
                key={item.category}
                title={item.category}
                subtitle={`Receitas ${currencyFormatter.format(item.income || 0)} • Despesas ${currencyFormatter.format(item.expenses || 0)}`}
                value={currencyFormatter.format(item.balance || 0)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={TrendingDown}
            title="Sem categorias no periodo"
            description="Assim que houver lancamentos, o Nano mostra quais categorias mais pesam no caixa."
          />
        )}
      </Panel>

      <Panel title="Por conta">
        {accountReport.length ? (
          <div className="space-y-3">
            {accountReport.slice(0, 6).map((item) => (
              <InfoRow
                key={item.account}
                title={item.account}
                subtitle={`${item.transactions_count} movimentacoes`}
                value={currencyFormatter.format(item.balance || 0)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Landmark}
            title="Sem leitura por conta"
            description="Vincule movimentacoes a contas para o Nano montar o comparativo por conta."
          />
        )}
      </Panel>

      <Panel title="Importacoes recentes">
        {statementImportResult?.preview_rows?.length ? (
          <div className="space-y-3">
            {statementImportResult.preview_rows.slice(0, 4).map((row, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-red-500/10 bg-black/20 p-4"
              >
                {Object.entries(row)
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <div key={key} className="text-xs leading-6 text-zinc-400">
                      <span className="font-semibold text-zinc-200">{key}:</span>{" "}
                      {String(value || "-")}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : statementImports.length ? (
          <div className="space-y-3">
            {statementImports.slice(0, 5).map((item) => (
              <InfoRow
                key={item.id}
                title={item.file_name}
                subtitle={`${item.file_type} • ${item.status}`}
                value={`${item.row_count || 0} linhas`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileUp}
            title="Nenhum extrato importado"
            description="CSV, XLS, XLSX e PDF aparecem aqui assim que entrarem na fila do Nano."
          />
        )}
      </Panel>
    </div>

    <Panel title="Leitura do Nano">
      <div className="space-y-4 text-sm leading-7 text-zinc-300">
        <p>{reportMessage}</p>
        <div className="rounded-[24px] border border-red-500/10 bg-black/20 p-4 text-zinc-300">
          Transacoes no periodo: {reportKpis.transactions_count || 0}. Contas a
          pagar abertas: {openBills.filter((bill) => bill.type !== "receivable").length}. Contas
          a receber abertas: {openBills.filter((bill) => bill.type === "receivable").length}.
        </div>
      </div>
    </Panel>
  </div>
);
