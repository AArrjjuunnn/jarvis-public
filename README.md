# JARVIS iPhone PWA

A lightweight, installable browser-based assistant prototype. It is designed to be hosted on GitHub Pages.

## Features
- Offline-capable interface (after the first successful load)
- Text commands
- Speech output through the browser's text-to-speech support
- iPhone keyboard dictation for voice input
- Time and date
- Basic arithmetic calculator
- Local notes stored in the browser on this device
- Google and YouTube search shortcuts

## Commands
- `help`
- `what time is it`
- `what is today's date`
- `calculate (12 + 8) * 3`
- `remember buy batteries`
- `read notes`
- `clear notes`
- `search black hole images`
- `youtube F1 onboard`

## Publish with GitHub Pages
1. Extract this ZIP on your computer.
2. Create a new GitHub repository, for example `jarvis-assistant`.
3. Upload **the files inside this folder** to the repository's root. `index.html` must be at the root, not buried in another folder.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Choose branch `main` and folder `/ (root)`, then save.
7. Wait for GitHub Pages to publish. Your site address will look like `https://YOUR-USERNAME.github.io/jarvis-assistant/`.

## Install on iPhone
1. Open the published HTTPS website in Safari.
2. Tap Share → Add to Home Screen.
3. Enable **Open as Web App** if the option appears, then tap Add.
4. Launch JARVIS from the new Home Screen icon.

You can continue using Chrome for normal browsing. Safari is the dependable route for adding the web app to the iPhone Home Screen.

## Voice input
This version deliberately uses iOS keyboard dictation instead of browser microphone capture. Tap the command field, tap the microphone on the iPhone keyboard, speak, then press SEND. Voice output uses the browser's speech synthesis when available.

## Important limitations
- This is a local prototype, not the movie AI. It does not yet connect to an AI model or control your phone.
- Notes are stored only in this browser on this device. Clearing website data can erase them.
- Search commands need an internet connection.
- No API key or password is included. If you later connect an AI service, put its secret key on a secure backend, never in `app.js`.
