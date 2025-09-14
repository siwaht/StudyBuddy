# Setting Up ElevenLabs in Production

## Important: Production vs Development Databases
Your production deployment uses a separate database from your local development environment. Any agents or accounts you add locally will NOT appear in production unless you add them there too.

## Steps to Add ElevenLabs Agents to Production

### 1. Add Your ElevenLabs API Key in Production

1. Go to your production app URL
2. Log in with your admin account (cc@siwaht.com)
3. Navigate to **Integrations** in the sidebar
4. Click **Add Account**
5. Enter:
   - Account Name: "Production ElevenLabs"
   - Service: ElevenLabs
   - API Key: Your ElevenLabs API key (starts with `sk_` or `xi-`)
   - **NOT your agent ID (which starts with `agent_`)**
6. Click **Create Account**

### 2. Import Your Agent

1. Go to **Agent Config** in the sidebar
2. Click **Import Agent**
3. Select your ElevenLabs account from the dropdown
4. Enter your Agent ID (starts with `agent_`)
5. Click **Import Agent**

### 3. Verify Import

1. The agent should now appear in your agents list
2. You can sync conversations by clicking the sync button on the agent

## Getting Your ElevenLabs Credentials

### API Key:
1. Go to https://elevenlabs.io/app/settings/api-keys
2. Copy your API key (starts with `sk_` or `xi-`)

### Agent ID:
1. Go to https://elevenlabs.io/app/conversational-ai
2. Click on your agent
3. Copy the Agent ID from the agent settings or URL

## Troubleshooting

### "Invalid API Key" Error
- Make sure you're using your API key (sk_/xi-), NOT your agent ID (agent_)
- Check that you've copied the entire key without spaces

### Agent Not Importing
- Verify the agent ID is correct
- Ensure your ElevenLabs account has access to the agent
- Check that the API key has the necessary permissions

### Data Not Persisting
- Production uses a separate database from development
- You must perform all setup steps in the production environment
- Data added locally will not appear in production

## Environment Variables (For Deployment)

If you prefer to set the API key as an environment variable instead:
1. Add `ELEVENLABS_API_KEY=your_api_key_here` to your deployment secrets
2. The app will use this as a fallback if no account is configured

## Note on Database Separation

Remember: Your local development and production deployments have completely separate databases. This means:
- Agents imported locally won't appear in production
- Accounts added locally won't exist in production
- You need to configure everything separately for each environment