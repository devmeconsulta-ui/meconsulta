import { useState, useEffect, useCallback } from "react";

const CHAT_SETTINGS_KEY = "meconsulta_chat_settings";

// Opções de sons disponíveis (gerados via Web Audio API)
export const NOTIFICATION_SOUNDS = [
  { id: "default", name: "Padrão" },
  { id: "soft", name: "Suave" },
  { id: "pop", name: "Pop" },
  { id: "chime", name: "Sino" },
  { id: "bell", name: "Campainha" },
  { id: "ding", name: "Ding" },
] as const;

// AudioContext global para evitar criação repetida
let globalAudioContext: AudioContext | null = null;
let audioContextInitialized = false;

function getAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === "closed") {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log("[Chat Sound] Novo AudioContext criado, state:", globalAudioContext.state);
  }
  return globalAudioContext;
}

// Inicializar AudioContext na primeira interação do usuário
function initAudioContextOnInteraction() {
  if (audioContextInitialized) return;
  
  const initContext = () => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        console.log("[Chat Sound] AudioContext ativado via interação do usuário");
        audioContextInitialized = true;
      });
    } else {
      audioContextInitialized = true;
    }
  };

  // Eventos que podem desbloquear o AudioContext
  ["click", "touchstart", "keydown"].forEach(event => {
    document.addEventListener(event, initContext, { once: true, passive: true });
  });
}

// Inicializar listeners quando o módulo carregar
if (typeof window !== "undefined") {
  initAudioContextOnInteraction();
}

// Função para gerar sons usando Web Audio API
function playGeneratedSound(soundId: string, volume: number = 0.5) {
  try {
    console.log("[Chat Sound] playGeneratedSound:", soundId, "volume:", volume);
    const audioContext = getAudioContext();
    console.log("[Chat Sound] AudioContext state:", audioContext.state, "initialized:", audioContextInitialized);
    
    // Resumir contexto se estiver suspenso (requerido por alguns navegadores)
    if (audioContext.state === "suspended") {
      console.log("[Chat Sound] Resumindo AudioContext suspenso...");
      audioContext.resume().then(() => {
        console.log("[Chat Sound] AudioContext resumido, executando som");
        executeSound(audioContext, soundId, volume);
      }).catch(err => {
        console.error("[Chat Sound] Erro ao resumir AudioContext:", err);
      });
    } else {
      console.log("[Chat Sound] Executando som diretamente");
      executeSound(audioContext, soundId, volume);
    }
  } catch (error) {
    console.error("[Chat Sound] Erro ao gerar som:", error);
  }
}

