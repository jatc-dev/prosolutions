import { describe, it, expect } from '@jest/globals';
import { createCvSchema, updateCvSchema } from '../../src/validation/cvValidation';

describe('cvValidation', () => {
  describe('createCvSchema', () => {
    it('accepts valid payload with object data', () => {
      const { error } = createCvSchema.validate({
        title: 'Mi CV',
        template: 'sidebar',
        data: {
          personal: {
            summary: 'Resumen',
            valueProposition: 'Propuesta',
          },
        },
      });

      expect(error).toBeUndefined();
    });

    it('rejects payload without title', () => {
      const { error } = createCvSchema.validate({ template: 'sidebar' });
      expect(error).toBeDefined();
    });

    it('rejects invalid JSON string in data', () => {
      const { error } = createCvSchema.validate({
        title: 'Mi CV',
        data: 'not-json',
      });
      expect(error).toBeDefined();
    });

    it('rejects JSON array string in data', () => {
      const { error } = createCvSchema.validate({
        title: 'Mi CV',
        data: JSON.stringify(['a', 'b']),
      });
      expect(error).toBeDefined();
    });
  });

  describe('updateCvSchema', () => {
    it('accepts partial payload', () => {
      const { error } = updateCvSchema.validate({
        data: JSON.stringify({ personal: { summary: 'ok' } }),
      });
      expect(error).toBeUndefined();
    });

    it('rejects empty payload', () => {
      const { error } = updateCvSchema.validate({});
      expect(error).toBeDefined();
    });

    it('rejects invalid JSON string in partial update', () => {
      const { error } = updateCvSchema.validate({
        data: 'invalid-json',
      });
      expect(error).toBeDefined();
    });
  });
});
