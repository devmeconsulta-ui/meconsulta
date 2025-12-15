import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Building, Edit, Check, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ClinicaContext {
  clinicaData: any;
}

export default function ClinicaLocais() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    endereco_principal: clinicaData?.endereco_principal || "",
    cidade: clinicaData?.cidade || "",
    estado: clinicaData?.estado || "",
  });

  // Buscar médicos vinculados
  const { data: medicos } = useQuery({
    queryKey: ["clinica-medicos-vinculados", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("clinicas_medicos")
        .select("medico_id, ativo, medicos(id, nome, especialidade, foto_url)")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  async function handleSave() {
    if (!clinicaData?.id) return;
    setLoading(true);

    const { error } = await supabase
      .from("clinicas")
      .update({
        endereco_principal: formData.endereco_principal,
        cidade: formData.cidade,
        estado: formData.estado,
      })
      .eq("id", clinicaData.id);

    if (error) {
      toast.error("Erro ao atualizar endereço");
    } else {
      toast.success("Endereço atualizado com sucesso!");
      clinicaData.endereco_principal = formData.endereco_principal;
      clinicaData.cidade = formData.cidade;
      clinicaData.estado = formData.estado;
      setDialogOpen(false);
    }
    setLoading(false);
  }

  const hasAddress = clinicaData?.endereco_principal || clinicaData?.cidade;

  return (
    <div className="space-y-6">
      {/* Endereço Principal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Endereço da Clínica</h2>
          <p className="text-muted-foreground">
            Este é o endereço de atendimento da clínica
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Edit className="w-4 h-4" />
          {hasAddress ? "Editar Endereço" : "Cadastrar Endereço"}
        </Button>
      </div>

      <Card className="card-shadow">
        <CardContent className="p-6">
          {hasAddress ? (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-xl">{clinicaData?.nome_fantasia}</h3>
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Ativo
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {clinicaData?.endereco_principal}
                  {clinicaData?.cidade && `, ${clinicaData.cidade}`}
                  {clinicaData?.estado && ` - ${clinicaData.estado}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum endereço cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Cadastrar Endereço" para adicionar o endereço da clínica
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Médicos Vinculados */}
      {medicos && medicos.length > 0 && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Médicos que atendem nesta clínica</h3>
              <Badge variant="secondary">{medicos.length}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {medicos.map((vinculo: any) => (
                <div key={vinculo.medico_id} className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {vinculo.medicos?.nome?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">Dr(a). {vinculo.medicos?.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{vinculo.medicos?.especialidade || "Especialidade"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar endereço da clínica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasAddress ? "Editar Endereço" : "Cadastrar Endereço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Endereço Completo *</Label>
              <Input
                value={formData.endereco_principal}
                onChange={(e) => setFormData({ ...formData, endereco_principal: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade *</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <Label>Estado *</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
