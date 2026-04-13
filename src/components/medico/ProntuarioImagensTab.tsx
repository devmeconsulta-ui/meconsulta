import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera,
  Upload,
  Trash2,
  Loader2,
  ImagePlus,
  X,
  ZoomIn,
  Download,
  ChevronLeft,
  ChevronRight,
  Tag,
  SwitchCamera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProntuarioImagensTabProps {
  consultaId: string;
  medicoId: string;
  pacienteId: string;
}

interface ImagemProntuario {
  id: string;
  arquivo_url: string;
  arquivo_nome: string | null;
  legenda: string | null;
  categoria: string;
  created_at: string;
}

const CATEGORIAS = [
  { value: "geral", label: "Geral", color: "bg-slate-500" },
  { value: "exame_fisico", label: "Exame Físico", color: "bg-blue-500" },
  { value: "ferida", label: "Ferida / Lesão", color: "bg-red-500" },
  { value: "exame_imagem", label: "Exame de Imagem", color: "bg-purple-500" },
  { value: "evolucao", label: "Evolução", color: "bg-green-500" },
  { value: "documento", label: "Documento", color: "bg-amber-500" },
];

export default function ProntuarioImagensTab({
  consultaId,
  medicoId,
  pacienteId,
}: ProntuarioImagensTabProps) {
  const [imagens, setImagens] = useState<ImagemProntuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [categoria, setCategoria] = useState("geral");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchImagens = useCallback(async () => {
    // @ts-ignore
    const { data, error } = await supabase
      .from("prontuario_imagens")
      .select("*")
      .eq("consulta_id", consultaId)
      .eq("medico_id", medicoId)
      .order("created_at", { ascending: false });

    if (!error) setImagens(data || []);
    setLoading(false);
  }, [consultaId, medicoId]);

  useEffect(() => {
    fetchImagens();
  }, [fetchImagens]);

  async function uploadImage(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }
    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${medicoId}/${consultaId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("prontuario-imagens")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      toast.error("Erro ao fazer upload da imagem");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("prontuario-imagens")
      .getPublicUrl(path);

    // @ts-ignore
    const { error: insertError } = await supabase
      .from("prontuario_imagens")
      .insert({
        consulta_id: consultaId,
        medico_id: medicoId,
        paciente_id: pacienteId,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: file.name,
        legenda: legenda || null,
        categoria,
      });

    if (insertError) {
      toast.error("Erro ao salvar registro da imagem");
    } else {
      toast.success("Imagem adicionada ao prontuário!");
      setLegenda("");
      setCategoria("geral");
      fetchImagens();
    }
    setUploading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startCamera() {
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      toast.error("Não foi possível acessar a câmera");
      setCameraOpen(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  }

  async function switchCamera() {
    stopCamera();
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    setTimeout(() => {
      setCameraOpen(true);
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => setCameraReady(true);
          }
        })
        .catch(() => {
          toast.error("Não foi possível trocar a câmera");
          setCameraOpen(false);
        });
    }, 200);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        stopCamera();
        const file = new File([blob], `foto_prontuario_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        await uploadImage(file);
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleDelete(img: ImagemProntuario) {
    if (!confirm("Deseja remover esta imagem do prontuário?")) return;

    // Extract path from URL
    const urlParts = img.arquivo_url.split("/prontuario-imagens/");
    if (urlParts[1]) {
      await supabase.storage.from("prontuario-imagens").remove([urlParts[1]]);
    }

    // @ts-ignore
    await supabase.from("prontuario_imagens").delete().eq("id", img.id);
    toast.success("Imagem removida");
    fetchImagens();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  function getCategoriaInfo(cat: string) {
    return CATEGORIAS.find((c) => c.value === cat) || CATEGORIAS[0];
  }

  const lightboxImage = lightboxIndex !== null ? imagens[lightboxIndex] : null;

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            Imagens do Prontuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Categoria + Legenda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                <Tag className="w-3 h-3" /> Categoria
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Legenda (opcional)</Label>
              <Input
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
                placeholder="Ex: Lesão no antebraço esquerdo"
                className="h-9"
                maxLength={200}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="default"
              onClick={startCamera}
              disabled={uploading}
              className="gap-2 flex-1 min-w-[140px]"
            >
              <Camera className="w-4 h-4" />
              Tirar Foto
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 flex-1 min-w-[140px]"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Anexar Arquivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Camera Modal */}
      {cameraOpen && (
        <Dialog open={cameraOpen} onOpenChange={() => stopCamera()}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner brackets */}
                <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
                <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
                <div className="absolute bottom-20 left-6 w-12 h-12 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
                <div className="absolute bottom-20 right-6 w-12 h-12 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
              </div>

              {/* Controls */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => stopCamera()}
                  className="text-white hover:bg-white/20 rounded-full w-10 h-10"
                >
                  <X className="w-5 h-5" />
                </Button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center shadow-lg"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={switchCamera}
                  className="text-white hover:bg-white/20 rounded-full w-10 h-10"
                >
                  <SwitchCamera className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Gallery */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : imagens.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma imagem adicionada a este prontuário ainda.
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Tire fotos ou anexe arquivos para documentar o atendimento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imagens.map((img, idx) => {
            const catInfo = getCategoriaInfo(img.categoria);
            return (
              <div
                key={img.id}
                className="group relative rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setLightboxIndex(idx)}
              >
                <div className="aspect-square">
                  <img
                    src={img.arquivo_url}
                    alt={img.legenda || "Imagem prontuário"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 inset-x-0 p-2.5">
                    {img.legenda && (
                      <p className="text-white text-xs font-medium truncate mb-1">
                        {img.legenda}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge className={`${catInfo.color} text-white text-[10px] px-1.5 py-0.5`}>
                        {catInfo.label}
                      </Badge>
                      <ZoomIn className="w-4 h-4 text-white/80" />
                    </div>
                  </div>
                </div>

                {/* Category dot */}
                <div className="absolute top-2 right-2">
                  <span className={`w-3 h-3 rounded-full ${catInfo.color} block shadow`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && lightboxIndex !== null && (
        <Dialog open={true} onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none overflow-hidden">
            <div className="relative flex flex-col">
              {/* Image */}
              <div className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh]">
                <img
                  src={lightboxImage.arquivo_url}
                  alt={lightboxImage.legenda || "Imagem"}
                  className="max-w-full max-h-[75vh] object-contain"
                />

                {/* Navigation */}
                {imagens.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((lightboxIndex - 1 + imagens.length) % imagens.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((lightboxIndex + 1) % imagens.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Info bar */}
              <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className={`${getCategoriaInfo(lightboxImage.categoria).color} text-white text-xs shrink-0`}>
                    {getCategoriaInfo(lightboxImage.categoria).label}
                  </Badge>
                  {lightboxImage.legenda && (
                    <p className="text-white/80 text-sm truncate">{lightboxImage.legenda}</p>
                  )}
                  <span className="text-white/40 text-xs shrink-0">
                    {lightboxIndex + 1}/{imagens.length}
                  </span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <a
                    href={lightboxImage.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lightboxImage);
                    }}
                    className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
