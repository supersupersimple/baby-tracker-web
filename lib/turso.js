import { createClient } from '@libsql/client';

// Create Turso client for production
export const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Check if we're using Turso (production) or SQLite (development)
export const isTurso = () => {
  return process.env.DATABASE_URL?.startsWith('libsql://') || false;
};

export default turso;