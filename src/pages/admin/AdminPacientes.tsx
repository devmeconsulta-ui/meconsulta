import { useState } from "react";
import { Plus, Search, Users, UserPlus, Calendar, Phone, Eye, Edit, Trash2, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function AdminPacientes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
  });

  // Fetch pacientes
  const { data: pacientes, isLoading } = useQuery({
    queryKey: ["admin-pacientes", search, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("pacientes")
        .select("*, usuario:usuarios(email)")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,telefone.ilike.%${search}%`);
      }

      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case "7days":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "30days":
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case "90days":
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = {
    total: pacientes?.length || 0,
    comTelefone: pacientes?.filter((p) => p.telefone).length || 0,
    comCPF: pacientes?.filter((p) => p.cpf).length || 0,
    novosEsteMes: pacientes?.filter((p) => {
      const created = new Date(p.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  // Chart data - crescimento mensal
  const chartData = (() => {
    if (!pacientes) return [];
    const months: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, "MMM/yy", { locale: ptBR });
      months[key] = 0;
    }

    pacientes.forEach((p) => {
      const date = new Date(p.created_at);
      const key = format(date, "MMM/yy", { locale: ptBR });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([name, value]) => ({ name, pacientes: value }));
  })();

  // Create paciente
  const createPaciente = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: data.nome,
          email: data.email,
          tipo: "paciente",
          senha_hash: "123456",
          papel: "atendente",
        })
        .select()
        .single();

      if (userError) throw userError;

      const { error: pacienteError } = await supabase.from("pacientes").insert({
        usuario_id: usuario.id,
        nome: data.nome,
        cpf: data.cpf || null,
        telefone: data.telefone || null,
        data_nascimento: data.data_nascimento || null,
      });

      if (pacienteError) throw pacienteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pacientes"] });
      toast.success("Paciente cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ nome: "", email: "", cpf: "", telefone: "", data_nascimento: "" });
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete paciente
  const deletePaciente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pacientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pacientes"] });
      toast.success("Paciente excluído!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createPaciente.mutate(formData);
  };

  const clearFilters = () => {
    setSearch("");
    setDateFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7" />
            Pacientes
          </h1>
          <p className="text-muted-foreground">Gerencie os pacientes cadastrados na plataforma</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Maria da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="paciente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createPaciente.isPending}>
                {createPaciente.isPending ? "Cadastrando..." : "Cadastrar Paciente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos Este Mês</p>
                <p className="text-3xl font-bold text-green-600">{stats.novosEsteMes}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Telefone</p>
                <p className="text-3xl font-bold text-blue-600">{stats.comTelefone}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com CPF</p>
                <p className="text-3xl font-bold text-purple-600">{stats.comCPF}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Crescimento de Pacientes (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="pacientes"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorPacientes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, telefone..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os períodos</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
            </select>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes ({pacientes?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pacientes && pacientes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientes.map((paciente: any) => (
                    <TableRow key={paciente.id}>
                      <TableCell className="font-medium">{paciente.nome}</TableCell>
                      <TableCell>{paciente.usuario?.email || "—"}</TableCell>
                      <TableCell>{paciente.cpf || "—"}</TableCell>
                      <TableCell>{paciente.telefone || "—"}</TableCell>
                      <TableCell>
                        {paciente.data_nascimento
                          ? format(new Date(paciente.data_nascimento), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(paciente.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este paciente?")) {
                                deletePaciente.mutate(paciente.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum paciente encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
