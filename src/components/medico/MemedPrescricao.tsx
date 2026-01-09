import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Pill, 
  Loader2, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    MdSinapsePrescricao: any;
    MdHub: any;
  }
}

interface MemedPrescricaoProps {
  medicoId: string;
  pacienteNome: string;
  pacienteCpf?: string;
  onPrescricaoConcluida?: (prescricao: any) => void;
}

export default function MemedPrescricao({ 
  medicoId, 
  pacienteNome, 
  pacienteCpf,
  onPrescricaoConcluida 
}: MemedPrescricaoProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [memedReady, setMemedReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializingRef = useRef(false);
  const onPrescricaoConcluidaRef = useRef(onPrescricaoConcluida);
  const memedInitializedRef = useRef(false);
  
  // Keep callback ref updated without causing re-renders
  useEffect(() => {
    onPrescricaoConcluidaRef.current = onPrescricaoConcluida;
  }, [onPrescricaoConcluida]);

  // Get Memed token for the doctor
  const getMemedToken = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('memed-auth', {
        body: { action: 'get-token', medico_id: medicoId }
      });

      if (fnError) {
        console.error('Error getting Memed token:', fnError);
        setError('Erro ao conectar com Memed');
        return;
      }

      if (!data?.success) {
        console.error('Memed error:', data);
        setError(data?.error || 'Erro ao autenticar no Memed');
        return;
      }

      console.log('Memed token received:', data.token?.substring(0, 20) + '...');
      setToken(data.token);
      setScriptUrl(data.scriptUrl);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao conectar com Memed');
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [medicoId]);

  // Load Memed script
  useEffect(() => {
    if (!token || !scriptUrl || scriptLoaded) return;

    // Remove any existing Memed script
    const existingScript = document.querySelector('script[data-memed]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add CSS to ensure Memed modal appears on top
    const existingStyle = document.getElementById('memed-styles');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'memed-styles';
      style.textContent = `
        .memed-modal, 
        [class*="memed"], 
        iframe[src*="memed"],
        .md-modal,
        .md-backdrop {
          z-index: 999999 !important;
        }
        .md-backdrop {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(0,0,0,0.5) !important;
        }
      `;
      document.head.appendChild(style);
    }

    console.log('Loading Memed script with token...');
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.dataset.token = token;
    script.dataset.color = '#8B5CF6'; // Purple color matching our theme
    script.dataset.memed = 'true';
    
    // Use a timeout to prevent infinite loading
    const loadTimeout = setTimeout(() => {
      console.error('Memed script load timeout');
      setError('Tempo esgotado ao carregar Memed');
    }, 30000);
    
    script.onload = () => {
      clearTimeout(loadTimeout);
      console.log('Memed script loaded successfully');
      setScriptLoaded(true);
    };

    script.onerror = (e) => {
      clearTimeout(loadTimeout);
      console.error('Error loading Memed script:', e);
      setError('Erro ao carregar script Memed');
    };
    
    // Set src last to trigger load
    script.src = scriptUrl;
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      clearTimeout(loadTimeout);
      // Don't remove script on unmount - it causes issues
    };
  }, [token, scriptUrl, scriptLoaded]);

  // Initialize Memed when script is loaded - run only once
  useEffect(() => {
    if (!scriptLoaded || memedInitializedRef.current) return;
    memedInitializedRef.current = true;

    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max
    let timeoutId: NodeJS.Timeout;

    const checkMemed = () => {
      attempts++;
      console.log(`Checking Memed availability (attempt ${attempts})...`);
      
      // Check if MdHub or MdSinapsePrescricao is available
      if (window.MdHub || window.MdSinapsePrescricao) {
        console.log('Memed SDK available!', {
          MdHub: !!window.MdHub,
          MdSinapsePrescricao: !!window.MdSinapsePrescricao
        });
        
        setMemedReady(true);
        
        // Set up events if available
        if (window.MdSinapsePrescricao?.event) {
          window.MdSinapsePrescricao.event.add('core:moduleInit', (module: any) => {
            console.log('Memed module initialized:', module.name);
          });
          
          window.MdSinapsePrescricao.event.add('core:moduleHide', (module: any) => {
            console.log('Memed module hidden:', module.moduleName);
          });
        }

        // Listen for prescription printed event
        if (window.MdHub?.event) {
          window.MdHub.event.add('prescricaoImpressa', (prescricao: any) => {
            console.log('Prescription printed:', prescricao);
            toast.success('Prescrição emitida com sucesso!');
            onPrescricaoConcluidaRef.current?.(prescricao);
          });
        }
      } else if (attempts < maxAttempts) {
        // Retry after a short delay
        timeoutId = setTimeout(checkMemed, 500);
      } else {
        console.error('Memed SDK not available after max attempts');
        setError('Memed não carregou corretamente. Tente novamente.');
      }
    };

    // Start checking after a brief delay
    timeoutId = setTimeout(checkMemed, 500);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [scriptLoaded]);

  // Open Memed prescription interface
  const openPrescricao = () => {
    console.log('Opening Memed prescription...');
    
    if (!window.MdHub && !window.MdSinapsePrescricao) {
      toast.error('Memed não foi carregado');
      return;
    }

    try {
      // First set patient data
      if (window.MdHub?.command) {
        console.log('Setting patient data:', { nome: pacienteNome, cpf: pacienteCpf });
        window.MdHub.command.send('plataforma.prescricao', 'setPaciente', {
          nome: pacienteNome,
          cpf: pacienteCpf?.replace(/\D/g, '') || undefined,
        });
      }

      // Try to open using MdHub
      if (window.MdHub) {
        // Method 1: Using module.show
        if (window.MdHub.module?.show) {
          console.log('Using MdHub.module.show');
          window.MdHub.module.show('plataforma.prescricao');
          return;
        }
        
        // Method 2: Using command.send
        if (window.MdHub.command?.send) {
          console.log('Using MdHub.command.send');
          window.MdHub.command.send('plataforma.prescricao', 'open');
          return;
        }
      }
      
      // Fallback: Try clicking the anchor element
      const memedLink = document.getElementById('memed-prescricao');
      if (memedLink) {
        console.log('Clicking memed-prescricao element');
        memedLink.click();
        return;
      }
      
      toast.error('Não foi possível abrir o Memed');
    } catch (e) {
      console.error('Error opening Memed:', e);
      toast.error('Erro ao abrir prescrição Memed');
    }
  };

  // Retry connection
  const handleRetry = () => {
    setError(null);
    setToken(null);
    setScriptLoaded(false);
    setMemedReady(false);
    initializingRef.current = false;
    getMemedToken();
  };

  // Remove auto-load - user needs to click to connect
  // useEffect(() => {
  //   getMemedToken();
  // }, [getMemedToken]);

  // Show connect button if not yet connected
  if (!token && !loading && !error) {
    return (
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-500" />
            Prescrição Digital Memed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use a plataforma Memed para prescrever medicamentos com assinatura digital.
          </p>
          <Button 
            onClick={getMemedToken}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Pill className="w-4 h-4" />
            Conectar ao Memed
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Erro na integração Memed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Conectando ao Memed...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pill className="w-5 h-5 text-purple-500" />
          Prescrição Digital Memed
          <Badge variant="secondary" className="ml-auto text-xs">
            {memedReady ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                Pronto
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando...
              </span>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use a plataforma Memed para prescrever medicamentos com assinatura digital, 
          verificação de interações medicamentosas e envio direto para o paciente.
        </p>

        <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium">Paciente: {pacienteNome}</p>
            {pacienteCpf && (
              <p className="text-xs text-muted-foreground">CPF: ***.***.***-{pacienteCpf.slice(-2)}</p>
            )}
          </div>
        </div>

        {/* Hidden anchor element for Memed integration */}
        <a 
          href="#" 
          id="memed-prescricao" 
          style={{ display: 'none' }}
          onClick={(e) => e.preventDefault()}
        >
          Prescrever
        </a>

        <Button 
          onClick={openPrescricao} 
          disabled={!memedReady}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <ExternalLink className="w-4 h-4" />
          {memedReady ? 'Abrir Prescrição Memed' : 'Aguarde o carregamento...'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          🔒 Ambiente de produção
        </p>
      </CardContent>
    </Card>
  );
}
