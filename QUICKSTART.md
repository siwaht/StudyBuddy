# Quick Start Guide - ElevenLabs AI Call Analytics

## 🚀 Get Started in 5 Minutes

This application is **production-ready** and pre-configured for deployment on Replit.

### Prerequisites
- Supabase account (database already provisioned)
- ElevenLabs API key (optional, can configure later via UI)

---

## Step 1: Update Environment Variables

Open `.env` and update these two values:

```bash
# Get this from: Supabase Dashboard > Project Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# Get this from: Supabase Dashboard > Project Settings > Database > Connection string
# Format: postgresql://postgres.[ref]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Everything else is already configured!**

---

## Step 2: Verify Deployment Readiness

Run the verification script:

```bash
npm run verify
```

You should see all checks passing ✅

---

## Step 3: Deploy

### On Replit (Recommended):

1. Click the **"Deploy"** button
2. Replit will automatically:
   - Run `npm run build`
   - Start the server with `npm run start`
   - Serve on port 5000 (mapped to port 80)

### Manual Deployment:

```bash
# Build for production
npm run build

# Start the server
npm run start
```

The application will be available at `http://localhost:5000` (or your deployment URL)

---

## Step 4: Login

Navigate to `/login` and use the admin credentials:

- **Username:** `cc.siwaht`
- **Email:** `cc@siwaht.com`
- **Password:** (the password you set during user creation)

---

## Step 5: Configure ElevenLabs Integration

1. Go to **Settings → Integrations**
2. Click **"Add Account"**
3. Enter your ElevenLabs API Key
4. Name your account (e.g., "Production")
5. Click **"Test Connection"**
6. **Save**

---

## Step 6: Import AI Agents

1. Go to **Agents** page
2. Click **"Import from ElevenLabs"**
3. Select your configured account
4. Choose agents to import
5. Click **"Sync Conversations"** to fetch call data

---

## 🎉 You're Done!

Your application is now live and ready to track AI call analytics!

### What You Can Do Now:

- **Dashboard**: View call analytics overview
- **Calls**: Browse and filter call history
- **Call Details**: Listen to recordings, read transcripts, view sentiment analysis
- **Analytics**: Deep dive into performance metrics and trends
- **Agents**: Manage and sync AI agents
- **User Management**: Create users and assign agent access (admin only)
- **Settings**: Configure integrations and preferences

---

## 📊 Key Features

### Real-Time Analytics
- Call volume tracking
- Sentiment analysis (positive/negative/neutral)
- Performance metrics
- Duration statistics

### Call Management
- Full transcript viewer
- Audio playback
- Sentiment indicators
- Custom tags and categories
- Search and filtering

### User Access Control
- Role-based permissions (admin/user)
- Agent assignment per user
- Multi-tenant support

### Integrations
- ElevenLabs API integration
- Automatic conversation sync
- Audio recording storage
- Webhook support

---

## 🔧 Common Tasks

### Add a New User

1. Go to **User Management** (admin only)
2. Click **"Create User"**
3. Fill in details (username, email, password, role)
4. **Save**
5. Assign agents to the user

### Sync New Calls

Calls are synced automatically when you:
- Visit the Agents page
- Click "Sync" on a specific agent
- Trigger a manual sync via API

### View Call Details

1. Go to **Calls** page
2. Click on any call
3. View transcript, audio, and analysis
4. Add tags or ratings

### Download Call Data

Use the API endpoints to export data:
- `GET /api/calls?export=csv` - Export calls as CSV
- `GET /api/analytics/report` - Generate analytics report

---

## 🆘 Troubleshooting

### Can't Login?
- Verify admin user exists in database
- Check SESSION_SECRET is set in .env
- Clear browser cookies and try again

### No Audio Playback?
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check Supabase Storage bucket `call-recordings` exists
- Ensure audio files are being uploaded

### Sync Not Working?
- Verify ElevenLabs API key is valid
- Check API key permissions
- Review rate limits on your ElevenLabs account

### Database Connection Error?
- Verify DATABASE_URL includes password
- Check Supabase project is active
- Ensure IP is whitelisted in Supabase

---

## 📚 Documentation

For detailed documentation, see:
- **DEPLOYMENT.md** - Complete deployment guide
- **API Documentation** - See `/api/docs` endpoint
- **Architecture** - Review codebase structure

---

## 🔐 Security Notes

### Production Checklist:
- ✅ Secure SESSION_SECRET generated
- ✅ Rate limiting enabled
- ✅ SQL injection protection
- ✅ Encrypted API keys in database
- ✅ Private storage with signed URLs
- ✅ HTTPS enforced (via platform)

### Best Practices:
- Never commit `.env` file to git
- Rotate SESSION_SECRET periodically
- Use unique passwords for each user
- Monitor rate limit logs
- Keep dependencies updated

---

## 📈 Performance Tips

1. **Database Queries**: All tables have optimized indexes
2. **Caching**: Enable Redis for better performance (optional)
3. **Audio Storage**: Files are served via Supabase CDN
4. **Rate Limiting**: Prevents API abuse
5. **Compression**: Reduces bandwidth by 60-80%

---

## 🚀 Next Steps

### Enhance Your Deployment:
1. Set up monitoring (e.g., Sentry, LogRocket)
2. Configure automated backups
3. Add custom analytics dashboards
4. Implement additional integrations
5. Customize branding and themes

### Advanced Features:
- Custom webhooks for events
- Scheduled reports via email
- Multi-language support
- Advanced filtering and search
- Export to external analytics tools

---

## 💡 Pro Tips

1. **Bulk Import**: Use the sync feature to import all conversations at once
2. **Filtering**: Use tags and categories for better organization
3. **Performance**: Archive old calls to keep queries fast
4. **Security**: Assign users only the agents they need access to
5. **Monitoring**: Check the sync history for any failed operations

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review DEPLOYMENT.md for detailed information
3. Check application logs for error messages
4. Verify environment variables are correct

---

**Version:** 1.0.0
**Last Updated:** 2025-10-01
**Status:** ✅ Production Ready

🎉 Happy Analyzing!
