import { useCallback, useState } from "react";

import nanoOpsService from "../../services/nanoOpsService";

export default function useNanoOps({ toast }) {
  const [nanoOpsLoading, setNanoOpsLoading] = useState(false);
  const [nanoOpsStatus, setNanoOpsStatus] = useState(null);
  const [nanoOpsTasks, setNanoOpsTasks] = useState([]);
  const [nanoOpsConfirmations, setNanoOpsConfirmations] = useState([]);
  const [nanoOpsAutomations, setNanoOpsAutomations] = useState([]);
  const [nanoOpsAudits, setNanoOpsAudits] = useState([]);
  const [whatsappLinkPhone, setWhatsappLinkPhone] = useState("");
  const [whatsappLinkCode, setWhatsappLinkCode] = useState(null);

  const loadNanoOpsData = useCallback(async (workspaceId) => {
    if (!workspaceId) return;
    setNanoOpsLoading(true);
    try {
      const [
        statusResponse,
        tasksResponse,
        confirmationsResponse,
        automationsResponse,
        auditsResponse,
      ] = await Promise.all([
        nanoOpsService.getStatus(workspaceId),
        nanoOpsService.getTasks(workspaceId),
        nanoOpsService.getConfirmations(workspaceId),
        nanoOpsService.getAutomations(workspaceId),
        nanoOpsService.getAudits(workspaceId),
      ]);
      setNanoOpsStatus(statusResponse || null);
      setNanoOpsTasks(tasksResponse?.items || []);
      setNanoOpsConfirmations(confirmationsResponse?.items || []);
      setNanoOpsAutomations(automationsResponse?.items || []);
      setNanoOpsAudits(auditsResponse?.items || []);
      setWhatsappLinkPhone(statusResponse?.whatsapp_identity?.phone_number || "");
      setWhatsappLinkCode(statusResponse?.pending_link_code || null);
    } catch (error) {
      toast({
        title: "Erro ao carregar operação do Nano",
        description: "Não consegui carregar os dados de WhatsApp e automações agora.",
        variant: "destructive",
      });
    } finally {
      setNanoOpsLoading(false);
    }
  }, [toast]);

  return {
    loadNanoOpsData,
    nanoOpsAudits,
    nanoOpsAutomations,
    nanoOpsConfirmations,
    nanoOpsLoading,
    nanoOpsStatus,
    nanoOpsTasks,
    setNanoOpsAudits,
    setNanoOpsAutomations,
    setNanoOpsConfirmations,
    setNanoOpsStatus,
    setNanoOpsTasks,
    setWhatsappLinkCode,
    setWhatsappLinkPhone,
    whatsappLinkCode,
    whatsappLinkPhone,
  };
}
