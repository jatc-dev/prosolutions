import Joi from 'joi';

function isJsonObjectString(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

const jsonLikeSchema = Joi.alternatives().try(
  Joi.object().unknown(true),
  Joi.string()
    .min(2)
    .custom((value, helpers) => {
      if (!isJsonObjectString(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'JSON object string validation'),
);

export const createCvSchema = Joi.object({
  title: Joi.string().trim().min(1).max(150).required(),
  template: Joi.string().trim().max(80).optional(),
  data: jsonLikeSchema.optional(),
});

export const updateCvSchema = Joi.object({
  title: Joi.string().trim().min(1).max(150).optional(),
  template: Joi.string().trim().max(80).optional(),
  data: jsonLikeSchema.optional(),
}).or('title', 'template', 'data');
