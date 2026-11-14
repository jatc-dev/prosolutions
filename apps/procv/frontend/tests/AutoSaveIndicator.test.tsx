import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AutoSaveIndicator } from '../src/modules/procv/components/editor/components/AutoSaveIndicator';

afterEach(() => cleanup());

describe('AutoSaveIndicator', () => {
  it('muestra estado de guardado cuando isSaving', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving lastSaved={null} hasUnsavedChanges={false} />
    );
    expect(container.querySelector('span')?.textContent).toBe('Guardando...');
  });

  it('muestra cambios sin guardar cuando hay cambios pendientes', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving={false} lastSaved={null} hasUnsavedChanges />
    );
    expect(container.querySelector('span')?.textContent).toBe('Cambios sin guardar');
  });

  it('muestra fecha de último guardado válido', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { container } = render(
      <AutoSaveIndicator isSaving={false} lastSaved={twoHoursAgo} hasUnsavedChanges={false} />
    );
    expect(container.querySelector('span')?.textContent).toBe('Guardado hace 2 horas');
  });

  it('no renderiza nada cuando lastSaved es null', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving={false} lastSaved={null} hasUnsavedChanges={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('no falla con lastSaved como string inválido', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving={false} lastSaved={'not-a-date' as unknown as Date} hasUnsavedChanges={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza lastSaved como string ISO válido de forma defensiva', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <AutoSaveIndicator isSaving={false} lastSaved={twoHoursAgo as unknown as Date} hasUnsavedChanges={false} />
    );
    expect(container.querySelector('span')?.textContent).toBe('Guardado hace 2 horas');
  });
});
