import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Building2,
  Edit2,
  FileText,
  LogOut,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { API_BASE_URL } from "../config/env";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const API = API_BASE_URL;

const fieldClass =
  "bg-black/35 border-red-500/15 text-white placeholder:text-red-100/35 focus:border-red-400/50";

const Clients = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    document: "",
    notes: "",
  });

  const fetchClients = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);

      const response = await axios.get(`${API}/clients?${params}`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, searchTerm, statusFilter, toast]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchClients();
    }
  }, [currentWorkspace, fetchClients]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingClient) {
        await axios.put(
          `${API}/clients/${editingClient.id}?workspace_id=${currentWorkspace.id}`,
          formData,
        );
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso",
        });
      } else {
        await axios.post(
          `${API}/clients?workspace_id=${currentWorkspace.id}`,
          formData,
        );
        toast({
          title: "Sucesso",
          description: "Cliente criado com sucesso",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error("Error saving client:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao salvar cliente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm("Tem certeza que deseja deletar este cliente?")) return;

    try {
      await axios.delete(
        `${API}/clients/${clientId}?workspace_id=${currentWorkspace.id}`,
      );
      toast({
        title: "Sucesso",
        description: "Cliente deletado com sucesso",
      });
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar cliente",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      document: "",
      notes: "",
    });
  };

  const openDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        document: client.document || "",
        notes: client.notes || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#080001] flex items-center justify-center">
        <div className="text-white text-xl">Carregando workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.18),transparent_34%),linear-gradient(180deg,#080001_0%,#0d0204_48%,#160407_100%)] text-white">
      <header className="border-b border-red-500/10 bg-black/35 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-red-200/80 hover:text-red-100 hover:bg-red-500/10"
            >
              &lt;- Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-red-300" />
              <h1 className="text-2xl font-bold text-white">Clientes</h1>
            </div>
            <Badge
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-200"
            >
              <Building2 className="w-3 h-3 mr-1" />
              {currentWorkspace.name}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white font-medium">{user?.name}</p>
              <p className="text-xs text-red-100/45">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-100/50 hover:text-white hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-100/40" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`pl-10 ${fieldClass}`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 bg-black/30 border border-red-500/15 text-white rounded-md focus:border-red-400/50 outline-none"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="blocked">Bloqueado</option>
          </select>

          <Button
            onClick={() => openDialog()}
            className="bg-red-600 hover:bg-red-500 text-white shadow-[0_12px_30px_rgba(220,38,38,0.25)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-red-100/50 py-12">Carregando...</div>
        ) : clients.length === 0 ? (
          <Card className="bg-black/30 border-red-500/15 p-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <Users className="w-16 h-16 mx-auto mb-4 text-red-100/25" />
            <p className="text-red-100/55 mb-4">Nenhum cliente encontrado</p>
            <Button
              onClick={() => openDialog()}
              className="bg-red-600 hover:bg-red-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Cliente
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="bg-black/30 border-red-500/15 p-6 hover:border-red-400/35 transition-all shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {client.name}
                    </h3>
                    <Badge className="text-xs bg-red-500/15 text-red-100 border border-red-500/20">
                      {client.status === "active"
                        ? "Ativo"
                        : client.status === "inactive"
                          ? "Inativo"
                          : "Bloqueado"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(client)}
                      className="text-red-200/75 hover:text-red-100 hover:bg-red-500/10"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center gap-2 text-red-100/55">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-red-100/55">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.document && (
                    <div className="flex items-center gap-2 text-red-100/55">
                      <FileText className="w-4 h-4" />
                      <span>{client.document}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-red-500/10">
                    <p className="text-xs text-red-100/40 line-clamp-2">
                      {client.notes}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#100407] border-red-500/15 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription className="text-red-100/50">
              Preencha os dados do cliente
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({ ...formData, phone: event.target.value })
                  }
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData({ ...formData, email: event.target.value })
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.document}
                  onChange={(event) =>
                    setFormData({ ...formData, document: event.target.value })
                  }
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(event) =>
                  setFormData({ ...formData, notes: event.target.value })
                }
                className={fieldClass}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-500">
                {editingClient ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
