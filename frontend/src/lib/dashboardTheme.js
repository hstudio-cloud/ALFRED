export const dashboardTheme = {
  layout: "dashboard-layout",
  panel: "dashboard-panel",
  panelSecondary: "dashboard-panel-secondary",
  panelAccent: "dashboard-panel-accent",
  borderSubtle: "dashboard-border-subtle",
  glow: "dashboard-glow",
  accent: "dashboard-accent",
  textPrimary: "dashboard-text-primary",
  textSecondary: "dashboard-text-secondary",
  success: "dashboard-text-success",
  danger: "dashboard-text-danger",
  warning: "dashboard-text-warning",
};

export const dashboardClass = {
  input: "dashboard-input",
  buttonPrimary: "dashboard-button-primary",
  buttonGhost: "dashboard-button-ghost",
};

export const resolveDashboardThemeMode = (value) =>
  value === "light" ? "light" : "dark";
