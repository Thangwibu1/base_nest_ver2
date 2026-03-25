import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('/api/v1'),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().default(6379),

  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().optional(),
});
