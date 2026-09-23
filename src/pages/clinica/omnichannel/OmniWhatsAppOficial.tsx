import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCheck,
  Copy,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { useWacInbox, useWhatsAppCloud, type WacConexao } from "@/hooks/useWhatsAppCloud";

function dataHora(valor?: string | null) {
  if (!valor) return "";
  try {
    return format(parseISO(valor), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

function hora(valor?: string | null) {
  if (!valor) return "";
  try {
    return format(parseISO(valor), "HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

function StatusBadge({ conexao }: { conexao: WacConexao }) {
  if (!conexao.ativo) return <Badge variant="secondary">Inativa</Badge>;
  if (conexao.status === "ativo") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-primary-foreground gap-1">
        <BadgeCheck className="w-3 h-3" /> Ativa
      </Badge>
    );
  }
  if (conexao.status === "erro") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" /> Erro
      </Badge>
    );
  }
  return <Badge variant="outline">Não testada</Badge>;
}

interface FormState {
  conexao_id?: string;
  nome: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  ativo: boolean;
}

const FORM_VAZIO: FormState = {
  nome: "",
  waba_id: "",
  phone_number_id: "",
  access_token: "",
  verify_token: "",
  ativo: true,
};

export default function OmniWhatsAppOficial() {
  const {
    conexoes,
    conexoesAtivas,
    webhookUrl,
    loading,
    carregarConexoes,
    salvarConexao,
    removerConexao,
    testarConexao,
    listarTemplates,
  } = useWhatsAppCloud();

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [testandoId, setTestandoId] = useState<string | null>(null);
  const [removerId, setRemoverId] = useState<string | null>(null);

  const [conexaoInbox, setConexaoInbox] = useState<string | null>(null);

  useEffect(() => {
    if (!conexaoInbox && conexoesAtivas.length) setConexaoInbox(conexoesAtivas[0].id);
  }, [conexoesAtivas, conexaoInbox]);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(conexao: WacConexao) {
    setForm({
      conexao_id: conexao.id,
      nome: conexao.nome,
      waba_id: conexao.waba_id,
      phone_number_id: conexao.phone_number_id,
      access_token: "",
      verify_token: conexao.verify_token ?? "",
      ativo: conexao.ativo,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome || !form.waba_id || !form.phone_number_id) {
      toast.error("Preencha nome, WABA ID e Phone Number ID");
      return;
    }
    if (!form.conexao_id && !form.access_token) {
      toast.error("Informe o token de acesso da Meta");
      return;
    }
    setSalvando(true);
    try {
      await salvarConexao(form);
      toast.success(form.conexao_id ? "Conexão atualizada" : "Conexão criada");
      setModalAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function testar(conexao: WacConexao) {
    setTestandoId(conexao.id);
    try {
      const res = await testarConexao(conexao.id);
      if (res?.ok) {
        toast.success(
          `Conexão válida: ${res.display_phone_number ?? ""} ${res.verified_name ? `(${res.verified_name})` : ""}`,
        );
      } else {
        toast.error(res?.message ?? "Falha no teste de conexão");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no teste");
    } finally {
      setTestandoId(null);
    }
  }

  function copiar(texto: string, rotulo: string) {
    navigator.clipboard.writeText(texto);
    toast.success(`${rotulo} copiado`);
  }

  return (
    <OmniLayout clinicaId={clinicaId ?? undefined}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp Oficial (Meta)</h2>
          <p className="text-muted-foreground">
            Conexão direta com a API Oficial do WhatsApp Cloud, independente de provedores externos.
          </p>
        </div>
        <Button variant="outline" onClick={carregarConexoes} disabled={loading} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="conexoes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="conexoes" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Conexões
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2">
            <MessageSquare className="w-4 h-4" /> Caixa de entrada
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Conexões ---------------- */}
        <TabsContent value="conexoes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Endereço do webhook</CardTitle>
                <CardDescription>
                  Cole este endereço no painel da Meta junto com o token de verificação da conexão.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => copiar(webhookUrl, "Endereço do webhook")}
                disabled={!webhookUrl}
              >
                <Copy className="w-4 h-4" /> Copiar
              </Button>
            </CardHeader>
            <CardContent>
              <code className="block w-full break-all rounded-md bg-muted px-3 py-2 text-sm">
                {webhookUrl || "—"}
              </code>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={abrirNovo} className="gap-2">
              <Plus className="w-4 h-4" /> Nova conexão
            </Button>
          </div>

          {loading && !conexoes.length ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !conexoes.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum número oficial cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {conexoes.map((conexao) => (
                <Card key={conexao.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{conexao.nome}</CardTitle>
                        <CardDescription className="truncate">
                          {conexao.display_phone_number ?? "Número não verificado"}
                          {conexao.verified_name ? ` · ${conexao.verified_name}` : ""}
                        </CardDescription>
                      </div>
                      <StatusBadge conexao={conexao} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div className="truncate">
                        <span className="block text-xs uppercase">WABA ID</span>
                        <span className="text-foreground">{conexao.waba_id}</span>
                      </div>
                      <div className="truncate">
                        <span className="block text-xs uppercase">Phone Number ID</span>
                        <span className="text-foreground">{conexao.phone_number_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-muted-foreground">Token de verificação</span>
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                        {conexao.verify_token ?? "—"}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copiar(conexao.verify_token ?? "", "Token de verificação")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {conexao.ultimo_erro && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {conexao.ultimo_erro}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {conexao.ultimo_teste_em
                        ? `Último teste: ${dataHora(conexao.ultimo_teste_em)}`
                        : "Ainda não testada"}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => testar(conexao)}
                        disabled={testandoId === conexao.id}
                      >
                        {testandoId === conexao.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        Testar conexão
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => abrirEdicao(conexao)}>
                        <Pencil className="w-4 h-4" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => setRemoverId(conexao.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- Caixa de entrada ---------------- */}
        <TabsContent value="inbox">
          <Inbox
            conexoes={conexoesAtivas}
            conexaoId={conexaoInbox}
            setConexaoId={setConexaoInbox}
            listarTemplates={listarTemplates}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de cadastro/edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.conexao_id ? "Editar conexão" : "Nova conexão oficial"}</DialogTitle>
            <DialogDescription>
              Os dados vêm do painel da Meta em WhatsApp &gt; Configuração da API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wac-nome">Nome da conexão</Label>
              <Input
                id="wac-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Recepção principal"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wac-waba">WABA ID</Label>
                <Input
                  id="wac-waba"
                  value={form.waba_id}
                  onChange={(e) => setForm((f) => ({ ...f, waba_id: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wac-phone">Phone Number ID</Label>
                <Input
                  id="wac-phone"
                  value={form.phone_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wac-token">
                Token de acesso {form.conexao_id && <span className="text-muted-foreground">(deixe vazio para manter)</span>}
              </Label>
              <Input
                id="wac-token"
                type="password"
                autoComplete="off"
                value={form.access_token}
                onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                placeholder="EAAG..."
              />
              <p className="text-xs text-muted-foreground">
                O token é guardado criptografado e nunca volta para a tela.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wac-verify">Token de verificação do webhook</Label>
              <Input
                id="wac-verify"
                value={form.verify_token}
                onChange={(e) => setForm((f) => ({ ...f, verify_token: e.target.value }))}
                placeholder="Deixe vazio para gerar automaticamente"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Conexão ativa</p>
                <p className="text-xs text-muted-foreground">Disponível para envio e recebimento</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando} className="gap-2">
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removerId} onOpenChange={(open) => !open && setRemoverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta conexão?</AlertDialogTitle>
            <AlertDialogDescription>
              As conversas e mensagens desse número também serão removidas do sistema. A conta na Meta
              não é alterada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const id = removerId!;
                setRemoverId(null);
                try {
                  await removerConexao(id);
                  toast.success("Conexão removida");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao remover");
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </OmniLayout>
  );
}

/* ================= Caixa de entrada ================= */

interface InboxProps {
  conexoes: WacConexao[];
  conexaoId: string | null;
  setConexaoId: (id: string) => void;
  listarTemplates: (conexaoId: string) => Promise<Array<{ name: string; status: string; language: string }>>;
}

function Inbox({ conexoes, conexaoId, setConexaoId, listarTemplates }: InboxProps) {
  const { conversas, conversaAtiva, setConversaAtiva, mensagens, carregando, enviando, enviar } =
    useWacInbox(conexaoId);

  const [texto, setTexto] = useState("");
  const [novoNumero, setNovoNumero] = useState("");
  const [modalMidia, setModalMidia] = useState(false);
  const [midia, setMidia] = useState({ tipo: "image", link: "", caption: "", filename: "" });
  const [modalTemplate, setModalTemplate] = useState(false);
  const [templates, setTemplates] = useState<Array<{ name: string; status: string; language: string }>>([]);
  const [templateSel, setTemplateSel] = useState("");
  const [carregandoTemplates, setCarregandoTemplates] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const conversa = useMemo(
    () => conversas.find((c) => c.id === conversaAtiva) ?? null,
    [conversas, conversaAtiva],
  );

  const janelaAberta = useMemo(() => {
    if (!conversa?.janela_expira_em) return false;
    try {
      return parseISO(conversa.janela_expira_em).getTime() > Date.now();
    } catch {
      return false;
    }
  }, [conversa]);

  async function abrirTemplates() {
    if (!conexaoId) return;
    setModalTemplate(true);
    setCarregandoTemplates(true);
    try {
      const lista = await listarTemplates(conexaoId);
      setTemplates(lista.filter((t) => t.status === "APPROVED"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar modelos");
    } finally {
      setCarregandoTemplates(false);
    }
  }

  async function enviarTexto() {
    if (!texto.trim()) return;
    const destino = conversaAtiva ? undefined : novoNumero;
    if (!conversaAtiva && !destino) {
      toast.error("Informe o número de destino");
      return;
    }
    const ok = await enviar({ tipo: "text", texto: texto.trim(), to: destino });
    if (ok) {
      setTexto("");
      setNovoNumero("");
    }
  }

  if (!conexoes.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cadastre e ative uma conexão para usar a caixa de entrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Número:</Label>
        <Select value={conexaoId ?? undefined} onValueChange={setConexaoId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione um número" />
          </SelectTrigger>
          <SelectContent>
            {conexoes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} {c.display_phone_number ? `· ${c.display_phone_number}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Conversas ({conversas.length})</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[520px]">
            <div className="divide-y">
              {conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConversaAtiva(c.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    conversaAtiva === c.id && "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.contato?.nome || c.contato?.wa_id || "Contato"}
                    </span>
                    {c.nao_lidas > 0 && (
                      <Badge className="h-5 min-w-5 justify-center px-1.5">{c.nao_lidas}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.ultima_mensagem ?? "Sem mensagens"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{dataHora(c.ultima_mensagem_em)}</p>
                </button>
              ))}
              {!conversas.length && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma conversa ainda.
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">
                {conversa
                  ? conversa.contato?.nome || conversa.contato?.wa_id
                  : "Nova conversa"}
              </CardTitle>
              {conversa && (
                <Badge variant={janelaAberta ? "secondary" : "outline"}>
                  {janelaAberta ? "Janela de 24h aberta" : "Fora da janela · use um modelo"}
                </Badge>
              )}
            </div>
          </CardHeader>

          <ScrollArea className="h-[420px] px-4">
            {carregando ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.direcao === "saida" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                        m.direcao === "saida"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {m.media_url && (
                        <a
                          href={m.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block underline underline-offset-2"
                        >
                          {m.filename || `Arquivo (${m.tipo})`}
                        </a>
                      )}
                      {m.template_nome && !m.conteudo && <span>Modelo: {m.template_nome}</span>}
                      {m.conteudo && <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>}
                      {!m.conteudo && !m.media_url && !m.template_nome && (
                        <span className="italic opacity-80">[{m.tipo}]</span>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                        <span>{hora(m.timestamp_meta ?? m.created_at)}</span>
                        {m.direcao === "saida" && (
                          <>
                            {m.status === "lido" ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : m.status === "entregue" ? (
                              <CheckCheck className="w-3 h-3 opacity-60" />
                            ) : m.status === "falhou" ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </>
                        )}
                      </div>
                      {m.erro && <p className="mt-1 text-[10px]">{m.erro}</p>}
                    </div>
                  </div>
                ))}
                {!mensagens.length && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Escolha uma conversa ou envie uma mensagem para um novo número.
                  </p>
                )}
                <div ref={fimRef} />
              </div>
            )}
          </ScrollArea>

          <CardContent className="space-y-2 border-t pt-3">
            {!conversaAtiva && (
              <Input
                value={novoNumero}
                onChange={(e) => setNovoNumero(e.target.value)}
                placeholder="Número com DDD, ex: 38999990000"
              />
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarTexto();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={() => setModalMidia(true)} title="Enviar arquivo">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={abrirTemplates} title="Enviar modelo aprovado">
                Modelo
              </Button>
              <Button onClick={enviarTexto} disabled={enviando} className="gap-2">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </Button>
            </div>
            {conversaAtiva && !janelaAberta && (
              <p className="text-xs text-muted-foreground">
                Passadas 24 horas da última mensagem do paciente, a Meta só permite modelos aprovados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de mídia */}
      <Dialog open={modalMidia} onOpenChange={setModalMidia}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar arquivo</DialogTitle>
            <DialogDescription>Informe o endereço público do arquivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={midia.tipo} onValueChange={(v) => setMidia((m) => ({ ...m, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Endereço do arquivo</Label>
              <Input
                value={midia.link}
                onChange={(e) => setMidia((m) => ({ ...m, link: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            {midia.tipo === "document" && (
              <div className="space-y-2">
                <Label>Nome do arquivo</Label>
                <Input
                  value={midia.filename}
                  onChange={(e) => setMidia((m) => ({ ...m, filename: e.target.value }))}
                  placeholder="exame.pdf"
                />
              </div>
            )}
            {midia.tipo !== "audio" && (
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Input
                  value={midia.caption}
                  onChange={(e) => setMidia((m) => ({ ...m, caption: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMidia(false)}>
              Cancelar
            </Button>
            <Button
              disabled={enviando || !midia.link}
              onClick={async () => {
                const ok = await enviar({
                  tipo: midia.tipo as "image" | "document" | "audio" | "video",
                  link: midia.link,
                  caption: midia.caption || undefined,
                  filename: midia.filename || undefined,
                  to: conversaAtiva ? undefined : novoNumero,
                });
                if (ok) {
                  setModalMidia(false);
                  setMidia({ tipo: "image", link: "", caption: "", filename: "" });
                }
              }}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de templates */}
      <Dialog open={modalTemplate} onOpenChange={setModalTemplate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modelos aprovados</DialogTitle>
            <DialogDescription>
              Use um modelo quando a janela de 24 horas estiver fechada.
            </DialogDescription>
          </DialogHeader>
          {carregandoTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={templateSel} onValueChange={setTemplateSel}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um modelo" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>
                    {t.name} ({t.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalTemplate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!templateSel || enviando}
              onClick={async () => {
                const [nome, idioma] = templateSel.split("|");
                const ok = await enviar({
                  tipo: "template",
                  template_nome: nome,
                  template_idioma: idioma,
                  to: conversaAtiva ? undefined : novoNumero,
                });
                if (ok) {
                  setModalTemplate(false);
                  setTemplateSel("");
                }
              }}
            >
              Enviar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
