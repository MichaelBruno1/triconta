export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://triconta:triconta_secret@localhost:5432/triconta',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  API_PORT: parseInt(process.env.API_PORT ?? '3000', 10),
};
