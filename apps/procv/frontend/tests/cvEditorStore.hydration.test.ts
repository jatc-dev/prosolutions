import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createInitialCVData,
  useCVEditorStore,
} from '../src/stores/cvEditorStore';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const STORAGE_KEY = 'cv-editor-storage';

function persistState(state: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { persistedAt: Date.now(), ...state }, version: 0 }));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

function resetStore() {
  useCVEditorStore.setState({
    cvData: { ...createInitialCVData() },
    activeSection: 'personal',
    lastSaved: null,
    isGuest: false,
    hasUnsavedChanges: false,
  });
}

beforeEach(() => {
  clearStorage();
  resetStore();
});

afterEach(() => {
  clearStorage();
});

describe('cvEditorStore hidratación (lastSaved)', () => {
  it('normaliza lastSaved de string ISO a Date válido al rehidratar', async () => {
    const iso = '2026-11-13T20:00:00.000Z';
    persistState({
      cvData: { ...createInitialCVData(), title: 'CV de prueba' },
      activeSection: 'experience',
      lastSaved: iso,
      isGuest: true,
    });

    await useCVEditorStore.persist.rehydrate();

    const state = useCVEditorStore.getState();
    expect(state.lastSaved).toBeInstanceOf(Date);
    expect((state.lastSaved as Date).toISOString()).toBe(iso);
    expect(state.activeSection).toBe('experience');
    expect(state.isGuest).toBe(true);
    expect(state.cvData.title).toBe('CV de prueba');
  });

  it('mantiene lastSaved null cuando no hay valor persistido', async () => {
    persistState({
      cvData: createInitialCVData(),
      activeSection: 'personal',
      lastSaved: null,
      isGuest: false,
    });

    await useCVEditorStore.persist.rehydrate();

    expect(useCVEditorStore.getState().lastSaved).toBeNull();
  });

  it('convierte lastSaved inválido a null en lugar de Date inválida', async () => {
    persistState({
      cvData: createInitialCVData(),
      activeSection: 'personal',
      lastSaved: 'not-a-date',
      isGuest: false,
    });

    await useCVEditorStore.persist.rehydrate();

    expect(useCVEditorStore.getState().lastSaved).toBeNull();
  });

  it('preserva íntegramente cvData, activeSection e isGuest tras la hidratación', async () => {
    const initial = createInitialCVData();
    persistState({
      cvData: { ...initial, title: 'Otro título', template: 'executive' },
      activeSection: 'certificates',
      lastSaved: '2026-11-13T20:30:00.000Z',
      isGuest: true,
    });

    await useCVEditorStore.persist.rehydrate();

    const state = useCVEditorStore.getState();
    expect(state.lastSaved).toBeInstanceOf(Date);
    expect(state.cvData.title).toBe('Otro título');
    expect(state.cvData.template).toBe('executive');
    expect(state.activeSection).toBe('certificates');
    expect(state.isGuest).toBe(true);
    expect(state.originalCvData).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
