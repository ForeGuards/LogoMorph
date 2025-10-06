# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

LogoMorph uses Bun as the primary JavaScript runtime instead of Node.js, npm, or yarn:

```bash
# Install dependencies (from project root)
bun install

# Run the main project entry point
bun run index.ts

# Run with hot reloading
bun --hot index.ts

# Run tests
bun test

# Build files
bun build <file.html|file.ts|file.css>
```

### Workspace Commands

This is a Bun workspace with apps in `apps/` directory:

```bash
# Install dependencies for all workspaces
bun install

# Run backend development server
cd apps/backend && bun --hot index.ts

# Run frontend development server  
cd apps/frontend && bun --hot index.ts

# Run tests in specific workspace
cd apps/backend && bun test
cd apps/frontend && bun test
```

## Architecture Overview

LogoMorph is an AI-powered logo variant generation platform with a monorepo workspace structure:

### Project Structure
- **Root**: Contains shared configuration and main entry point
- **apps/backend**: Express-based API server with Convex integration
- **apps/frontend**: Next.js + React frontend application

### Core Architecture
The system follows a typical web app pattern:
1. **Frontend (Next.js + React)**: User interface for logo upload, variant preview, and downloads
2. **Backend (Express + TypeScript)**: API server handling logo processing and AI model integration
3. **Database (Convex)**: Real-time database for user data, jobs, and asset metadata
4. **AI Processing**: Background generation engine for creating logo variants

### Key Data Flow
1. User uploads logo → Frontend validates and sends to backend
2. Backend parses logo (SVG/PNG) → Extracts metadata and creates job
3. Generation engine applies layout logic → Uses AI for background fills when needed
4. Results stored and returned → User downloads variant pack

## Bun-Specific Guidelines

This project strictly uses Bun APIs instead of traditional Node.js:

- **File operations**: Use `Bun.file()` instead of `node:fs`
- **Database**: Use `bun:sqlite` for SQLite, `Bun.sql` for Postgres, `Bun.redis` for Redis
- **HTTP server**: Use `Bun.serve()` with routes instead of Express when possible
- **Shell commands**: Use `Bun.$\`command\`` instead of execa
- **WebSocket**: Use built-in `WebSocket` instead of `ws` package
- **Environment**: Bun automatically loads `.env` files (no dotenv needed)

### Bun.serve() Pattern
For new server endpoints, prefer this pattern:

```typescript
Bun.serve({
  routes: {
    "/api/endpoint": {
      GET: (req) => new Response(JSON.stringify(data)),
      POST: async (req) => {
        const body = await req.json()
        return new Response(JSON.stringify(result))
      }
    }
  },
  development: {
    hmr: true,
    console: true
  }
})
```

## Code Organization Standards

### File Size Limits
- **300 LOC Maximum**: All source files must be under 300 lines including comments
- **Single Purpose**: Each file serves one clear purpose (e.g., logo parsing, API routes, UI components)
- **Modular Exports**: Break logic into small, reusable functions
- **Split on Growth**: Refactor into sub-modules when approaching limit (e.g., `api/logos/upload.ts`, `api/logos/generate.ts`)

### Module Separation
Keep these concerns in distinct modules:
- File I/O operations
- User input validation
- API request/response handling
- Business logic processing
- Database operations

### Error Handling Approach
- **No Assumptions**: Never infer user intent or formats without validation
- **Validate Schemas**: Check JSON against defined interfaces
- **Explicit Error Handling**: Use logging, fallbacks, and comprehensive error management
- **Evaluate Options**: Consider 2-3 approaches for major decisions, document trade-offs in comments
- **No Shortcuts**: Perform full validation steps even if repetitive

### Comment Style for Alternatives
When implementing solutions, document alternatives:
```typescript
// Option 1: Bun.serve (pros: performance, built-in features; cons: newer ecosystem)
// Option 2: Express (pros: mature ecosystem; cons: additional dependency)
// Chosen: Bun.serve for consistency with project standards
```

## Key Dependencies

### Backend
- **Express**: API framework (to be migrated to Bun.serve where possible)
- **Convex**: Real-time database and backend-as-a-service
- **TypeScript**: Type safety and modern JS features

### Frontend  
- **Next.js 15**: React framework with App Router
- **React 19**: UI component library
- **TailwindCSS**: Utility-first CSS framework (planned)
- **MagicUI**: React component library from 21st.dev (planned)

## Development Notes

### TypeScript Configuration
- Uses strict mode with additional safety flags
- Module resolution set to "bundler" for Bun compatibility
- JSX configured for React 19
- No emit mode (Bun handles compilation)

### Testing Strategy
Use Bun's built-in test runner:
```typescript
import { test, expect } from "bun:test"

test("logo parsing", () => {
  // Test implementation
})
```

### Logo Processing Pipeline
1. **Upload & Validation**: Accept SVG/PNG, validate format and size
2. **Parsing & Analysis**: Extract foreground/background, determine safe margins
3. **Layout Generation**: Apply preset rules for different output formats
4. **AI Enhancement**: Optional background generation using diffusion models
5. **Export & Packaging**: Output multiple formats with correct dimensions