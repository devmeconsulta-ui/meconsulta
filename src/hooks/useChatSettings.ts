import { useState, useEffect, useCallback } from "react";

const CHAT_SETTINGS_KEY = "meconsulta_chat_settings";

export interface ChatSettings {
  soundEnabled: boolean;
}

const defaultSettings: ChatSettings = {
  soundEnabled: true,
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);

  // Carregar configurações do localStorage
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

  return {
    settings,
    saveSettings,
    toggleSound,
    isSoundEnabled: settings.soundEnabled,
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
