import { useState, useEffect, useCallback } from "react";

const CHAT_SETTINGS_KEY = "meconsulta_chat_settings";

// Opções de sons disponíveis
export const NOTIFICATION_SOUNDS = [
  {
    id: "default",
    name: "Padrão",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3",
  },
  {
    id: "soft",
    name: "Suave",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1151-when.mp3",
  },
  {
    id: "pop",
    name: "Pop",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1152-piece-of-cake.mp3",
  },
  {
    id: "chime",
    name: "Sino",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1085-to-the-point.mp3",
  },
  {
    id: "bell",
    name: "Campainha",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1149-clearly.mp3",
  },
  {
    id: "ding",
    name: "Ding",
    url: "https://notificationsounds.com/storage/sounds/file-sounds-1154-definite.mp3",
  },
] as const;

export type SoundId = typeof NOTIFICATION_SOUNDS[number]["id"];

export interface ChatSettings {
  soundEnabled: boolean;
  pushEnabled: boolean;
  selectedSound: SoundId;
}

const defaultSettings: ChatSettings = {
  soundEnabled: true,
  pushEnabled: false,
  selectedSound: "default",
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
  const playPreviewSound = useCallback((soundId: SoundId) => {
    const sound = NOTIFICATION_SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;

    try {
      const audio = new Audio(sound.url);
      audio.volume = 0.5;
      audio.crossOrigin = "anonymous";
      
      audio.addEventListener('error', (e) => {
        console.error("Erro ao carregar áudio:", sound.url, e);
      });
      
      audio.play().catch((err) => {
        console.error("Erro ao tocar som:", err.message, sound.url);
      });
    } catch (error) {
      console.error("Erro ao criar Audio:", error);
    }
  }, []);

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

// Função utilitária para obter o som selecionado
export function getSelectedSoundUrl(): string {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const soundId = parsed.selectedSound || "default";
      const sound = NOTIFICATION_SOUNDS.find((s) => s.id === soundId);
      return sound?.url || NOTIFICATION_SOUNDS[0].url;
    }
    return NOTIFICATION_SOUNDS[0].url;
  } catch {
    return NOTIFICATION_SOUNDS[0].url;
  }
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
