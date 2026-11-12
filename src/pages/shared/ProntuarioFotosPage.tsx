import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { photoRequest, type PhotoConsulta } from "@/lib/prontuarioFotos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProntuarioImagensTab from "@/components/medico/ProntuarioImagensTab";

const PAGE_SIZE = 20;

export default function ProntuarioFotosPage() {
  const { currentUser } = useAuth();
  const context = useOutletContext<{ clinicaData?: { id: string } }>();
  const clinicaId = context?.clinicaData?.id || currentUser?.clinicaId;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["atendente-prontuario-fotos", clinicaId, search, page],
    enabled: !!clinicaId,
    queryFn: () => photoRequest<{ consultas: PhotoConsulta[]; count: number }>({ action: "consultas", search, page }),
    retry: false,
  });

  const selected = data?.consultas.find((consulta) => consulta.id === selectedId);

  if (!clinicaId) return <p>Entre com um usuário vinculado à clínica para acessar as fotos.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Camera /> Fotos do prontuário</h1>
        <p className="text-muted-foreground">Busque qualquer paciente da clínica e escolha a consulta para visualizar ou adicionar fotos.</p>
      </div>
      <Input aria-label="Buscar paciente por nome" placeholder="Buscar paciente por nome..." value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(0); setSelectedId(null); }} />
      {isLoading ? <div role="status" className="flex gap-2"><Loader2 className="animate-spin" /> Carregando consultas...</div> :
        isError ? <div role="alert"><p>{error instanceof Error ? error.message : "Não foi possível carregar as consultas."}</p><Button onClick={() => refetch()}>Tentar novamente</Button></div> :
          !data?.consultas.length ? <p>Nenhuma consulta encontrada. Para adicionar fotos, o paciente precisa ter uma consulta cadastrada na clínica.</p> : (
            <>
              <div className="space-y-3">
                {data.consultas.map((consulta) => (
                  <Card key={consulta.id}>
                    <CardContent className="p-4 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <p className="font-semibold">{consulta.paciente.nome}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm")} · {consulta.medico?.nome || "Médico não informado"}</p>
                      </div>
                      <Button onClick={() => setSelectedId(consulta.id)} disabled={!consulta.medico_id || !consulta.paciente_id} className="gap-2"><Camera className="h-4 w-4" /> Abrir fotos</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="text-sm">Página {page + 1} de {Math.max(1, Math.ceil(data.count / PAGE_SIZE))}</span>
                <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= data.count} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </>
          )}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fotos de {selected?.paciente.nome}</DialogTitle>
          </DialogHeader>
          {selected?.medico_id && selected.paciente_id && (
            <>
              <p className="text-sm text-muted-foreground">{format(new Date(selected.data_hora), "dd/MM/yyyy 'às' HH:mm")} · {selected.medico?.nome}. As fotos ficam disponíveis para o médico nesta consulta.</p>
              <ProntuarioImagensTab key={selected.id} consultaId={selected.id} medicoId={selected.medico_id} pacienteId={selected.paciente_id} canDelete={false} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
