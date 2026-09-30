import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FlaskConical, Loader2 } from "lucide-react";

export interface ExameTipo {
  id: string;
  clinica_id: string;
  nome: string;
  duracao_min: number;
  valor: number;
  preparo: string | null;
  cor: string;
  ativo: boolean;
}

const PADRAO = [
  { nome: "Holter", duracao_min: 30, cor: "#0ea5e9" },
  { nome: "MAPA", duracao_min: 30, cor: "#8b5cf6" },
  { nome: "ECG", duracao_min: 15, cor: "#ef4444" },
  { nome: "Espirometria", duracao_min: 30, cor: "#10b981" },
  { nome: "Impedanciometria", duracao_min: 20, cor: "#f59e0b" },
];

export async function carregarExames(clinicaId: string): Promise<ExameTipo[]> {
  const db = supabase as any;
  let { data } = await db.from("exames_tipos").select("*").eq("clinica_id", clinicaId).order("nome");
  if (!data || data.length === 0) {
    await db.from("exames_tipos").insert(PADRAO.map((p) => ({ ...p, clinica_id: clinicaId })));
    ({ data } = await db.from("exames_tipos").select("*").eq("clinica_id", clinicaId).order("nome"));
  }
  return data || [];
}

const vazio = { nome: "", duracao_min: 30, valor: 0, preparo: "", cor: "#0ea5e9", ativo: true };

export default function ClinicaExames() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;
  const db = supabase as any;
  const [exames, setExames] = useState<ExameTipo[]>([]);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [vinculos, setVinculos] = useState<{ exame_tipo_id: string; medico_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(vazio);
  const [medSel, setMedSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!clinicaId) return;
    setLoading(true);
    const ex = await carregarExames(clinicaId);
    setExames(ex);
    const { data: cm } = await db.from("clinicas_medicos").select("medico_id, medicos(id, nome)").eq("clinica_id", clinicaId);
    setMedicos((cm || []).map((r: any) => r.medicos).filter(Boolean));
    if (ex.length) {
      const { data: v } = await db.from("exames_medicos").select("exame_tipo_id, medico_id").in("exame_tipo_id", ex.map((e) => e.id));
      setVinculos(v || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [clinicaId]);

  function abrir(e?: ExameTipo) {
    setEditId(e?.id || null);
    setForm(e ? { ...e, preparo: e.preparo || "" } : vazio);
    setMedSel(e ? vinculos.filter((v) => v.exame_tipo_id === e.id).map((v) => v.medico_id) : []);
    setOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do exame");
    setSaving(true);
    const payload = {
      nome: form.nome.trim(), duracao_min: Number(form.duracao_min) || 30, valor: Number(form.valor) || 0,
      preparo: form.preparo?.trim() || null, cor: form.cor, ativo: form.ativo, clinica_id: clinicaId,
    };
    let id = editId;
    if (editId) {
      const { error } = await db.from("exames_tipos").update(payload).eq("id", editId);
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
    } else {
      const { data, error } = await db.from("exames_tipos").insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
      id = data.id;
    }
    await db.from("exames_medicos").delete().eq("exame_tipo_id", id);
    if (medSel.length) await db.from("exames_medicos").insert(medSel.map((m) => ({ exame_tipo_id: id, medico_id: m })));
    setSaving(false);
    setOpen(false);
    toast.success("Exame salvo!");
    load();
  }

  async function excluir(e: ExameTipo) {
    if (!confirm(`Excluir o exame ${e.nome}?`)) return;
    const { error } = await db.from("exames_tipos").delete().eq("id", e.id);
    if (error) return toast.error("Erro ao excluir");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6 text-primary" /> Exames</h1>
          <p className="text-muted-foreground text-sm">Cadastre os exames, o preparo e quais médicos realizam cada um.</p>
        </div>
        <Button onClick={() => abrir()}><Plus className="w-4 h-4 mr-2" /> Novo exame</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exames.map((e) => {
            const meds = vinculos.filter((v) => v.exame_tipo_id === e.id).map((v) => medicos.find((m) => m.id === v.medico_id)?.nome).filter(Boolean);
            return (
              <Card key={e.id} className="border-l-4" style={{ borderLeftColor: e.cor }}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{e.nome}</h3>
                      <p className="text-xs text-muted-foreground">{e.duracao_min} min · R$ {Number(e.valor).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      {!e.ativo && <Badge variant="secondary">Inativo</Badge>}
                      <Button size="icon" variant="ghost" onClick={() => abrir(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => excluir(e)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <p className="text-xs"><span className="font-medium">Médicos:</span> {meds.length ? meds.join(", ") : "nenhum vinculado"}</p>
                  {e.preparo && <p className="text-xs bg-muted rounded p-2 whitespace-pre-line"><span className="font-medium">Preparo:</span> {e.preparo}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar exame" : "Novo exame"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Duração (min)</Label><Input type="number" value={form.duracao_min} onChange={(e) => setForm({ ...form, duracao_min: e.target.value })} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
              <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
            </div>
            <div>
              <Label>Preparo (enviado ao paciente)</Label>
              <Textarea rows={5} placeholder="Ex.: Não fumar 4h antes, evitar café no dia do exame..." value={form.preparo} onChange={(e) => setForm({ ...form, preparo: e.target.value })} />
            </div>
            <div>
              <Label>Médicos que realizam</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {medicos.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={medSel.includes(m.id)} onCheckedChange={(c) => setMedSel(c ? [...medSel, m.id] : medSel.filter((x) => x !== m.id))} />
                    {m.nome}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /> Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
