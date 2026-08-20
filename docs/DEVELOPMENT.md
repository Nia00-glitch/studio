# Developer & Contribution Guide — NIA Safety Rides

## 1. Local Environment Setup

### Prerequisites
- Node.js 18 or 20+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation
```bash
git clone https://github.com/Nia00-glitch/studio.git
cd studio

# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

---

## 2. Available NPM Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Next.js development server on port 9002 (`http://localhost:9002`) |
| `npm run build` | Compiles optimized Next.js production build with PWA service worker |
| `npm run typecheck` | Executes TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | Runs Next.js ESLint static analysis |

---

## 3. Diagnostics & Health Verification

The repository includes a built-in diagnostic tool at `/debug`:
1. Start the development server (`npm run dev`).
2. Navigate to `http://localhost:9002/debug`.
3. Click **"Run Full System Check"** to verify:
   - Client Auth State
   - Firebase Functions SDK initialization
   - Gemini AI model responsiveness and latency via `debugGemini` Cloud Function.
