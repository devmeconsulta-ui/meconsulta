import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageCircle, Volume2, Play } from "lucide-react";
import { useChatSettings, NOTIFICATION_SOUNDS, SoundId } from "@/hooks/useChatSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClinicaConfiguracoes() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const { settings: chatSettings, saveSettings: saveChatSettings, togglePush, pushPermission, playPreviewSound } = useChatSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_fantasia: clinicaData?.nome_fantasia || "",
    razao_social: clinicaData?.razao_social || "",
    cnpj: clinicaData?.cnpj || "",
    email_contato: clinicaData?.email_contato || "",
    telefone: clinicaData?.telefone || "",
    cidade: clinicaData?.cidade || "",
    estado: clinicaData?.estado || "",
    endereco_principal: clinicaData?.endereco_principal || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicaData?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("clinicas")
        .update(formData)
        .eq("id", clinicaData.id);

      if (error) throw error;
      toast.success("Dados atualizados com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as informações da sua clínica.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Clínica</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Fantasia *</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email de Contato</Label>
                <Input
                  type="email"
                  value={formData.email_contato}
                  onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.endereco_principal}
                  onChange={(e) => setFormData({ ...formData, endereco_principal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configurações do Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Chat Interno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Som de Notificação</p>
              <p className="text-sm text-muted-foreground">
                Tocar som quando receber uma nova mensagem no chat
              </p>
            </div>
            <Switch
              checked={chatSettings.soundEnabled}
              onCheckedChange={(checked) =>
                saveChatSettings({ soundEnabled: checked })
              }
            />
          </div>

          {chatSettings.soundEnabled && (
            <div className="space-y-3 pl-0 border-l-2 border-primary/20 ml-0 sm:pl-4 sm:ml-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm">Escolha o Som</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <div
                    key={sound.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      chatSettings.selectedSound === sound.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => saveChatSettings({ selectedSound: sound.id as SoundId })}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          chatSettings.selectedSound === sound.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-medium">{sound.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreviewSound(sound.id as SoundId);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium">Notificações Push</p>
              <p className="text-sm text-muted-foreground">
                Receber notificação do navegador quando chegar nova mensagem
                {pushPermission === "denied" && (
                  <span className="block text-destructive text-xs mt-1">
                    Notificações bloqueadas no navegador. Altere nas configurações do navegador.
                  </span>
                )}
              </p>
            </div>
            <Switch
              checked={chatSettings.pushEnabled}
              disabled={pushPermission === "denied"}
              onCheckedChange={(checked) => togglePush(checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
