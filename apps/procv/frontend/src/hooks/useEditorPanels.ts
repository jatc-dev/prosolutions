import { useEffect, useState } from "react";

export type EditorPanelState = {
  quickStart: boolean;
  ats: boolean;
  aiSuggestions: boolean;
};

const DEFAULT_EDITOR_PANELS: EditorPanelState = {
  quickStart: false,
  ats: false,
  aiSuggestions: false,
};

export function useEditorPanels(storageKey: string) {
  const [editorPanels, setEditorPanels] = useState<EditorPanelState>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_EDITOR_PANELS;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return DEFAULT_EDITOR_PANELS;
      }

      const parsed = JSON.parse(raw) as Partial<EditorPanelState>;
      return {
        quickStart: typeof parsed.quickStart === "boolean" ? parsed.quickStart : DEFAULT_EDITOR_PANELS.quickStart,
        ats: typeof parsed.ats === "boolean" ? parsed.ats : DEFAULT_EDITOR_PANELS.ats,
        aiSuggestions:
          typeof parsed.aiSuggestions === "boolean" ? parsed.aiSuggestions : DEFAULT_EDITOR_PANELS.aiSuggestions,
      };
    } catch {
      return DEFAULT_EDITOR_PANELS;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(editorPanels));
  }, [editorPanels, storageKey]);

  return { editorPanels, setEditorPanels };
}

