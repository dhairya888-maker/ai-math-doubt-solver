# AI Math Doubt Solver for Students

An AI-powered web app that helps **K–12 students** solve math doubts with **step-by-step explanations**, an **“Explain like I’m 10”** mode, and **similar practice questions**.

## Problem statement
Students often get stuck on small math doubts and don’t have immediate help. This project provides a fast, friendly tutor-like experience with clear explanations and practice generation.

## Features
- **Chat interface (ChatGPT-style)**: clean bubbles, loading state, smooth scrolling
- **Step-by-step solving**: optimized prompt for simple, numbered steps
- **Explain like I’m 10**: simplifies the latest solution further
- **Generate similar questions**: creates 2–3 practice questions
- **Bonus UX**:
  - **Dark mode toggle**
  - **Copy answer** button
  - **Last 5 questions** stored in local storage (quick pick dropdown)
  - Friendly error UI

## Tech stack
- **Frontend**: React + Vite, Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: OpenAI API (default) or Gemini API (fallback)
- **Deploy**: Frontend on Vercel, Backend on Render

## Project structure
```
frontend/
backend/
README.md
```

## Demo flow (what to try)
1. Ask: **“Solve 2x + 5 = 15”**
2. You get a **step-by-step** answer
3. Click **Explain like I’m 10**
4. Click **Give me similar questions**

## Run locally

### 1) Backend
1. Open a terminal in `backend/`
2. Create env file:
   - Copy `backend/.env.example` → `backend/.env`
   - Fill **at least one** of:
     - `OPENAI_API_KEY` (recommended)
     - `GEMINI_API_KEY`

3. Install and start:
```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:8080` and exposes:
- `GET /health`
- `POST /ask`

### 2) Frontend
1. Open a terminal in `frontend/`
2. Create env file:
   - Copy `frontend/.env.example` → `frontend/.env`

3. Install and start:
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment variables

### Backend (`backend/.env`)
- **Required (choose one)**:
  - `OPENAI_API_KEY=...`
  - `GEMINI_API_KEY=...`
- **Optional**:
  - `PORT=8080`
  - `CORS_ORIGIN=http://localhost:5173`
  - `LLM_PROVIDER=openai` (or `gemini`; if empty, backend tries OpenAI then Gemini)
  - `OPENAI_MODEL=gpt-4o-mini`
  - `GEMINI_MODEL=gemini-1.5-flash`

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL=http://localhost:8080`

## API contract

### `POST /ask`
Body:
```json
{
  "question": "Solve 2x + 5 = 15",
  "action": "solve"
}
```

Actions:
- `solve`: step-by-step solution
- `eli10`: simplify the last answer (frontend also sends `contextAnswer`)
- `practice`: generate 2–3 similar questions (no solutions)

Response:
```json
{ "answer": "..." }
```

## Deployment

### Backend on Render
1. Create a new **Web Service**
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `backend/.env`:
   - `OPENAI_API_KEY` and/or `GEMINI_API_KEY`
   - `CORS_ORIGIN` set to your Vercel frontend URL (recommended)

After deploy, note your Render backend URL, e.g.:
- `https://your-service.onrender.com`

### Frontend on Vercel
1. Import the repo in Vercel
2. Root directory: `frontend`
3. Add env var:
   - `VITE_API_BASE_URL=https://your-service.onrender.com`
4. Deploy

## Live demo
- Frontend: _(https://ai-math-doubt-solver.vercel.app/)_
- Backend: _(https://ai-math-doubt-solver-81jc.onrender.com)_

