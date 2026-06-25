# AutomateMyBoard

Florida HOA self-management platform. Built with React + Vite + Supabase.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Environment variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database

Run `supabase/schema.sql` in your Supabase SQL editor to create all tables,
RLS policies, and seed Martel Arms HOA with 30 units.

## Deploy

Push to GitHub → import in Vercel → add env vars → deploy.
