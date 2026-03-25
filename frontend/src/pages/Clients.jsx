import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { 
  Users, 
  Search, 
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileText,
  Filter,
  LogOut,
  Building2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Clients = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    document: '',
    notes: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipcode: ''
    }
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchClients();
    }
  }, [currentWorkspace, searchTerm, statusFilter]);

  const fetchClients = async () => {
    if (!currentWorkspace) return;
    
    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axios.get(`${API}/clients?${params}`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao buscar clientes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        // Update
        await axios.put(
          `${API}/clients/${editingClient.id}?workspace_id=${currentWorkspace.id}`,
          formData
        );
        toast({
          title: 'Sucesso',
          description: 'Cliente atualizado com sucesso'
        });
      } else {
        // Create
        await axios.post(
          `${API}/clients?workspace_id=${currentWorkspace.id}`,
          formData
        );
        toast({
          title: 'Sucesso',
          description: 'Cliente criado com sucesso'
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao salvar cliente',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja deletar este cliente?')) return;
    
    try {
      await axios.delete(`${API}/clients/${clientId}?workspace_id=${currentWorkspace.id}`);
      toast({
        title: 'Sucesso',
        description: 'Cliente deletado com sucesso'
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar cliente',
        variant: 'destructive'
      });
    }
  };

  const openDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        document: client.document || '',
        notes: client.notes || '',
        address: client.address || { street: '', city: '', state: '', zipcode: '' }
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      document: '',
      notes: '',
      address: { street: '', city: '', state: '', zipcode: '' }
    });
  };

  return (
    <div className=\"min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950\">
      {/* Header */}
      <header className=\"border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10\">
        <div className=\"max-w-7xl mx-auto px-6 py-4 flex items-center justify-between\">
          <div className=\"flex items-center gap-4\">
            <Button
              variant=\"ghost\"
              onClick={() => navigate('/dashboard')}
              className=\"text-cyan-400 hover:text-cyan-300\"
            >
              ← Dashboard
            </Button>
            <div className=\"flex items-center gap-3\">
              <Users className=\"w-6 h-6 text-cyan-400\" />
              <h1 className=\"text-2xl font-bold text-white\">Clientes</h1>
            </div>
            {currentWorkspace && (
              <Badge variant=\"outline\" className=\"bg-blue-500/10 border-blue-500/20 text-blue-400\">
                <Building2 className=\"w-3 h-3 mr-1\" />
                {currentWorkspace.name}
              </Badge>
            )}
          </div>
          <div className=\"flex items-center gap-4\">
            <div className=\"text-right\">
              <p className=\"text-sm text-white font-medium\">{user?.name}</p>
              <p className=\"text-xs text-slate-400\">{user?.email}</p>
            </div>
            <Button
              variant=\"ghost\"
              size=\"sm\"
              onClick={logout}
              className=\"text-slate-400 hover:text-white\"
            >
              <LogOut className=\"w-4 h-4\" />
            </Button>
          </div>
        </div>
      </header>

      <div className=\"max-w-7xl mx-auto px-6 py-8\">
        {/* Actions Bar */}
        <div className=\"flex flex-col md:flex-row gap-4 mb-8\">
          <div className=\"flex-1 relative\">
            <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400\" />
            <Input
              placeholder=\"Buscar por nome, email ou telefone...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=\"pl-10 bg-slate-800/30 border-slate-700 text-white\"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className=\"px-4 py-2 bg-slate-800/30 border border-slate-700 text-white rounded-md\"
          >
            <option value=\"\">Todos os status</option>
            <option value=\"active\">Ativo</option>
            <option value=\"inactive\">Inativo</option>
            <option value=\"blocked\">Bloqueado</option>
          </select>

          <Button
            onClick={() => openDialog()}
            className=\"bg-cyan-500 hover:bg-cyan-600 text-white\"
          >
            <Plus className=\"w-4 h-4 mr-2\" />
            Novo Cliente
          </Button>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className=\"text-center text-slate-400 py-12\">Carregando...</div>
        ) : clients.length === 0 ? (
          <Card className=\"bg-slate-800/30 border-slate-700/50 p-12 text-center\">
            <Users className=\"w-16 h-16 mx-auto mb-4 text-slate-600\" />
            <p className=\"text-slate-400 mb-4\">Nenhum cliente encontrado</p>
            <Button onClick={() => openDialog()} className=\"bg-cyan-500 hover:bg-cyan-600\">
              <Plus className=\"w-4 h-4 mr-2\" />
              Criar Primeiro Cliente
            </Button>
          </Card>
        ) : (
          <div className=\"grid md:grid-cols-2 lg:grid-cols-3 gap-6\">
            {clients.map((client) => (
              <Card key={client.id} className=\"bg-slate-800/30 border-slate-700/50 p-6 hover:border-cyan-500/30 transition-all\">
                <div className=\"flex items-start justify-between mb-4\">
                  <div className=\"flex-1\">
                    <h3 className=\"text-lg font-semibold text-white mb-1\">{client.name}</h3>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className=\"text-xs\">
                      {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                    </Badge>
                  </div>
                  <div className=\"flex gap-2\">
                    <Button
                      variant=\"ghost\"
                      size=\"sm\"
                      onClick={() => openDialog(client)}
                      className=\"text-blue-400 hover:text-blue-300\"
                    >
                      <Edit2 className=\"w-4 h-4\" />
                    </Button>
                    <Button
                      variant=\"ghost\"
                      size=\"sm\"
                      onClick={() => handleDelete(client.id)}
                      className=\"text-red-400 hover:text-red-300\"
                    >
                      <Trash2 className=\"w-4 h-4\" />
                    </Button>
                  </div>
                </div>

                <div className=\"space-y-2 text-sm\">
                  {client.email && (
                    <div className=\"flex items-center gap-2 text-slate-400\">
                      <Mail className=\"w-4 h-4\" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className=\"flex items-center gap-2 text-slate-400\">
                      <Phone className=\"w-4 h-4\" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.document && (
                    <div className=\"flex items-center gap-2 text-slate-400\">
                      <FileText className=\"w-4 h-4\" />
                      <span>{client.document}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className=\"mt-4 pt-4 border-t border-slate-700/50\">
                    <p className=\"text-xs text-slate-500 line-clamp-2\">{client.notes}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className=\"bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto\">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription className=\"text-slate-400\">
              Preencha os dados do cliente
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className=\"space-y-4\">
            <div className=\"grid md:grid-cols-2 gap-4\">
              <div>
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className=\"bg-slate-900/50 border-slate-700\"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className=\"bg-slate-900/50 border-slate-700\"
                />
              </div>
            </div>

            <div className=\"grid md:grid-cols-2 gap-4\">
              <div>
                <Label>Email</Label>
                <Input
                  type=\"email\"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className=\"bg-slate-900/50 border-slate-700\"
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.document}
                  onChange={(e) => setFormData({...formData, document: e.target.value})}
                  className=\"bg-slate-900/50 border-slate-700\"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className=\"bg-slate-900/50 border-slate-700\"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"ghost\" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type=\"submit\" className=\"bg-cyan-500 hover:bg-cyan-600\">
                {editingClient ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
