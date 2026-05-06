import { useState } from "react";

export default function useOpenFinanceData() {
  const [openFinanceAccounts, setOpenFinanceAccounts] = useState([]);
  const [openFinanceConnections, setOpenFinanceConnections] = useState([]);
  const [openFinanceSyncingId, setOpenFinanceSyncingId] = useState(null);
  const [pluggyWidgetSession, setPluggyWidgetSession] = useState(null);

  return {
    openFinanceAccounts,
    openFinanceConnections,
    openFinanceSyncingId,
    pluggyWidgetSession,
    setOpenFinanceAccounts,
    setOpenFinanceConnections,
    setOpenFinanceSyncingId,
    setPluggyWidgetSession,
  };
}
