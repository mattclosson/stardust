# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stardust is a Revenue Cycle Management (RCM) platform built for healthcare billing companies. It helps billing specialists manage claims, denials, appeals, and tasks across multiple healthcare organizations.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run test         # Run tests with Vitest
npx convex dev       # Run Convex backend in development mode
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TanStack Router (file-based routing in `src/routes/`)
- **Backend**: Convex (serverless functions in `convex/`)
- **Auth**: Better Auth via `@convex-dev/better-auth` component
- **Styling**: Tailwind CSS v4 with Radix UI primitives (`src/components/ui/`)

### Key Patterns

**Multi-tenancy model**: RCM companies employ users who work across multiple healthcare organizations. The hierarchy is:
- `rcmCompanies` → `rcmUsers` → `rcmUserAssignments` → `organizations`
- Users select their working organization via `OrganizationContext` (stored in localStorage)
- All data queries filter by the selected `organizationId`

**Convex function organization**: Backend functions in `convex/` follow the pattern:
- `schema.ts` - Database schema with indexes and search indexes
- `*.ts` - Query/mutation functions grouped by domain (claims, denials, appeals, tasks, etc.)
- `convex.config.ts` - Component registration (betterAuth, aggregate, migrations)

**Authentication flow**:
- `src/lib/auth-client.ts` - Better Auth client with Convex plugins
- `src/lib/convex.tsx` - ConvexBetterAuthProvider wrapper
- `convex/auth.ts` - Server-side auth with Google OAuth + email/password

**Aggregate components**: Used for efficient counting via `@convex-dev/aggregate`:
- `claimsByOrg` - Count/sum claims by organization
- `claimsByStatus` - Count by status
- `denialsByOrg` - Count denials

**Route structure**:
- Auth pages (`/login`, `/signup`, `/invite/*`) render without sidebar
- Dashboard pages use shared `Sidebar` component and require authentication via `AuthGuard`

### Domain Entities

The core data model centers on the claims lifecycle:
- `claims` → `lineItems`, `claimDiagnoses`, `adjustments`, `payments`
- `denials` → `appeals` (with AI-generated appeal letters)
- `tasks` - Workflow items linked to claims/denials/appeals
- `holdCalls` - "Hold for me" calling feature for payer phone calls

### Environment Variables

Required for Convex:
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CONVEX_SITE_URL` - Convex site URL for auth

Server-side (in Convex dashboard):
- `SITE_URL` - Frontend URL for auth redirects
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth (optional)
