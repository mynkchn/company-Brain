# QueryMind — Frontend

AI-powered SQL agent frontend. Connect any database, ask questions in plain English, and upload context documents to improve answers.

---

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** — dark terminal aesthetic with green accents
- **Framer Motion** — animations and transitions
- **Radix UI** — accessible headless components
- **Axios** — API service layer
- **React Router v6** — client-side routing

---

## Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # Base UI primitives (Button, Input, Toast…)
│   │   ├── ChatInterface.tsx # AI chat panel with message history
│   │   ├── IngestPanel.tsx   # Document upload + context form
│   │   └── TetrisLoading.tsx # Animated Tetris loading screen
│   ├── pages/
│   │   ├── LandingPage.tsx        # Public landing + GitHub login
│   │   ├── AuthCallbackPage.tsx   # OAuth token capture (/auth?token=…)
│   │   ├── DashboardPage.tsx      # Playground list
│   │   ├── NewPlaygroundPage.tsx  # Create playground form
│   │   └── PlaygroundPage.tsx     # Chat + ingest split view
│   ├── services/
│   │   └── api.ts            # All API calls (auth, playgrounds, ask, ingest)
│   ├── hooks/
│   │   ├── useAuth.ts        # User auth state
│   │   └── usePlaygrounds.ts # Playground list state
│   ├── layouts/
│   │   └── AppLayout.tsx     # Navbar + page wrapper
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── lib/
│   │   └── utils.ts          # cn(), formatDate(), generateId()
│   ├── App.tsx               # Router + auth guard
│   └── main.tsx              # React entry point
├── public/
│   └── favicon.svg
├── .env.example
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable       | Description              | Default                   |
|----------------|--------------------------|---------------------------|
| `VITE_API_URL` | Backend FastAPI base URL | `http://localhost:5000`   |

> All `VITE_` prefixed vars are inlined at build time by Vite.

---

## Installation

```bash
cd frontend
npm install
```

---

## Run Locally

```bash
npm run dev
# → http://localhost:5173
```

The backend must be running at `VITE_API_URL` (default: `http://localhost:5000`).

---

## Build for Production

```bash
npm run build
# Output: dist/
```

Preview the production build:

```bash
npm run preview
```

---

## API Integration

All API calls are in `src/services/api.ts`:

| Service            | Endpoint              | Description                            |
|--------------------|-----------------------|----------------------------------------|
| `authService`      | `GET /auth/login`     | Redirect to GitHub OAuth               |
| `authService.getMe`| `GET /me`             | Fetch authenticated user               |
| `playgroundService`| `GET /playground/list`| List user's playgrounds                |
| `playgroundService`| `GET /playground/:id` | Get playground detail + context        |
| `playgroundService`| `POST /playground/new`| Create new playground (validates DB)   |
| `playgroundService`| `DELETE /playground/:id`| Delete playground + Pinecone namespace|
| `queryService`     | `POST /ask`           | Ask a natural language question        |
| `ingestService`    | `POST /ingest`        | Upload PDFs/text + set context         |

**Auth flow:**
1. User clicks "Continue with GitHub" → redirected to `GET /auth/login`
2. GitHub redirects to `GET /auth/callback?code=…` on the backend
3. Backend exchanges code for token and redirects to `{FRONTEND_URL}/auth?token=<jwt>`
4. `AuthCallbackPage` stores JWT in `localStorage` and navigates to `/dashboard`
5. All subsequent requests include `Authorization: Bearer <token>`
6. 401 responses clear the token and redirect to `/`

---

## Key Features

- **GitHub OAuth** — one-click login, JWT-based session
- **Playground CRUD** — create, list, open, delete database connections
- **AI Chat** — streaming-style message UI with copy buttons and example prompts
- **Document Ingest** — drag & drop PDF/TXT/MD upload + business context text
- **Split-panel layout** — chat and ingest side by side in the playground view
- **Tetris loading** — animated loading screen during async operations
- **Toast notifications** — success/error feedback for all actions
- **Fully responsive** — works on mobile, tablet, and desktop
