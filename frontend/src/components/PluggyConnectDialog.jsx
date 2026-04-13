import React, { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const resolvePluggyComponent = (module) =>
  module?.PluggyConnect || module?.default || null;

const PluggyConnectDialog = ({
  open,
  connectToken,
  updateItem,
  includeSandbox = false,
  onClose,
  onSuccess,
  onError,
}) => {
  const [PluggyConnectComponent, setPluggyConnectComponent] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!open) {
      setPluggyConnectComponent(null);
      return () => {
        mounted = false;
      };
    }

    import("react-pluggy-connect")
      .then((module) => {
        if (!mounted) return;
        setPluggyConnectComponent(() => resolvePluggyComponent(module));
      })
      .catch((error) => {
        if (!mounted) return;
        onError?.({
          message:
            error?.message ||
            "Nao foi possivel carregar o SDK do widget da Pluggy.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [open, onError]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="max-w-5xl border border-red-500/12 bg-[#090305] p-0 text-white">
        <DialogHeader className="border-b border-white/6 px-6 py-4">
          <DialogTitle>Conectar conta bancaria</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Finalize a autenticacao no widget da Pluggy para persistir a conexao
            e sincronizar as contas no Nano.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[640px] bg-[#090305]">
          {PluggyConnectComponent ? (
            <PluggyConnectComponent
              connectToken={connectToken}
              updateItem={updateItem}
              includeSandbox={includeSandbox}
              onClose={onClose}
              onSuccess={onSuccess}
              onError={onError}
            />
          ) : (
            <div className="flex min-h-[640px] items-center justify-center text-sm text-zinc-400">
              Carregando widget da Pluggy...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PluggyConnectDialog;
