# RhythmAI - AI-Powered Dance Learning Platform

## Overview

RhythmAI is a full-stack web application that teaches users to dance with real-time AI feedback. Users can browse a library of dance videos, practice with pose detection that compares their movements to instructors, track progress through a gamified leveling system, and customize their avatar. The platform uses TensorFlow.js BlazePose for client-side pose detection and integrates with OpenAI for AI coaching features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Pose Detection**: TensorFlow.js with BlazePose model running entirely client-side via WebGL backend
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Pattern**: REST endpoints defined in `server/routes.ts` with typed contracts in `shared/routes.ts`
- **Authentication**: Replit OpenID Connect integration with Passport.js and session-based auth stored in PostgreSQL

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: 
  - `users`, `sessions` - Authentication (required for Replit Auth)
  - `conversations`, `messages` - AI chat history
  - `userProfiles` - Dance-specific user data with XP, levels, avatar config
  - `danceVideos` - Video library metadata
  - `practiceSessions` - User practice history with scores
  - `userFavorites` - Saved videos

### Authentication Flow
- Uses Replit's OpenID Connect provider
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Protected routes check `req.isAuthenticated()` middleware
- Frontend redirects to `/api/login` for unauthenticated users

### AI Integrations (Replit AI Integrations)
Located in `server/replit_integrations/`:
- **Chat**: Text-based AI conversations via OpenAI
- **Image**: Image generation via `gpt-image-1`
- **Audio**: Voice chat with speech-to-text and text-to-speech, including streaming PCM16 audio playback via AudioWorklet

### Build System
- Development: `tsx server/index.ts` with Vite middleware for HMR
- Production: Custom build script (`script/build.ts`) using esbuild for server and Vite for client
- Output: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and type-safe queries
- Schema push command: `npm run db:push`

### Authentication
- **Replit OpenID Connect**: Requires `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` environment variables

### AI Services (via Replit AI Integrations)
- **OpenAI API**: Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Models used: `gpt-audio-mini` for voice, `gpt-image-1` for images

### Client-Side ML
- **TensorFlow.js**: Pose detection runs in browser using WebGL
- **BlazePose Model**: Downloaded at runtime, no server-side ML processing

### Key NPM Packages
- `@tanstack/react-query` - Data fetching and caching
- `@tensorflow-models/pose-detection` - Pose estimation
- `react-webcam` - Camera access for practice mode
- `wouter` - Client-side routing
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `passport` / `openid-client` - Authentication
- Full shadcn/ui component library (Radix UI primitives)