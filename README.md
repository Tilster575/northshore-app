# Northshore Lift & Launch

## Deploy to Vercel (quickest — 2 minutes)

1. Push this folder to a **new GitHub repository**:
   - Go to github.com → New Repository → name it `northshore-app`
   - Follow the instructions to push this folder up

2. Go to **vercel.com** → Sign in with GitHub → "Add New Project"

3. Select your `northshore-app` repo

4. Vercel will auto-detect Vite — just click **Deploy**

5. Done! You'll get a URL like `northshore-app.vercel.app`

## Run locally (for testing)

```
npm install
npm run dev
```

Then open http://localhost:5173

## Supabase

The database connection is configured in `src/App.jsx` at the top.
SQL setup script: see `supabase_setup.sql` in the parent folder.
