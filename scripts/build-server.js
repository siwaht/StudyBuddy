import esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  console.log('Building server...');
  
  try {
    // Clean dist/server directory
    const distDir = path.join(__dirname, '..', 'dist', 'server');
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });

    // Build the server
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/server/index.js',
      external: [
        'express',
        'express-session',
        'connect-pg-simple',
        'compression',
        '@neondatabase/serverless',
        'drizzle-orm',
        'drizzle-zod',
        'bcrypt',
        'passport',
        'passport-local',
        'express-rate-limit',
        'vite',
        'nanoid',
        'ws',
        '@elevenlabs/client',
        '@elevenlabs/elevenlabs-js'
      ],
      sourcemap: true,
      minify: false,
      metafile: true,
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
      }
    });

    console.log('✅ Server build complete');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();