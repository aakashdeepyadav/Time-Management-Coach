# Time Management Coach

A browser-based productivity assistant with:

- AI coaching chat (OpenAI with Gemini fallback)
- Pomodoro timer
- Task management
- Optional Google sign-in and Google Tasks sync

## Project Structure

- `index.html` - main app shell
- `js/ai.js` - AI provider logic and fallback flow
- `js/app.js` - app event wiring and chat/schedule interactions
- `js/auth.js` - Google auth and session handling
- `js/tasks.js` - task operations
- `js/pomodoro.js` - timer logic
- `js/ui.js` - chat/task UI helpers
- `config.example.js` - template config
- `config.js` - local secret config (not committed)

## Prerequisites

- Modern browser (Chrome/Edge/Firefox)
- OpenAI API key (recommended)
- Gemini API key (fallback)
- Google OAuth Client ID (optional, only for Google sign-in/tasks)

## Setup

1. Clone the repository.
2. Create `config.js` in project root (or copy from `config.example.js`).
3. Add your real keys.
4. Run from a local HTTP server (recommended) instead of opening as `file:///`.

## Environment Variables (Netlify/CI)

This project supports environment-variable based config generation through `build.sh`.

- Netlify runs `build.sh` (configured in [netlify.toml](netlify.toml)) and creates `config.js` at build time.
- Set these environment variables in Netlify site settings:
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`
  - `GOOGLE_CLIENT_ID` (optional)

Important for local development:

- Browser JavaScript cannot read your machine environment variables directly.
- Locally, either create `config.js` manually or run a script that generates it before serving the app.

### config.js Example

```javascript
window.CONFIG = {
  OPENAI_API_KEY: "sk-your-openai-key",
  GEMINI_API_KEY: "AIza-your-gemini-key",
  GOOGLE_CLIENT_ID: "your-google-client-id.apps.googleusercontent.com",
  API_TIMEOUT: 10000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
};
```

## Run Locally

### Option A: VS Code Live Server

- Install Live Server extension
- Right-click `index.html` -> Open with Live Server

### Option B: Python HTTP server

```bash
python -m http.server 5500
```

Then open:

- `http://localhost:5500`

## AI Chat Flow

The app handles AI providers in this order:

1. OpenAI (`/v1/chat/completions`)
2. Gemini (`generativelanguage.googleapis.com`)
3. Local mock response (last fallback)

This means chat remains usable even if one provider fails or rate-limits.

## Common Issues

### Chatbot not responding

Check the following:

1. `config.js` exists in project root.
2. Keys are real values, not placeholders.
3. Browser DevTools Console has no startup errors.
4. Network tab shows API calls being made.
5. You are serving over `http://localhost` (not opening raw file path).

### OpenAI errors (401/429)

- 401: key invalid or revoked
- 429: rate limit/quota reached

When this happens, app should automatically fall back to Gemini.

### Gemini errors (400/403/404/429)

- 400/403: key or API permissions issue
- 404: model unavailable for your key/project
- 429: rate limit

If Gemini also fails, app returns a safe mock response.

### Google login not working

- Ensure `GOOGLE_CLIENT_ID` is set in `config.js`
- Verify OAuth credentials in Google Cloud Console
- Add `http://localhost:<port>` to authorized origins

## Security Notes

- Never commit real API keys.
- Keep `config.js` local/private.
- Rotate keys if they were accidentally exposed.

## Deployment Notes

For production, do not expose API keys directly in frontend JS.
Use a backend proxy/serverless function for provider calls and keep secrets server-side.

## License

Use and modify for personal or educational productivity workflows.
