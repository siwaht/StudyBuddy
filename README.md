# ElevenLabs AI Call Analytics Platform

A production-ready full-stack application for monitoring and analyzing ElevenLabs AI agent conversations with real-time analytics, sentiment tracking, and comprehensive call management.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 📊 Analytics Dashboard
- Real-time call volume tracking
- Sentiment analysis (positive/negative/neutral)
- Performance metrics and trends
- Agent comparison views
- Duration and outcome statistics

### 📞 Call Management
- Complete transcript viewer
- Audio playback with streaming
- Sentiment indicators
- Custom tags and categories
- Advanced search and filtering
- Call rating system

### 👥 User Management
- Role-based access control (admin/user)
- Multi-tenant support
- Agent assignment per user
- Granular permissions

### 🔗 Integrations
- ElevenLabs API integration
- Automatic conversation sync
- Supabase Storage for recordings
- Webhook support
- RESTful API

### 🔐 Security
- Session-based authentication
- Encrypted API key storage
- Rate limiting on all endpoints
- SQL injection protection
- Secure file storage with signed URLs

### 🚀 Performance
- Connection pooling
- Response compression
- Optimized database queries
- Lazy loading
- CDN-backed storage

## 🎯 Quick Start

**Get started in 5 minutes!** See [QUICKSTART.md](./QUICKSTART.md)

```bash
# 1. Install dependencies (already done if using Replit)
npm install

# 2. Update .env with your credentials
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL (with password)

# 3. Verify deployment readiness
npm run verify

# 4. Deploy (on Replit, just click "Deploy")
npm run build
npm run start
```

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[API Documentation](#api-endpoints)** - API reference

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS + shadcn/ui
- TanStack Query
- Wouter (routing)
- Recharts (analytics)
- Framer Motion (animations)

### Backend
- Express.js + TypeScript
- PostgreSQL (via Supabase)
- Drizzle ORM
- WebSocket (ws)
- Session management
- Rate limiting

### Infrastructure
- Supabase (Database + Storage)
- Replit (Deployment)
- Node.js 20.x

## 📦 Project Structure

```
project/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── integrations/    # ElevenLabs integration
│   ├── utils/           # Server utilities
│   ├── routes.ts        # API routes
│   ├── auth.ts          # Authentication
│   ├── db.ts            # Database config
│   └── index.ts         # Server entry
├── shared/              # Shared types/schemas
│   └── schema.ts        # Database schema
├── dist/                # Production build
│   ├── public/          # Frontend bundle
│   └── server/          # Server bundle
├── supabase/            # Supabase migrations
└── scripts/             # Build scripts
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check auth status

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents/import` - Import from ElevenLabs
- `POST /api/agents/:id/sync` - Sync conversations

### Calls
- `GET /api/calls` - List calls (paginated)
- `GET /api/calls/:id` - Get call details
- `GET /api/calls/:id/recording` - Stream recording
- `GET /api/calls/search` - Search calls

### Analytics
- `GET /api/analytics/overview` - Dashboard data
- `GET /api/analytics/trends` - Trend analysis
- `GET /api/analytics/performance` - Performance metrics

### User Management (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `POST /api/users/:id/agents` - Assign agents

## 🛡️ Security Features

- **Authentication**: Session-based with secure cookies
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Prevents API abuse
- **SQL Injection**: Protected via parameterized queries
- **XSS Protection**: Input sanitization
- **Encrypted Storage**: API keys encrypted at rest
- **Signed URLs**: Secure access to private files
- **HTTPS**: Enforced in production

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and permissions
- `agents` - AI agents from ElevenLabs
- `calls` - Call records with transcripts
- `accounts` - Integration accounts
- `performance_metrics` - Call performance data
- `user_agents` - User-agent assignments
- `sync_history` - Synchronization logs

All tables include comprehensive indexes for optimal query performance.

## 🔄 Environment Variables

Required variables:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Database
DATABASE_URL=postgresql://xxx

# Security
SESSION_SECRET=xxx

# Environment
NODE_ENV=production
PORT=5000

# Optional
ELEVENLABS_API_KEY=xxx
```

## 🚦 Rate Limits

- General API: 100 req/15min per user
- Authentication: 5 req/15min per IP
- Analytics: 50 req/15min per user
- Search: 30 req/15min per user
- Mutations: 50 req/15min per user
- Webhooks: 100 req/15min per IP

## 🧪 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Verify deployment
npm run verify

# Push database schema
npm run db:push
```

## 📈 Performance

The application is optimized for production:

- **Build Size**: ~1.5MB gzipped
- **First Load**: <3s on 3G
- **Database Queries**: Optimized with indexes
- **API Response**: <100ms average
- **Compression**: 60-80% size reduction

## 🔧 Configuration

### Replit Deployment

Already configured in `.replit`:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]
```

### Environment Setup

1. Database is pre-provisioned via Supabase
2. Admin user already created
3. Session secret already generated
4. Production build completed

**Just update the credentials and deploy!**

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🐛 Troubleshooting

See [QUICKSTART.md](./QUICKSTART.md#troubleshooting) for common issues and solutions.

## 📞 Support

- Check the documentation files
- Review application logs
- Verify environment variables
- Test database connection

## 🎉 Credits

Built with:
- React
- Express
- Supabase
- ElevenLabs API
- shadcn/ui
- TailwindCSS

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-10-01

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

For complete deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)
