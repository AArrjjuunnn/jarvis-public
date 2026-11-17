# JARVIS Web Assistant v2.0

A static, mobile-first assistant designed for GitHub Pages. It does not require Node.js, Python, a backend server, or a Mac.

## Included
- Responsive JARVIS interface suitable for iPhone and desktop
- Search-first workflow using DuckDuckGo Instant Answer results
- OpenAI-compatible chat completion connection (Gemini's OpenAI-compatible endpoint is prefilled)
- Local chat history and notes using browser storage
- Voice output and browser speech recognition where supported; iPhone keyboard dictation fallback
- Honest status handling for no internet, missing AI configuration, search failure, and AI service errors
- PWA manifest for Add to Home Screen

## Important limitations
1. GitHub Pages only serves static files. It does not host an AI model.
2. The default endpoint/model are prefilled, but you must supply your own API key in Settings. Provider pricing, free quotas, model availability, and age/eligibility requirements can change. Check the provider's terms before creating or using an account.
3. The key is saved in this browser's local storage and sent directly to the provider. It is not embedded in the source files or uploaded to GitHub, but browser storage is not a secure secret vault. Do not use this approach for a shared/public deployment or a key with sensitive permissions.
4. DuckDuckGo Instant Answer is not a full general web search API. It can return no result for many queries. When it returns no useful material, JARVIS tells the model that search results were unavailable rather than inventing citations. A stronger search provider can be integrated later.
5. iOS Safari support for microphone speech recognition varies. If the microphone button cannot capture speech, use the iPhone keyboard's dictation button. Speech output uses browser speech synthesis.
6. Chats and notes are stored locally in the current browser. They do not sync between devices and may be lost if browser data is cleared.

## Publish to your existing GitHub Pages repository
1. Download and extract the ZIP.
2. Open your `jarvis-public` repository on GitHub.
3. Upload the contents of this folder to the repository root, replacing the old `index.html`, `app.js`, and `style.css` when prompted. Keep the repository's existing Pages workflow if it already works.
4. Commit the changes to `main`.
5. Wait for the GitHub Pages deployment action to finish.
6. Open `https://aarrjjuunnn.github.io/jarvis-public/`.

## Configure the AI
1. Open JARVIS and select the gear icon.
2. The default endpoint is `https://generativelanguage.googleapis.com/v1beta/openai/` and the default model is `gemini-2.5-flash`.
3. Add your own API key from a provider that supports OpenAI-compatible Chat Completions.
4. Save settings and send a test prompt.

If your provider uses a different endpoint or model, replace those fields in Settings. The key is never part of the repository files.

## iPhone installation
Open the published HTTPS URL in Safari, tap Share, choose Add to Home Screen, then Add. This creates a home-screen web app shortcut. It is still a web app, not a native iOS binary.

### If the old prototype keeps appearing
The updated script attempts to unregister the old prototype service worker and remove JARVIS-named caches. If Safari still shows the old interface after deployment, close the installed web app, clear the website data for the GitHub Pages site in Safari settings, then reopen the URL.
