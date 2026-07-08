# Google Review Funnel

QR-powered review funnel: customers scan a code, pick stars, get AI-generated review drafts, and post to Google (clipboard + deep link).

## Project structure

```
backend/     Express API + LLM integration
frontend/    React (Vite) — customer flow + business dashboard
db/          SQLite schema + seed data (reviews.db created on first run)
```

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Add HF_API_TOKEN to .env (see below)
npm start
```

Runs on `http://localhost:3000`. Seeds demo business `biz_demo` ("Cafe Luna") on first run.

**Hugging Face setup (for real AI drafts):**
1. Create account: https://huggingface.co/join
2. Accept Llama license: https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct
3. Create token: https://huggingface.co/settings/tokens
4. Set `HF_API_TOKEN=hf_xxxxx` in `backend/.env`

**CORS Configuration:**
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (default: `http://localhost:5173,http://localhost:3000`)
  - Development: `ALLOWED_ORIGINS=http://localhost:5173`
  - Production: `ALLOWED_ORIGINS=https://your-frontend-url.com`

Without a token, the frontend falls back to mock drafts so you can demo the UI.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Opens at `http://localhost:5173`.

**Environment Configuration:**
- `VITE_API_BASE`: Backend API URL (default: `http://localhost:3000`)
  - Development: `VITE_API_BASE=http://localhost:3000`
  - Production: `VITE_API_BASE=https://your-backend-url.com`
  - Note: The API client auto-adds `https://` if protocol is omitted

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing — demo link + business registration |
| `/r/:business_id` | Customer review flow (QR destination) |
| `/business/register` | Register a business, get QR |
| `/business/:business_id` | Dashboard — QR, keywords, analytics |

## User flow

1. Customer scans QR → `/r/{business_id}`
2. Tap 1–5 stars
3. Optionally select keyword tags
4. Backend generates 2–3 AI review drafts
5. Customer picks/edits a draft
6. **Post to Google** — copies text to clipboard, opens Google review URL
7. **Send private feedback** — stores feedback for the business (always available, no review gating)

## Business flow

1. Register at `/business/register` with name, Google review URL, keywords
2. Get printable QR code linking to `/r/{business_id}`
3. View analytics: generated reviews, Google posts, private feedback, star distribution

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/business/:id` | Business details + tag options |
| POST | `/api/businesses` | Register new business |
| GET | `/api/business/:id/analytics` | Usage stats |
| POST | `/api/generate-review` | Generate 2–3 review drafts |
| POST | `/api/regenerate-review` | Regenerate one draft |
| POST | `/api/review-action` | Track posted/private action |
| POST | `/api/private-feedback` | Store private feedback |

## Notes

- **Google review URL**: Get from Google Business Profile → "Ask for reviews" → copy link. Google does not allow pre-filled review text via URL, so we copy to clipboard and open the review page.
- **Review gating**: Both "Post to Google" and "Send private feedback" are always shown regardless of star rating.
- **Node 18+**: Uses `better-sqlite3` for SQLite. Swap to Postgres for production at scale.
- **Production**: Set `APP_BASE_URL` in backend `.env` to your deployed frontend URL for correct QR links.
