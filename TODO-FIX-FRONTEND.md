# Frontend Fix Steps

1. [x] Update code: VITE_API_BASE_URL → VITE_API_URL + console.log
2. [ ] Vercel: Set VITE_API_URL = https://ai-math-doubt-solver-81jc.onrender.com (delete old VITE_API_BASE_URL)
3. [ ] Commit & push, redeploy frontend on Vercel
4. [ ] Test: Browser console "API URL: https://...", Network tab shows POST /ask → 200 OK
5. [ ] Check Render logs for "Incoming /ask request:"
