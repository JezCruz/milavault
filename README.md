# MilaVault

MilaVault is a private people information manager built with React, Vite, and Supabase.  
It supports login via magic links, adding/viewing people, dark/light theme, and secure vault locking.

## Features
- Magic Link Login (via Supabase)
- Add, view, and manage people info
- Lock Vault for security
- Dark/Light mode toggle
- Mobile & Desktop responsive

## Getting Started
1. Clone the repo:
   ```bash
   git clone https://github.com/JezCruz/milavault.git
   cd milavault
Install dependencies:

bash
Copy code
npm install
Create a .env file and add your Supabase keys:

ini
Copy code
VITE_SUPABASE_URL=https://YOUR_SUPABASE_URL.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
Run the development server:

bash
Copy code
npm run dev
Deployment
Vercel: https://milavault.vercel.app

Screenshots
 
## Supabase & Vercel setup

Follow these steps so Magic Links work for users on mobile and production:

- **Add Redirect URL in Supabase:** Go to your Supabase project → Authentication → Settings → Redirect URLs and add:

   https://milavault.vercel.app/*

- **Set Vercel environment variables:** In your Vercel project settings add the following Environment Variables (for Production):

   - `VITE_APP_URL` = `https://milavault.vercel.app`
   - `VITE_SUPABASE_URL` = your Supabase URL (e.g. `https://xyz.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = your Supabase ANON key

- **Redeploy** the site on Vercel after adding the variables.

Notes:
- The app reads `VITE_APP_URL` to include a redirect URL when sending Magic Links. Locally it falls back to `http://localhost:5173`.
- If you want to test on a mobile device without deploying, use a tunnel (ngrok) and add that URL to Supabase Redirect URLs.
- The app now wraps `App` with `BrowserRouter` so `useNavigate` works; if you see a white screen after login, make sure the router provider is present.
