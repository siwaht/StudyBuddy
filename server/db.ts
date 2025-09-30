import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  const errorMsg = process.env.NODE_ENV === 'production'
    ? 'DATABASE_URL environment variable is required in production. Please configure your database connection.'
    : 'DATABASE_URL must be set. Did you forget to provision a database?';
  throw new Error(errorMsg);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
