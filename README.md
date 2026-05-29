# Welcome 

Welcometo Concert Curator my passion project that helps me keep track of all the concerts I've been to! It's helped me expand my data vizz skills, branching out from Tableau and Power BI to something more flexible and fun!


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
## Environment Variables

This project reads sensitive configuration from environment variables rather than hard-coding values into source.

Required variables for local development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `TICKETMASTER_API_KEY`

Create a `.env.local` file at the project root with these values, and keep `.env.local` out of source control.

If you need to seed the database from `seed_supabase.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell or use the same values as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, it is recommended to use TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
