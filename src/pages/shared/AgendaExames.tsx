import { useEffect, useMemo, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { carregarExames, ExameTipo } from "@/pages/clinica/ClinicaExames";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, FlaskConical, Loader2, Plus, Trash2, DollarSign, Lock, Unlock } from "lucide-react";

const STATUS: Record<string, string> = {
  agendada: "Agendado", confirmada: "Confirmado", realizada: "Realizado", faltou: "Faltou", cancelada: "Cancelado",
};

interface Props { modoMedico?: boolean }

export default function AgendaExames({ modoMedico = false }: Props) {
  const { currentUser } = useAuth();
  const db = supabase as any;
  const [clinicaId, setClinicaId] = useState<string | null>(currentUser?.clinicaId || null);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [medicoId, setMedicoId] = useState<string>(modoMedico ? currentUser?.medicoId || "" : "");
  const [exames, setExames] = useState<ExameTipo[]>([]);
  const [vinculos, setVinculos] = useState<{ exame_tipo_id: string; medico_id: string }[]>([]);
  const [locais, setLocais] = useState<{ id: string; nome_local: string }[]>([]);
  const [dia, setDia] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [gerarOpen, setGerarOpen] = useState(false);
  const [ger, setGer] = useState({ exame: "", local: "", inicio: "08:00", fim: "12:00", dias: 1 });
  const [marcar, setMarcar] = useState<any | null>(null);
  const [pac, setPac] = useState({ nome: "", telefone: "", obs: "" });
  const [saving, setSaving] = useState(false);

  // Descobre a clínica no modo médico
  useEffect(() => {
    (async () => {
      if (clinicaId || !modoMedico || !currentUser?.medicoId) return;
      const { data } = await db.from("clinicas_medicos").select("clinica_id").eq("medico_id", currentUser.medicoId).limit(1).maybeSingle();
      if (data?.clinica_id) setClinicaId(data.clinica_id);
    })();
  }, [currentUser?.medicoId]);

  useEffect(() => {
    if (!clinicaId) return;
    (async () => {
      const ex = await carregarExames(clinicaId);
      setExames(ex.filter((e) => e.ativo));
      if (ex.length) {
        const { data: v } = await db.from("exames_medicos").select("exame_tipo_id, medico_id").in("exame_tipo_id", ex.map((e) => e.id));
        setVinculos(v || []);
      }
      const { data: cm } = await db.from("clinicas_medicos").select("medicos(id, nome)").eq("clinica_id", clinicaId);
      const meds = (cm || []).map((r: any) => r.medicos).filter(Boolean);
      setMedicos(meds);
      if (!medicoId && meds[0]) setMedicoId(meds[0].id);
      const { data: l } = await db.from("locais_atendimento").select("id, nome_local").eq("clinica_id", clinicaId);
      setLocais(l || []);
    })();
  }, [clinicaId]);

  async function carregar() {
    if (!medicoId) return;
    setLoading(true);
    const { data } = await db
      .from("agenda_slots")
      .select("*, exames_tipos(id, nome, cor, preparo, valor), locais_atendimento(nome_local)")
      .eq("medico_id", medicoId)
      .not("exame_tipo_id", "is", null)
      .gte("data_hora", `${dia}T00:00:00-03:00`)
      .lte("data_hora", `${dia}T23:59:59-03:00`)
      .order("data_hora");
    const lista = data || [];
    if (lista.length) {
      const { data: cons } = await db
        .from("consultas")
        .select("id, agenda_slot_id, nome_paciente_consulta, status_consulta, status_pagamento, observacoes_paciente")
        .in("agenda_slot_id", lista.map((s: any) => s.id))
        .neq("status_consulta", "cancelada");
      lista.forEach((s: any) => { s.consulta = (cons || []).find((c: any) => c.agenda_slot_id === s.id) || null; });
    }
    setSlots(lista);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [medicoId, dia]);

  useEffect(() => {
    const ch = supabase
      .channel("agenda-exames")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultas" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [medicoId, dia]);

  const examesDoMedico = useMemo(() => {
    const ids = vinculos.filter((v) => v.medico_id === medicoId).map((v) => v.exame_tipo_id);
    return ids.length ? exames.filter((e) => ids.includes(e.id)) : exames;
  }, [exames, vinculos, medicoId]);

  function mudarDia(n: number) { setDia(format(addDays(parseISO(dia), n), "yyyy-MM-dd")); }

  async function gerar() {
    const ex = exames.find((e) => e.id === ger.exame);
    if (!ex || !ger.local) return toast.error("Escolha o exame e o local");
    const [hi, mi] = ger.inicio.split(":").map(Number);
    const [hf, mf] = ger.fim.split(":").map(Number);
    const novos: any[] = [];
    for (let d = 0; d < Math.max(1, Number(ger.dias)); d++) {
      const data = format(addDays(parseISO(dia), d), "yyyy-MM-dd");
      for (let m = hi * 60 + mi; m + ex.duracao_min <= hf * 60 + mf; m += ex.duracao_min) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        novos.push({ medico_id: medicoId, local_id: ger.local, exame_tipo_id: ex.id, tipo_slot: "exame", disponivel: true, data_hora: `${data}T${hh}:${mm}:00-03:00` });
      }
    }
    if (!novos.length) return toast.error("Intervalo muito curto para esse exame");
    const { error } = await db.from("agenda_slots").insert(novos);
    if (error) return toast.error("Erro ao gerar horários");
    toast.success(`${novos.length} horários criados`);
    setGerarOpen(false);
    carregar();
  }

  async function confirmarMarcacao() {
    if (!pac.nome.trim()) return toast.error("Informe o nome do paciente");
    setSaving(true);
    const s = marcar;
    const ex = s.exames_tipos;
    const valor = Number(ex?.valor) || 0;
    const { error } = await db.from("consultas").insert({
      medico_id: medicoId, data_hora: s.data_hora, origem: "interna", status_consulta: "agendada", status_pagamento: "pendente",
      valor_consulta: valor, valor_medico: valor, valor_plataforma: 0, agenda_slot_id: s.id, local_id: s.local_id,
      clinica_id: clinicaId, nome_paciente_consulta: pac.nome.trim(), tipo_servico: ex?.nome, exame_tipo_id: ex?.id,
      observacoes_paciente: pac.obs || null,
    });
    if (error) { setSaving(false); return toast.error("Erro ao marcar exame"); }
    await db.from("agenda_slots").update({ disponivel: false }).eq("id", s.id);
    if (pac.telefone && clinicaId) {
      supabase.functions.invoke("notify-appointment-booked", {
        body: {
          clinica_id: clinicaId, paciente_nome: pac.nome, paciente_telefone: pac.telefone, data_hora: s.data_hora,
          medico_nome: medicos.find((m) => m.id === medicoId)?.nome || "", local_nome: s.locais_atendimento?.nome_local || "",
          exame_nome: ex?.nome, preparo: ex?.preparo || null,
        },
      }).then((r) => { if (r.data?.success) toast.info("Aviso e preparo enviados por WhatsApp"); }).catch(() => {});
    }
    setSaving(false);
    setMarcar(null);
    setPac({ nome: "", telefone: "", obs: "" });
    toast.success("Exame marcado!");
    carregar();
  }

  async function mudarStatus(c: any, status: string) {
    await db.from("consultas").update({ status_consulta: status }).eq("id", c.id);
    if (status === "cancelada") await db.from("agenda_slots").update({ disponivel: true }).eq("id", c.agenda_slot_id);
    carregar();
  }

  async function marcarPago(c: any) {
    const { error } = await db.from("consultas").update({ status_pagamento: "pago" }).eq("id", c.id);
    if (error) return toast.error("Erro ao registrar pagamento");
    toast.success("Pagamento registrado");
    carregar();
  }

  async function alternarBloqueio(s: any) {
    await db.from("agenda_slots").update({ disponivel: !s.disponivel }).eq("id", s.id);
    carregar();
  }

  async function excluirSlot(s: any) {
    await db.from("agenda_slots").delete().eq("id", s.id);
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6 text-primary" /> Agenda de Exames</h1>
          <p className="text-muted-foreground text-sm">Holter, MAPA, ECG, Espirometria e outros, por médico.</p>
        </div>
        <Button onClick={() => { setGer({ ...ger, exame: examesDoMedico[0]?.id || "", local: locais[0]?.id || "" }); setGerarOpen(true); }} disabled={!medicoId}>
          <Plus className="w-4 h-4 mr-2" /> Gerar Horários
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!modoMedico && (
          <Select value={medicoId} onValueChange={setMedicoId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Escolha o médico" /></SelectTrigger>
            <SelectContent>{medicos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => mudarDia(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-44" />
          <Button size="icon" variant="outline" onClick={() => mudarDia(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <span className="text-sm text-muted-foreground capitalize">{format(parseISO(dia), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {examesDoMedico.map((e) => (
          <span key={e.id} className="text-xs flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: e.cor }} />{e.nome}</span>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : slots.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum horário de exame neste dia. Use "Gerar Horários".</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {slots.map((s) => {
            const c = s.consulta;
            return (
              <Card key={s.id} className="border-l-4" style={{ borderLeftColor: s.exames_tipos?.cor }}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <span className="font-mono font-semibold w-14">{format(parseISO(s.data_hora), "HH:mm")}</span>
                  <Badge variant="outline">{s.exames_tipos?.nome}</Badge>
                  <span className="text-xs text-muted-foreground">{s.locais_atendimento?.nome_local}</span>
                  <div className="flex-1 min-w-[160px]">
                    {c ? (
                      <div>
                        <p className="font-medium text-sm">{c.nome_paciente_consulta}</p>
                        {c.observacoes_paciente && <p className="text-xs text-muted-foreground">{c.observacoes_paciente}</p>}
                      </div>
                    ) : s.disponivel ? (
                      <span className="text-sm text-muted-foreground">Livre</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Bloqueado</span>
                    )}
                  </div>
                  {c ? (
                    <div className="flex items-center gap-2">
                      <Select value={c.status_consulta} onValueChange={(v) => mudarStatus(c, v)}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      {c.status_pagamento === "pago" ? (
                        <Badge>Pago</Badge>
                      ) : !modoMedico && (
                        <Button size="sm" variant="outline" onClick={() => marcarPago(c)}><DollarSign className="w-4 h-4 mr-1" />Pago</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {s.disponivel && <Button size="sm" onClick={() => setMarcar(s)}>Marcar</Button>}
                      <Button size="icon" variant="ghost" onClick={() => alternarBloqueio(s)}>{s.disponivel ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</Button>
                      <Button size="icon" variant="ghost" onClick={() => excluirSlot(s)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={gerarOpen} onOpenChange={setGerarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar horários de exame</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Exame</Label>
              <Select value={ger.exame} onValueChange={(v) => setGer({ ...ger, exame: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{examesDoMedico.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome} ({e.duracao_min} min)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Local</Label>
              <Select value={ger.local} onValueChange={(v) => setGer({ ...ger, local: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{locais.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome_local}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Início</Label><Input type="time" value={ger.inicio} onChange={(e) => setGer({ ...ger, inicio: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="time" value={ger.fim} onChange={(e) => setGer({ ...ger, fim: e.target.value })} /></div>
              <div><Label>Dias seguidos</Label><Input type="number" min={1} value={ger.dias} onChange={(e) => setGer({ ...ger, dias: Number(e.target.value) })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">A partir de {format(parseISO(dia), "dd/MM/yyyy")}.</p>
          </div>
          <DialogFooter><Button onClick={gerar}>Gerar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!marcar} onOpenChange={(o) => !o && setMarcar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar {marcar?.exames_tipos?.nome} {marcar && `às ${format(parseISO(marcar.data_hora), "HH:mm")}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do paciente</Label><Input value={pac.nome} onChange={(e) => setPac({ ...pac, nome: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input placeholder="(11) 99999-9999" value={pac.telefone} onChange={(e) => setPac({ ...pac, telefone: e.target.value })} /></div>
            <div><Label>Observação</Label><Textarea rows={2} value={pac.obs} onChange={(e) => setPac({ ...pac, obs: e.target.value })} /></div>
            {marcar?.exames_tipos?.preparo && (
              <div className="bg-muted rounded p-3 text-sm whitespace-pre-line">
                <p className="font-medium mb-1">Preparo (vai junto na mensagem):</p>{marcar.exames_tipos.preparo}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmarMarcacao} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
