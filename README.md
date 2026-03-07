# Savings Tracker

Personal finance tracking and management app built with Next.js. Tracks savings accounts (PEA, Compte Courant, PEL, Livret A, Assurance Vie, Intéressement), portfolio performance, XIRR calculations, and historical wealth data.

## Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Docker Deployment

1. Make sure the data directories exist on your NAS:
```bash
mkdir -p /volume4/root4/AppData/SavingsTracker/data
mkdir -p /volume4/root4/AppData/SavingsTracker/logs
```

2. Build and run:
```bash
docker-compose up -d
```

## Project Structure

```
src/
├── components/
│   ├── shared/                # Reusable UI (Button, Modal, Card, Tabs)
│   │   └── table/             # Table components (SortableHeaderButton)
│   └── savings/               # Savings-specific components
│       └── account-details/   # Account detail view
│           └── helpers/       # Data processing utilities
├── hooks/
│   └── savings/               # Savings data & form hooks
├── lib/
│   ├── data.ts                # JSON file I/O utilities
│   ├── savings.ts             # Savings business logic
│   └── finance.ts             # Yahoo Finance price provider
├── models/
│   ├── shared/                # Automated tasks types
│   └── savings/               # Savings domain models
├── pages/
│   ├── index.tsx              # Redirect to /savings
│   ├── savings.tsx            # Main dashboard
│   ├── savings/               # Sub-pages (default, [accountId])
│   └── api/
│       ├── savings/           # Savings REST API
│       └── actions/           # Cron job endpoints
├── styles/
│   └── globals.css            # Theme & global styles
└── types/
    └── modules.d.ts           # Module declarations
```

## Environment Variables

```
DATA_PATH=/app/data        # JSON data storage
LOGS_PATH=/app/logs        # Application logs
CRON_SECRET=your_secret    # Auth for automated tasks
```

## Troubleshooting

- Check Docker logs: `docker logs savings-tracker`
- Verify data directory permissions
- Ensure port is not already in use

