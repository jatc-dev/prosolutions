import Joi from 'joi';

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&+#=\-_/.,:;|~^<>(){}[\]'"\\]{8,}$/;

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(passwordRegex).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
  name: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).pattern(passwordRegex).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});
