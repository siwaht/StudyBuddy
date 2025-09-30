import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  const errorMsg = process.env.NODE_ENV === 'production'
    ? 'DATABASE_URL environment variable is required in production. Please configure your database connection.'
    : 'DATABASE_URL must be set. Please provision a Supabase database and update the DATABASE_URL in your .env file.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database connection established successfully');
});

export const db = drizzle({ client: pool, schema });

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✓ Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('✗ Database connection test failed:');
    console.error('Error:', error.message);

    if (error.message?.includes('Tenant or user not found')) {
      console.error('\n⚠️  Database Issue: The Supabase database may not be properly provisioned.');
      console.error('Please ensure:');
      console.error('  1. Your Supabase project is active');
      console.error('  2. The DATABASE_URL in .env is correct');
      console.error('  3. Run "npm run db:push" to create the necessary tables\n');
    }

    return false;
  }
}
