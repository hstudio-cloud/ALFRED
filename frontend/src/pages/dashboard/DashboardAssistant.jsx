import React from "react";

import NanoAssistantPage from "../../components/NanoAssistantPage";

export default function DashboardAssistant({
  bills,
  financialView,
  navigate,
  onAfterMessage,
  reminders,
  setActiveSection,
  transactions,
  userName,
}) {
  return (
    <div className="h-full overflow-hidden">
      <NanoAssistantPage
        financialView={financialView}
        onAfterMessage={onAfterMessage}
        userName={userName}
        transactions={transactions}
        reminders={reminders}
        bills={bills}
        onNavigateSection={setActiveSection}
        onNavigateRoute={(route) => navigate(route)}
      />
    </div>
  );
}
