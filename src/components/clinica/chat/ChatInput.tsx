import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  X,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Maximize2,
  Upload,
  Smile
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MentionInput } from "./MentionInput";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
  "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝",
  "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑",
  "😏", "😒", "🙄", "😬", "😮‍💨", "🤤", "😪", "😴",
  "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶",
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "🦾",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "💯", "💢", "💥", "💫", "💦", "💨", "🔥", "✨"
];

interface Participante {
  id: string;
  nome: string;
  tipo: "medico" | "funcionario" | "admin_clinica";
}

interface ChatInputProps {
  onEnviar: (
    conteudo: string,
    tipoMensagem?: "texto" | "imagem" | "arquivo",
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ) => Promise<void>;
  onUpload: (file: File) => Promise<{ url: string; nome: string; tipo: string } | null>;
  onTyping?: () => void;
  disabled?: boolean;
  participantes?: Participante[];
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
  if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("csv")) 
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive")) 
    return <FileArchive className="h-8 w-8 text-yellow-500" />;
  if (fileType.includes("word") || fileType.includes("document")) 
    return <FileText className="h-8 w-8 text-blue-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ChatInput({ onEnviar, onUpload, onTyping, disabled, participantes = [] }: ChatInputProps) {
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCounterRef = useRef(0);

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
    setShowFullPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const processFile = useCallback((file: File) => {
    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
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
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (disabled || enviando) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [disabled, enviando, processFile]);

  const isImage = arquivoSelecionado?.type.startsWith("image/");

  return (
    <div 
      className={cn(
        "p-4 border-t bg-background relative transition-colors",
        isDragOver && "bg-primary/5 border-primary"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Overlay de drag and drop */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Solte o arquivo aqui</span>
          </div>
        </div>
      )}
      {/* Preview do arquivo selecionado */}
      {arquivoSelecionado && (
        <div className="mb-3 p-3 bg-muted rounded-lg border">
          <div className="flex items-start gap-3">
            {/* Preview de imagem ou ícone de arquivo */}
            {previewUrl ? (
              <div className="relative group cursor-pointer" onClick={() => setShowFullPreview(true)}>
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded-lg border shadow-sm" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Maximize2 className="h-5 w-5 text-white" />
                </div>
              </div>
            ) : (
              <div className="h-20 w-20 bg-background rounded-lg border flex items-center justify-center shadow-sm">
                {getFileIcon(arquivoSelecionado.type)}
              </div>
            )}
            
            {/* Informações do arquivo */}
            <div className="flex-1 min-w-0 py-1">
              <p className="text-sm font-medium truncate">{arquivoSelecionado.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(arquivoSelecionado.size)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isImage ? "Imagem" : arquivoSelecionado.type.split("/")[1]?.toUpperCase() || "Arquivo"}
              </p>
            </div>
            
            {/* Botão remover */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={removerArquivo}
              className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mensagem opcional com arquivo */}
          <p className="text-xs text-muted-foreground mt-2">
            💡 Você pode adicionar uma mensagem junto com o {isImage ? "imagem" : "arquivo"}
          </p>
        </div>
      )}

      {/* Modal de preview completo da imagem */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview completo" 
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg" 
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {arquivoSelecionado?.name}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

        {/* Botões de anexo e emoji */}
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled || enviando}
                title="Inserir emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-72 p-2" 
              side="top" 
              align="start"
              sideOffset={8}
            >
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg hover:bg-muted"
                    onClick={() => setMensagem(prev => prev + emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input com suporte a menções */}
        <MentionInput
          value={mensagem}
          onChange={(val) => {
            setMensagem(val);
            // Emitir evento de digitando
            if (onTyping && val.length > 0) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              onTyping();
              typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
              }, 2000);
            }
          }}
          onKeyDown={handleKeyDown}
          participantes={participantes}
          disabled={disabled || enviando}
          placeholder="Digite sua mensagem... Use @ para mencionar"
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