function executeSound(audioContext: AudioContext, soundId: string, volume: number) {
  try {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;

    switch (soundId) {
      case "default": {
        // Som padrão: dois tons rápidos
        const osc1 = audioContext.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now);
        osc1.connect(gainNode);
        osc1.start(now);
        osc1.stop(now + 0.1);

        const osc2 = audioContext.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1100, now + 0.12);
        osc2.connect(gainNode);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.22);
        break;
      }
      case "soft": {
        // Som suave: onda senoidal com fade
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
        
        const softGain = audioContext.createGain();
        softGain.gain.setValueAtTime(volume, now);
        softGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.connect(softGain);
        softGain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case "pop": {
        // Som pop: tom curto e agudo
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        
        const popGain = audioContext.createGain();
        popGain.gain.setValueAtTime(volume, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(popGain);
        popGain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case "chime": {
        // Sino: múltiplos harmônicos
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          
          const chimeGain = audioContext.createGain();
          chimeGain.gain.setValueAtTime(volume * (1 - i * 0.2), now + i * 0.05);
          chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          
          osc.connect(chimeGain);
          chimeGain.connect(audioContext.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + 0.5);
        });
        break;
      }
      case "bell": {
        // Campainha: tom com vibrato
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        
        const vibrato = audioContext.createOscillator();
        vibrato.frequency.setValueAtTime(15, now);
        const vibratoGain = audioContext.createGain();
        vibratoGain.gain.setValueAtTime(30, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(now);
        vibrato.stop(now + 0.4);
        
        const bellGain = audioContext.createGain();
        bellGain.gain.setValueAtTime(volume, now);
        bellGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc.connect(bellGain);
        bellGain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case "ding": {
        // Ding: tom único claro
        const osc = audioContext.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
        
        const dingGain = audioContext.createGain();
        dingGain.gain.setValueAtTime(volume, now);
        dingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.connect(dingGain);
        dingGain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      default: {
        // Fallback: tom simples
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    }
  } catch (error) {
    console.error("Erro ao executar som:", error);
  }
}

export type SoundId = typeof NOTIFICATION_SOUNDS[number]["id"];

export interface ChatSettings {
  soundEnabled: boolean;
  pushEnabled: boolean;
  selectedSound: SoundId;
  volume: number; // 0 a 1
}

const defaultSettings: ChatSettings = {
  soundEnabled: true,
  pushEnabled: false,
  selectedSound: "default",
  volume: 0.5,
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Carregar configurações do localStorage e verificar permissão
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do chat:", error);
    }

    // Verificar permissão de notificação
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Salvar configurações no localStorage
  const saveSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Erro ao salvar configurações do chat:", error);
      }
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    saveSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, saveSettings]);

  // Solicitar permissão para notificações push
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.log("Este navegador não suporta notificações");
      return false;
    }

    if (Notification.permission === "granted") {
      setPushPermission("granted");
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      return permission === "granted";
    }

    return false;
  }, []);

  // Habilitar/desabilitar notificações push
  const togglePush = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPushPermission();
      if (granted) {
        saveSettings({ pushEnabled: true });
      }
      return granted;
    } else {
      saveSettings({ pushEnabled: false });
      return true;
    }
  }, [requestPushPermission, saveSettings]);

  // Tocar som de prévia
  const playPreviewSound = useCallback((soundId: SoundId, customVolume?: number) => {
    playGeneratedSound(soundId, customVolume ?? settings.volume);
  }, [settings.volume]);

  return {
    settings,
    saveSettings,
    toggleSound,
    togglePush,
    isSoundEnabled: settings.soundEnabled,
    isPushEnabled: settings.pushEnabled,
    selectedSound: settings.selectedSound,
    pushPermission,
    requestPushPermission,
    playPreviewSound,
  };
}

// Função utilitária para verificar se o som está ativado (para uso fora de componentes React)
export function isChatSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.soundEnabled !== false;
    }
    return true; // Default é ativado
  } catch {
    return true;
  }
}

// Função utilitária para obter o ID do som selecionado
export function getSelectedSoundId(): SoundId {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.selectedSound || "default";
    }
    return "default";
  } catch {
    return "default";
  }
}

// Função utilitária para obter o volume configurado
export function getChatVolume(): number {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return typeof parsed.volume === "number" ? parsed.volume : 0.5;
    }
    return 0.5;
  } catch {
    return 0.5;
  }
}

// Função para tocar o som de notificação (exportada para uso em outros hooks)
export function playChatNotificationSound(): void {
  console.log("[Chat Sound] playChatNotificationSound chamado");
  const enabled = isChatSoundEnabled();
  console.log("[Chat Sound] Som habilitado:", enabled);
  if (!enabled) return;
  
  const soundId = getSelectedSoundId();
  const volume = getChatVolume();
  console.log("[Chat Sound] Som selecionado:", soundId, "Volume:", volume);
  playGeneratedSound(soundId, volume);
}

// Função utilitária para verificar se push está ativado
export function isChatPushEnabled(): boolean {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.pushEnabled === true && Notification.permission === "granted";
    }
    return false;
  } catch {
    return false;
  }
}

// Função para enviar notificação push
export function sendChatPushNotification(title: string, body: string, onClick?: () => void): void {
  if (!isChatPushEnabled()) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "chat-message",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // Auto-fechar após 5 segundos
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
  }
}
