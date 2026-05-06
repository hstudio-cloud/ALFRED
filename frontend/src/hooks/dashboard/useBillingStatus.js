import { useCallback, useState } from "react";

import billingService from "../../services/billingService";

export default function useBillingStatus() {
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const loadBillingStatus = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setBillingStatus(null);
      return;
    }

    setBillingLoading(true);
    try {
      const response = await billingService.getSubscription(workspaceId);
      setBillingStatus(response);
    } catch (error) {
      console.error("Error loading billing status:", error);
      setBillingStatus(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  return {
    billingLoading,
    billingStatus,
    loadBillingStatus,
    setBillingStatus,
  };
}
