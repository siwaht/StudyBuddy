#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if all critical components are ready for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHECKS = {
  'Environment Variables': () => {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      return { passed: false, message: '.env file not found' };
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const required = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'DATABASE_URL',
      'SESSION_SECRET'
    ];

    const missing = required.filter(key => !envContent.includes(key));
    if (missing.length > 0) {
      return { passed: false, message: `Missing: ${missing.join(', ')}` };
    }

    return { passed: true, message: 'All required variables present' };
  },

  'Production Build': () => {
    const distPublic = path.join(__dirname, 'dist', 'public');
    const distServer = path.join(__dirname, 'dist', 'server');
    const indexHtml = path.join(distPublic, 'index.html');
    const serverJs = path.join(distServer, 'index.js');

    if (!fs.existsSync(distPublic)) {
      return { passed: false, message: 'dist/public not found - run npm run build' };
    }

    if (!fs.existsSync(distServer)) {
      return { passed: false, message: 'dist/server not found - run npm run build' };
    }

    if (!fs.existsSync(indexHtml)) {
      return { passed: false, message: 'Frontend build incomplete' };
    }

    if (!fs.existsSync(serverJs)) {
      return { passed: false, message: 'Server build incomplete' };
    }

    return { passed: true, message: 'Production build complete' };
  },

  'Package Dependencies': () => {
    const packageJson = path.join(__dirname, 'package.json');
    const nodeModules = path.join(__dirname, 'node_modules');

    if (!fs.existsSync(packageJson)) {
      return { passed: false, message: 'package.json not found' };
    }

    if (!fs.existsSync(nodeModules)) {
      return { passed: false, message: 'node_modules not found - run npm install' };
    }

    return { passed: true, message: 'Dependencies installed' };
  },

  'Replit Configuration': () => {
    const replitConfig = path.join(__dirname, '.replit');

    if (!fs.existsSync(replitConfig)) {
      return { passed: false, message: '.replit file not found' };
    }

    const config = fs.readFileSync(replitConfig, 'utf-8');
    if (!config.includes('deploymentTarget = "autoscale"')) {
      return { passed: false, message: 'Autoscale deployment not configured' };
    }

    if (!config.includes('build = ["npm", "run", "build"]')) {
      return { passed: false, message: 'Build command not configured' };
    }

    return { passed: true, message: 'Replit deployment configured' };
  },

  'Database Schema': () => {
    const schemaPath = path.join(__dirname, 'shared', 'schema.ts');

    if (!fs.existsSync(schemaPath)) {
      return { passed: false, message: 'Database schema file not found' };
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const requiredTables = ['users', 'agents', 'calls', 'accounts', 'performanceMetrics'];
    const missingTables = requiredTables.filter(table => !schema.includes(`export const ${table} = pgTable`));

    if (missingTables.length > 0) {
      return { passed: false, message: `Missing tables: ${missingTables.join(', ')}` };
    }

    return { passed: true, message: 'Database schema complete' };
  },

  'Security Configuration': () => {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      return { passed: false, message: '.env file not found' };
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');

    // Check if SESSION_SECRET is set and not a default value
    if (!envContent.includes('SESSION_SECRET=') || envContent.includes('SESSION_SECRET=your')) {
      return { passed: false, message: 'SESSION_SECRET not properly configured' };
    }

    // Check if NODE_ENV is set to production
    if (!envContent.includes('NODE_ENV=production')) {
      return { passed: false, message: 'NODE_ENV not set to production' };
    }

    return { passed: true, message: 'Security configuration ready' };
  },

  'Server Configuration': () => {
    const serverPath = path.join(__dirname, 'server', 'index.ts');

    if (!fs.existsSync(serverPath)) {
      return { passed: false, message: 'Server entry point not found' };
    }

    const server = fs.readFileSync(serverPath, 'utf-8');

    // Check for essential middleware
    const required = [
      'compression',
      'rateLimiter',
      'authenticate',
      'gracefulShutdown'
    ];

    const missing = required.filter(item => !server.includes(item));
    if (missing.length > 0) {
      return { passed: false, message: `Missing: ${missing.join(', ')}` };
    }

    return { passed: true, message: 'Server properly configured' };
  }
};

function runChecks() {
  console.log('\n🔍 Running Deployment Verification Checks...\n');
  console.log('═'.repeat(60));

  let allPassed = true;
  const results = [];

  for (const [name, check] of Object.entries(CHECKS)) {
    try {
      const result = check();
      results.push({ name, ...result });

      const icon = result.passed ? '✅' : '❌';
      const status = result.passed ? 'PASS' : 'FAIL';

      console.log(`${icon} ${name.padEnd(30)} [${status}]`);
      console.log(`   ${result.message}`);
      console.log('─'.repeat(60));

      if (!result.passed) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${name.padEnd(30)} [ERROR]`);
      console.log(`   ${error.message}`);
      console.log('─'.repeat(60));
      allPassed = false;
    }
  }

  console.log('═'.repeat(60));

  if (allPassed) {
    console.log('\n✅ All checks passed! Application is ready for deployment.\n');
    console.log('Next steps:');
    console.log('  1. Update SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('  2. Update DATABASE_URL password in .env');
    console.log('  3. Deploy to Replit or your chosen platform');
    console.log('  4. Configure ElevenLabs integration via UI\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some checks failed. Please address the issues above.\n');
    process.exit(1);
  }
}

runChecks();
