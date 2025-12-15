import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Building, Video, Globe, Users } from "lucide-react";

interface ClinicaContext {
  clinicaData: any;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  medico_id: string;
  medicos?: { nome: string };
}

interface LocalAgrupado {
  nome_local: string;
  tipo_atendimento: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  medicos: Array<{ id: string; nome: string; localId: string; ativo: boolean }>;
  ativos: number;
  inativos: number;
}

export default function ClinicaLocais() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocais();
  }, [clinicaData]);

  async function fetchLocais() {
    if (!clinicaData?.id) return;

    const { data } = await supabase
      .from("locais_atendimento")
      .select("*, medicos(nome)")
      .eq("clinica_id", clinicaData.id)
      .order("nome_local", { ascending: true });

    setLocais(data || []);
    setLoading(false);
  }

  // Agrupa locais por nome_local + endereco (mesmo endereço físico = um card só)
  const locaisAgrupados = useMemo(() => {
    const grupos: Record<string, LocalAgrupado> = {};

    locais.forEach((local) => {
      // Chave única: nome do local + endereço
      const chave = `${local.nome_local}-${local.endereco || ""}-${local.cidade || ""}`;
      
      if (!grupos[chave]) {
        grupos[chave] = {
          nome_local: local.nome_local,
          tipo_atendimento: local.tipo_atendimento,
          endereco: local.endereco,
          cidade: local.cidade,
          estado: local.estado,
          cep: local.cep,
          observacoes: local.observacoes,
          medicos: [],
          ativos: 0,
          inativos: 0,
        };
      }

      grupos[chave].medicos.push({
        id: local.medico_id,
        nome: local.medicos?.nome || "Médico",
        localId: local.id,
        ativo: local.ativo,
      });

      if (local.ativo) {
        grupos[chave].ativos++;
      } else {
        grupos[chave].inativos++;
      }
    });

    return Object.values(grupos);
  }, [locais]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "presencial":
        return <Building className="w-5 h-5" />;
      case "online":
        return <Video className="w-5 h-5" />;
      case "hibrido":
        return <Globe className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "presencial":
        return "Presencial";
      case "online":
        return "Online";
      case "hibrido":
        return "Híbrido";
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Locais de Atendimento</h2>
        <p className="text-muted-foreground">
          Gerencie os endereços da clínica e veja os médicos associados
        </p>
      </div>

      {locaisAgrupados.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum local de atendimento cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os locais podem ser cadastrados na aba de gerenciamento de médicos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locaisAgrupados.map((local, index) => (
            <Card key={index} className="card-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      local.tipo_atendimento === "online" 
                        ? "bg-green-500/10 text-green-500" 
                        : local.tipo_atendimento === "hibrido"
                        ? "bg-purple-500/10 text-purple-500"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {getTipoIcon(local.tipo_atendimento)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{local.nome_local}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getTipoLabel(local.tipo_atendimento)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {local.medicos.length} médico{local.medicos.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      
                      {local.endereco && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {local.endereco}
                          {local.cidade && `, ${local.cidade}`}
                          {local.estado && ` - ${local.estado}`}
                        </p>
                      )}
                      
                      {local.observacoes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {local.observacoes}
                        </p>
                      )}

                      {/* Lista de médicos associados */}
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Médicos neste local:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {local.medicos.map((medico) => (
                            <Badge 
                              key={medico.localId} 
                              variant={medico.ativo ? "default" : "secondary"}
                              className={`text-xs ${!medico.ativo ? "opacity-60" : ""}`}
                            >
                              Dr(a). {medico.nome}
                              {!medico.ativo && " (inativo)"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-green-500">
                      {local.ativos} ativo{local.ativos !== 1 ? "s" : ""}
                    </span>
                    {local.inativos > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {local.inativos} inativo{local.inativos !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
