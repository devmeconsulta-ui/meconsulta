import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Key, 
  Copy, 
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Code,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiKey {
  id: string;
  nome: string;
  key: string;
  criadaEm: string;
  ultimoUso: string | null;
  ativa: boolean;
}

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/consultas", descricao: "Lista consultas" },
  { method: "POST", path: "/api/v1/consultas", descricao: "Cria nova consulta" },
  { method: "GET", path: "/api/v1/consultas/:id", descricao: "Detalhes da consulta" },
  { method: "PUT", path: "/api/v1/consultas/:id", descricao: "Atualiza consulta" },
  { method: "DELETE", path: "/api/v1/consultas/:id", descricao: "Cancela consulta" },
  { method: "GET", path: "/api/v1/medicos", descricao: "Lista médicos" },
  { method: "GET", path: "/api/v1/medicos/:id", descricao: "Detalhes do médico" },
  { method: "GET", path: "/api/v1/medicos/:id/agenda", descricao: "Agenda do médico" },
  { method: "GET", path: "/api/v1/pacientes", descricao: "Lista pacientes" },
  { method: "POST", path: "/api/v1/pacientes", descricao: "Cria paciente" },
  { method: "GET", path: "/api/v1/pacientes/:id", descricao: "Detalhes do paciente" },
  { method: "GET", path: "/api/v1/especialidades", descricao: "Lista especialidades" },
  { method: "GET", path: "/api/v1/locais", descricao: "Lista locais de atendimento" },
];

const BASE_URL = "https://dwqceailivjjacvqzfnh.supabase.co/functions/v1";

export function IntegracoesAPI() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      nome: "Produção Principal",
      key: "mc_live_xxxxxxxxxxxxxxxxxxxx",
      criadaEm: "2024-01-15",
      ultimoUso: "2024-01-20",
      ativa: true,
    }
  ]);
  const [novaKeyNome, setNovaKeyNome] = useState("");
  const [keyVisivel, setKeyVisivel] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  function copiarKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("API Key copiada!");
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function gerarNovaKey() {
    if (!novaKeyNome.trim()) {
      toast.error("Informe um nome para a API Key");
      return;
    }

    setGerando(true);
    
    // Simular geração (implementar lógica real depois)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const novaKey: ApiKey = {
      id: crypto.randomUUID(),
      nome: novaKeyNome,
      key: `mc_live_${crypto.randomUUID().replace(/-/g, '').substring(0, 32)}`,
      criadaEm: new Date().toISOString().split('T')[0],
      ultimoUso: null,
      ativa: true,
    };
    
    setApiKeys(prev => [...prev, novaKey]);
    setNovaKeyNome("");
    setGerando(false);
    toast.success("API Key gerada com sucesso!");
  }

  function removerKey(id: string) {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast.success("API Key removida");
  }

  function toggleKeyVisivel(id: string) {
    setKeyVisivel(prev => prev === id ? null : id);
  }

  return (
    <div className="space-y-6">
      {/* Gerenciamento de API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Gerencie as chaves de acesso à API do MeConsulta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de keys existentes */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apiKey.nome}</span>
                      <Badge variant={apiKey.ativa ? "default" : "secondary"}>
                        {apiKey.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-1 rounded">
                        {keyVisivel === apiKey.id 
                          ? apiKey.key 
                          : `${apiKey.key.substring(0, 12)}${'•'.repeat(20)}`
                        }
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleKeyVisivel(apiKey.id)}
                      >
                        {keyVisivel === apiKey.id ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copiarKey(apiKey.key)}
                      >
                        {copiedKey === apiKey.key ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criada em {apiKey.criadaEm}
                      {apiKey.ultimoUso && ` • Último uso: ${apiKey.ultimoUso}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerKey(apiKey.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Gerar nova key */}
          <div className="flex gap-2">
            <Input
              value={novaKeyNome}
              onChange={(e) => setNovaKeyNome(e.target.value)}
              placeholder="Nome da API Key (ex: Produção, Staging)"
              className="flex-1"
            />
            <Button onClick={gerarNovaKey} disabled={gerando} className="gap-2">
              {gerando ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Gerar Nova Key
            </Button>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ As API Keys são exibidas apenas uma vez. Guarde-as em local seguro.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Documentação da API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Code className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Documentação da API</CardTitle>
                <CardDescription>
                  Endpoints disponíveis para integração
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Documentação Completa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="font-medium">Base URL</Label>
              <code className="block mt-1 text-sm">{BASE_URL}</code>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="font-medium">Autenticação</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Inclua o header <code className="bg-background px-1 rounded">Authorization: Bearer SUA_API_KEY</code> em todas as requisições.
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Método</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENDPOINTS.map((endpoint, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            endpoint.method === "GET" ? "text-green-600 border-green-600" :
                            endpoint.method === "POST" ? "text-blue-600 border-blue-600" :
                            endpoint.method === "PUT" ? "text-amber-600 border-amber-600" :
                            "text-red-600 border-red-600"
                          }
                        >
                          {endpoint.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                      <TableCell className="text-muted-foreground">{endpoint.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="font-medium mb-2 block">Exemplo de Requisição</Label>
              <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`curl -X GET "${BASE_URL}/api/v1/consultas" \\
  -H "Authorization: Bearer mc_live_xxxx" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}