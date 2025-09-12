# Overview

This is a comprehensive AI voice agent platform that manages and analyzes voice agents built with ElevenLabs and connected via LiveKit. The platform provides real-time monitoring, call analytics, performance metrics, and user management capabilities. It features a modern web interface with dashboard views, detailed call analysis, and administrative tools for managing voice agents and their interactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for build tooling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Charts**: Recharts for data visualization and analytics dashboards

The frontend follows a component-based architecture with separate pages for dashboard, call details, and user management. The UI uses a dark sidebar with light content area design pattern optimized for data visualization.

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API structure with organized route handlers
- **Data Layer**: Abstracted storage interface supporting multiple implementations
- **Development**: Hot module replacement via Vite middleware in development
- **Build**: ESBuild for production bundling with external packages

The backend implements a clean separation between route handlers and data access, making it easy to switch between different storage implementations.

## Database Schema
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Comprehensive data model including:
  - Users with role-based access (admin, supervisor, analyst, viewer)
  - Agents supporting both ElevenLabs and LiveKit platforms
  - Calls with detailed metadata, transcripts, and analysis
  - Performance metrics tracking latency and quality
  - LiveKit rooms for real-time communication

The schema supports complex analytics with JSON fields for flexible metadata storage and proper foreign key relationships.

## Authentication & Authorization
- **Role-based Access**: Four-tier permission system (admin, supervisor, analyst, viewer)
- **Session Management**: Configured for PostgreSQL session storage
- **User Management**: Complete CRUD operations with password security

# External Dependencies

## Core Voice Services
- **ElevenLabs**: AI voice synthesis and speech processing
- **LiveKit**: Real-time communication infrastructure for voice/video

## Database & Storage
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Drizzle**: Type-safe ORM with PostgreSQL support
- **Session Storage**: PostgreSQL-based session management (connect-pg-simple)

## UI Framework & Components
- **Radix UI**: Comprehensive accessible component primitives
- **Shadcn/ui**: Pre-built component library with consistent design system
- **Recharts**: React charting library for analytics visualizations
- **Lucide React**: Modern icon library

## Development Tools
- **Vite**: Fast build tool with HMR and development server
- **TypeScript**: Full type safety across frontend and backend
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form validation and management

## Deployment & Monitoring
- **Replit Integration**: Platform-specific development tools and banner
- **ESBuild**: Production bundling and optimization
- **Express Middleware**: Request logging and error handling