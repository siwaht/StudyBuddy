-- Production SQL to add admin user
-- IMPORTANT: Replace 'YOUR_HASHED_PASSWORD' with the bcrypt hash of your password
-- You can generate this hash using: https://bcrypt-generator.com/ with 10 rounds
-- For password 'Hola173!' the hash is: $2a$10$YOUR_ACTUAL_HASH_HERE

-- First check if user exists
SELECT id, email, role FROM users WHERE email = 'cc@siwaht.com';

-- If user doesn't exist, insert new admin user
-- REPLACE THE HASH BELOW WITH YOUR ACTUAL BCRYPT HASH
INSERT INTO users (
  id,
  username,
  email,
  password,
  role,
  is_active,
  permissions,
  last_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'cc.siwaht',
  'cc@siwaht.com',
  '$2a$10$YOUR_ACTUAL_BCRYPT_HASH_HERE', -- REPLACE THIS!
  'admin',
  true,
  '{"canManageUsers":true,"canManageAgents":true,"canViewAnalytics":true,"canExportData":true,"canManageIntegrations":true,"canViewAllCalls":true,"canDeleteCalls":true,"canManageWebhooks":true,"canManageApiKeys":true,"canViewBilling":true}'::jsonb,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT id, username, email, role, is_active FROM users WHERE email = 'cc@siwaht.com';