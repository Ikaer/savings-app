# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot to understand the Savings Tracker project structure, patterns, and conventions.

## General Guidelines
- Always prioritize refactoring over duplication. If you see repeated code, consider creating a reusable function or component.
- Dont wait for the user to ask for a refactor, proactively suggest it when you see an opportunity.

## Project Overview

Savings Tracker is a personal finance tracking and management app built with Next.js 14, TypeScript, and deployed via Docker on a Synology NAS. It tracks multiple account types (PEA, Compte Courant, PEL, Livret A, Assurance Vie, Intéressement), portfolio performance with XIRR calculations, and historical wealth data.

## Architecture & Patterns

### Directory Structure
```
src/
├── components/
│   ├── shared/           # Reusable components (Button, Modal, Card, Tabs, SortableHeaderButton)
│   └── savings/          # Savings-specific components
│       └── account-details/  # Account detail view components + helpers/
├── hooks/
│   └── savings/          # Savings-specific hooks
├── models/
│   ├── shared/           # Common types (automated tasks)
│   └── savings/          # Savings domain models
├── pages/
│   ├── api/
│   │   ├── savings/      # Savings API endpoints (accounts, transactions, balances, etc.)
│   │   └── actions/      # Automated task endpoints (cron jobs)
│   ├── savings.tsx       # Main savings dashboard
│   └── savings/          # Sub-pages ([accountId].tsx, default.tsx)
└── lib/
    ├── savings.ts        # Savings business logic and data operations
    ├── finance.ts        # Market price provider (Yahoo Finance)
    └── data.ts           # Shared JSON file I/O utilities
```

## Code Conventions

### Import Patterns
```typescript
// Savings components
import CreateAccountModal from '@/components/savings/CreateAccountModal';

// Shared components
import { Button, Modal, Card, Tabs } from '@/components/shared';
import { SortableHeaderButton } from '@/components/shared/table';

// Models
import { SavingsAccount, AccountType } from '@/models/savings';
```

### API Route Structure
```
/api/savings/accounts           # Account CRUD
/api/savings/transactions/*     # Transaction management
/api/savings/balances/*         # Balance records
/api/savings/annual/*           # Annual valuations
/api/savings/deposits/*         # Deposit records (Intéressement)
/api/savings/summary/*          # Account summaries
/api/savings/net-worth          # Net worth calculation
/api/savings/historical/*       # Historical data storage & retrieval
/api/actions/*                  # Automated tasks (cron)
```

### Data Storage
- JSON file-based storage in `DATA_PATH` (defaults to `/app/data`)
- `lib/data.ts` provides `readJsonFile`/`writeJsonFile` utilities
- `lib/savings.ts` manages savings-specific data files
- Automatic directory creation via `ensureDirectoryExists()`

## Technology Stack

- **Frontend**: Next.js 14.0.0, React, TypeScript
- **Charts**: Recharts
- **Finance**: xirr (XIRR calculations), yahoo-finance2 (market prices)
- **Styling**: CSS Modules with typed-css-modules
- **API**: Next.js API routes
- **Data**: JSON files with Node.js fs operations
- **Deployment**: Docker with Portainer integration
- **Target**: TV browser (4K) - dark theme only

## Styling Guidelines

### Theme
- Dark theme only (optimized for TV viewing)
- CSS custom properties for colors

### CSS Modules
- Use CSS Modules for component-specific styling
- File naming: `ComponentName.module.css`
- Class naming: camelCase
- CSS Modules typings are generated via `typed-css-modules`.
- Use `npm run dev` (runs Next dev + CSS typings watcher).
- `npm run build` runs `css:types` automatically via `prebuild`.
- If a class name is missing in TS, run `npm run css:types` and fix the selector/name mismatch.

### Responsive Design
- Optimized for TV/4K displays, but the OS is a windows with a 300% zoom factor.
- No mobile responsiveness required

## Development Patterns

### Error Handling
```typescript
// API routes
try {
  const data = await operation();
  res.status(200).json(data);
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### React Patterns
- Factorize common patterns into reusable hooks and utility functions
- Custom hooks in `src/hooks/savings/` for data fetching and form state

## Environment & Deployment

### Docker Configuration
- Multi-stage build with Node.js 18-alpine
- Port mapping: 12351:3000
- Volume mounts for data persistence

### File Paths
- Data: `/app/data/`
- Logs: `/app/logs/`

### Environment Variables
```
DATA_PATH=/app/data
LOGS_PATH=/app/logs
CRON_SECRET=your_secret_key
```
