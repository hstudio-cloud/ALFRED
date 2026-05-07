import React from "react";

import NanoAssistantPage from "../../components/NanoAssistantPage";

export default function DashboardAssistant({
  bills,
  reminders,
  transactions,
  userName,
}) {
  return (
    <div className="h-full overflow-hidden">
      <NanoAssistantPage
        userName={userName}
        transactions={transactions}
        reminders={reminders}
        bills={bills}
      />
    </div>
  );
}
