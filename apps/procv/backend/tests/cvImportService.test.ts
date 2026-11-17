import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCVFileToDraft } from '../src/services/cvImportService';

const fixturesDirectory = path.join(__dirname, 'fixtures');
const pdfFixtures = [
  '01_cv_completo.pdf',
  '02_cv_registros_parciales.pdf',
  '03_cv_con_registros_para_excluir_o_completar.pdf',
  '04_cv_basico_sin_secciones_secundarias.pdf',
];

describe('parseCVFileToDraft PDF imports', () => {
  it.each(pdfFixtures)('parses the synthetic fixture %s', async fileName => {
    const buffer = await fs.readFile(path.join(fixturesDirectory, fileName));

    const result = await parseCVFileToDraft(buffer, 'application/pdf', fileName);

    expect(result.extractedTextPreview.trim().length).toBeGreaterThan(0);
    expect(result.parsedData.personal.fullName?.trim().length).toBeGreaterThan(0);
    // Los fixtures son documentos sintéticos QA con datos ficticios; nunca credenciales reales.
    expect(result.extractedTextPreview).toContain('DOCUMENTO SINTÉTICO');
  });

  it('rejects unsupported file content types', async () => {
    await expect(
      parseCVFileToDraft(
        Buffer.from('not a supported upload'),
        'application/octet-stream',
        'fixture.bin',
      ),
    ).rejects.toThrow('Unsupported file format');
  });
});
