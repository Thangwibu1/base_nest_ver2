export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },
  db: {
    url: process.env.DATABASE_URL,
    ssl: String(process.env.DB_SSL) === 'true',
  },
});

export interface EnvConfig {
  app: {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
  };
  db: {
    url: string;
    ssl: boolean;
  };
}
