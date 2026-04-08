import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import {
  CheckSquare,
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  LogOut,
  Building2,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STAGES = [
  { id: "todo", name: "A Fazer", color: "bg-slate-700" },
  { id: "in_progress", name: "Em Progresso", color: "bg-blue-600" },
  { id: "review", name: "Revisão", color: "bg-purple-600" },
  { id: "done", name: "Concluído", color: "bg-green-600" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa", color: "bg-gray-500" },
  { value: "medium", label: "Média", color: "bg-blue-500" },
  { value: "high", label: "Alta", color: "bg-orange-500" },
  { value: "urgent", label: "Urgente", color: "bg-red-500" },
];

const TasksKanban = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    stage: "todo",
  });

  const fetchTasks = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const response = await axios.get(
        `${API}/tasks-enhanced?workspace_id=${currentWorkspace.id}`,
      );
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar tarefas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, toast]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchTasks();
    }
  }, [currentWorkspace, fetchTasks]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStage = destination.droppableId;

    try {
      await axios.patch(
        `${API}/tasks-enhanced/${draggableId}/stage?workspace_id=${currentWorkspace.id}&stage=${newStage}`,
      );

      setTasks((prev) =>
        prev.map((task) =>
          task.id === draggableId ? { ...task, stage: newStage } : task,
        ),
      );

      toast({
        title: "Sucesso",
        description: "Tarefa movida com sucesso",
      });
    } catch (error) {
      console.error("Error updating task stage:", error);
      toast({
        title: "Erro",
        description: "Erro ao mover tarefa",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingTask) {
        await axios.put(
          `${API}/tasks-enhanced/${editingTask.id}?workspace_id=${currentWorkspace.id}`,
          formData,
        );
        toast({
          title: "Sucesso",
          description: "Tarefa atualizada com sucesso",
        });
      } else {
        await axios.post(
          `${API}/tasks-enhanced?workspace_id=${currentWorkspace.id}`,
          formData,
        );
        toast({
          title: "Sucesso",
          description: "Tarefa criada com sucesso",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao salvar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Tem certeza que deseja deletar esta tarefa?")) return;

    try {
      await axios.delete(
        `${API}/tasks-enhanced/${taskId}?workspace_id=${currentWorkspace.id}`,
      );
      toast({
        title: "Sucesso",
        description: "Tarefa deletada com sucesso",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar tarefa",
        variant: "destructive",
      });
    }
  };

  const openDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        stage: task.stage || "todo",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      stage: "todo",
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getTasksByStage = (stageId) => {
    return tasks.filter((task) => task.stage === stageId);
  };

  const getPriorityColor = (priority) => {
    const p = PRIORITIES.find((pr) => pr.value === priority);
    return p ? p.color : "bg-gray-500";
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-cyan-400 hover:text-cyan-300"
            >
              ← Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <CheckSquare className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Tarefas Kanban</h1>
            </div>
            {currentWorkspace && (
              <Badge
                variant="outline"
                className="bg-blue-500/10 border-blue-500/20 text-blue-400"
              >
                <Building2 className="w-3 h-3 mr-1" />
                {currentWorkspace.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => openDialog()}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
            <div className="text-right">
              <p className="text-sm text-white font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STAGES.map((stage) => (
                <div key={stage.id} className="flex flex-col">
                  <div
                    className={`${stage.color} rounded-t-lg px-4 py-3 flex items-center justify-between`}
                  >
                    <h3 className="font-semibold text-white">{stage.name}</h3>
                    <Badge variant="secondary" className="bg-white/20">
                      {getTasksByStage(stage.id).length}
                    </Badge>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 bg-slate-800/30 rounded-b-lg border border-slate-700/50 p-4 min-h-[500px] ${
                          snapshot.isDraggingOver ? "bg-slate-800/50" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          {getTasksByStage(stage.id).map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${
                                    snapshot.isDragging ? "opacity-50" : ""
                                  }`}
                                >
                                  <Card className="bg-slate-800/50 border-slate-700/50 p-4 hover:border-cyan-500/30 transition-all cursor-move">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-white text-sm flex-1">
                                        {task.title}
                                      </h4>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openDialog(task)}
                                          className="h-6 w-6 p-0 text-blue-400"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(task.id)}
                                          className="h-6 w-6 p-0 text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {task.description && (
                                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <Badge
                                        className={`${getPriorityColor(task.priority)} text-white text-xs`}
                                      >
                                        {
                                          PRIORITIES.find(
                                            (p) => p.value === task.priority,
                                          )?.label
                                        }
                                      </Badge>
                                      {task.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {new Date(
                                              task.due_date,
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Preencha os dados da tarefa
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="bg-slate-900/50 border-slate-700"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-slate-900/50 border-slate-700"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 text-white rounded-md"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Estágio</Label>
                <select
                  value={formData.stage}
                  onChange={(e) =>
                    setFormData({ ...formData, stage: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 text-white rounded-md"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
                {editingTask ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksKanban;
