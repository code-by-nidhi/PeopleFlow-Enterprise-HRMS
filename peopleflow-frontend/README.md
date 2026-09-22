# PeopleFlow HRMS — Frontend

React 19 + Vite single-page app for the PeopleFlow Enterprise HRMS. See the [root README](../README.md) for the full feature list and backend setup.

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run lint           # oxlint
```

Highlights:

- Session restored from the httpOnly refresh cookie; access token kept in memory and refreshed transparently on 401
- Role-aware navigation and route guards (admin, HR, manager, employee)
- Real-time notifications over Socket.io
- Route-level code splitting, cancellable requests, debounced search
- Mobile-first responsive layout (tables collapse into cards), light / dark / system theme

For static hosting, rewrite every route to `index.html` so client-side routes work on refresh.
