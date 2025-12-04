import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  User, 
  Download,
  Plus,
  Pill,
  Heart,
  Activity,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data - in production would come from Supabase
const historicoMedico = {
  alergias: ["Dipirona", "Penicilina"],
  condicoes: ["Hipertensão", "Diabetes Tipo 2"],
  medicamentos: [
    { nome: "Losartana 50mg", frequencia: "1x ao dia" },
    { nome: "Metformina 500mg", frequencia: "2x ao dia" },
  ],
};

const consultasAnteriores = [
  {
    id: "1",
    data: new Date(Date.now() - 30 * 86400000).toISOString(),
    medico: "Dr. João Silva",
    especialidade: "Cardiologia",
    diagnostico: "Check-up cardiovascular",
    prescricao: true,
  },
  {
    id: "2",
    data: new Date(Date.now() - 90 * 86400000).toISOString(),
    medico: "Dra. Maria Santos",
    especialidade: "Endocrinologia",
    diagnostico: "Acompanhamento diabetes",
    prescricao: true,
  },
];

export default function PacienteHistorico() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Histórico Médico</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu histórico de saúde e consultas
          </p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Exportar histórico
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{historicoMedico.alergias.length}</p>
                <p className="text-xs text-muted-foreground">Alergias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{historicoMedico.condicoes.length}</p>
                <p className="text-xs text-muted-foreground">Condições</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{historicoMedico.medicamentos.length}</p>
                <p className="text-xs text-muted-foreground">Medicamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{consultasAnteriores.length}</p>
                <p className="text-xs text-muted-foreground">Consultas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações de Saúde */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Informações de Saúde
            </CardTitle>
            <CardDescription>
              Mantenha suas informações médicas atualizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alergias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Alergias</h4>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {historicoMedico.alergias.map((alergia, i) => (
                  <Badge key={i} variant="destructive" className="px-3 py-1">
                    {alergia}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Condições */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Condições de Saúde</h4>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {historicoMedico.condicoes.map((condicao, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1">
                    {condicao}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Medicamentos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Medicamentos em Uso</h4>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {historicoMedico.medicamentos.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Pill className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{med.nome}</p>
                        <p className="text-xs text-muted-foreground">{med.frequencia}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultas Anteriores */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Consultas Anteriores
            </CardTitle>
            <CardDescription>
              Histórico das suas consultas realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultasAnteriores.map((consulta) => (
                <div
                  key={consulta.id}
                  className="p-4 bg-muted/50 rounded-xl border border-border/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{consulta.medico}</p>
                      <p className="text-sm text-muted-foreground">
                        {consulta.especialidade}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(consulta.data), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {consulta.prescricao && (
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-1" />
                        Receita
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-background rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Diagnóstico:</span>{" "}
                      {consulta.diagnostico}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="card-shadow border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Mantenha seu histórico atualizado</h3>
              <p className="text-muted-foreground mt-1">
                Um histórico médico completo ajuda os profissionais de saúde a oferecer
                um atendimento mais preciso e personalizado. Adicione informações sobre
                alergias, condições de saúde e medicamentos em uso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
