import { useCallback, useEffect, useRef, useState } from 'react';

/** Below this width the form and the preview do not fit side by side. */
export const SPLIT_VIEW_QUERY = '(min-width: 1024px)';
const PREVIEW_PREFERENCE_KEY = 'procv.editor.preview';

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true;
}

function readPreference(): boolean {
  try {
    return localStorage.getItem(PREVIEW_PREFERENCE_KEY) !== 'hidden';
  } catch {
    return true;
  }
}

/**
 * Layout of the CV editor:
 * - Wide screens: form and preview side by side; the preview can be hidden
 *   and that choice is remembered.
 * - Narrow screens: one view at a time, always starting on the form; a
 *   floating button switches to the preview and back, restoring the form's
 *   scroll position. Crossing the breakpoint never leaves the form hidden.
 */
export function useEditorLayout() {
  const [isSplit, setIsSplit] = useState(() => matches(SPLIT_VIEW_QUERY));
  const [splitPreview, setSplitPreview] = useState(readPreference);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const formScrollRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(SPLIT_VIEW_QUERY);
    const onChange = () => {
      setIsSplit(media.matches);
      setMobileView('form');
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREVIEW_PREFERENCE_KEY, splitPreview ? 'shown' : 'hidden');
    } catch {
      // Storage may be blocked; the preference simply resets on reload.
    }
  }, [splitPreview]);

  const showMobileView = useCallback((view: 'form' | 'preview') => {
    if (view === 'preview') {
      formScrollRef.current = window.scrollY;
      setMobileView('preview');
      window.scrollTo({ top: 0 });
    } else {
      setMobileView('form');
      // Wait for the form to be displayed again before restoring its position.
      requestAnimationFrame(() => window.scrollTo({ top: formScrollRef.current }));
    }
  }, []);

  const togglePreview = useCallback(() => {
    if (isSplit) setSplitPreview((value) => !value);
    else showMobileView(mobileView === 'preview' ? 'form' : 'preview');
  }, [isSplit, mobileView, showMobileView]);

  // Escape returns from the full-screen preview to the form on narrow screens.
  useEffect(() => {
    if (isSplit || mobileView !== 'preview') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') showMobileView('form');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSplit, mobileView, showMobileView]);

  return {
    isSplit,
    previewVisible: isSplit ? splitPreview : mobileView === 'preview',
    formVisible: isSplit || mobileView === 'form',
    togglePreview,
  };
}
