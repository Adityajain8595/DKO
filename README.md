# Digital Krishi Officer

DKO is an agentic agricultural advisory application with a FastAPI backend and a Next.js frontend.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and add the provider keys.
2. Install backend dependencies with `pip install -r requirements.txt`.
3. Start the API from the repository root:

   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

4. Copy `frontend/.env.example` to `frontend/.env.local`.
5. Start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## GitHub, Render, and Vercel

Push the repository root to GitHub. Create a Render Web Service from that repository using the included `render.yaml`, then add the API keys in Render's environment settings. Set `CORS_ORIGINS` to the deployed Vercel URL and any local development origins you still need.

For Vercel, import the same repository, set the project root to `frontend`, and add `NEXT_PUBLIC_API_URL` with the Render service URL. The frontend uses that value for all API requests at build and runtime.

The Render health check is available at `/health`."# Digital-Krishi-Officer" 
"# DKO" 
"# DKO" 
"# DKO" 
