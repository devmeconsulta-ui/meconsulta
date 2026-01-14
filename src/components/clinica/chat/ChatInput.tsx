import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  X,
  Loader2
} from "lucide-react";

interface ChatInputProps {
  onEnviar: (
    conteudo: string,
    tipoMensagem?: "texto" | "imagem" | "arquivo",
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ) => Promise<void>;
  onUpload: (file: File) => Promise<{ url: string; nome: string; tipo: string } | null>;
  disabled?: boolean;
}

export function ChatInput({ onEnviar, onUpload, disabled }: ChatInputProps) {
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleEnviar = async () => {
    if ((!mensagem.trim() && !arquivoSelecionado) || enviando) return;

    setEnviando(true);
    try {
      if (arquivoSelecionado) {
        const uploaded = await onUpload(arquivoSelecionado);
        if (uploaded) {
          const tipoMensagem = arquivoSelecionado.type.startsWith("image/") ? "imagem" : "arquivo";
          await onEnviar(
            mensagem.trim(),
            tipoMensagem,
            uploaded.url,
            uploaded.nome,
            uploaded.tipo
          );
        }
        setArquivoSelecionado(null);
        setPreviewUrl(null);
      } else {
        await onEnviar(mensagem.trim());
      }
      setMensagem("");
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    // Validar tipo para imagens
    if (isImage && !file.type.startsWith("image/")) {
      toast.error("Selecione apenas imagens.");
      return;
    }

    setArquivoSelecionado(file);

    // Preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removerArquivo = () => {
    setArquivoSelecionado(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="p-4 border-t bg-background">
      {/* Preview do arquivo selecionado */}
      {arquivoSelecionado && (
        <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded" />
          ) : (
            <div className="h-16 w-16 bg-primary/10 rounded flex items-center justify-center">
              <Paperclip className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{arquivoSelecionado.name}</p>
            <p className="text-xs text-muted-foreground">
              {(arquivoSelecionado.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={removerArquivo}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Inputs ocultos para arquivos */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e, true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e, false)}
        />

        {/* Botões de anexo */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || enviando}
            title="Enviar imagem"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || enviando}
            title="Enviar arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>

        {/* Textarea */}
        <Textarea
          placeholder="Digite sua mensagem..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || enviando}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        {/* Botão de enviar */}
        <Button
          onClick={handleEnviar}
          disabled={disabled || enviando || (!mensagem.trim() && !arquivoSelecionado)}
          size="icon"
        >
          {enviando ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
