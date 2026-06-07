# Habit Harbor

A mobile-ready habit tracker with daily checkoffs, streaks, reminder times, overdue alerts, optional browser notifications, offline support, and home-screen install support.

The app uses a dark mobile-first interface, shows a new motivational quote each day, and includes a private local coach for habit, health, and personal growth guidance.

## Run it

From this folder:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173
```

## Install on your phone

This app is now a Progressive Web App. To install it on a phone, publish this folder to an HTTPS static host such as GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own web server.

After it is online:

- Android Chrome: open the site, then tap **Install app** or use the browser menu and choose **Add to Home screen**.
- iPhone Safari: open the site, tap **Share**, then choose **Add to Home Screen**.
- Once installed, the app opens like a normal phone app and keeps your habits on that device.

## Notifications

Use **Enable notifications** in the app. Reminders are checked once per minute while the app is open:

- A reminder notification appears when a habit reaches its reminder time and is not done.
- An overdue notification appears after the habit's grace period if it is still not done.
- In-app alerts still appear even when browser notifications are not allowed.

Mobile browsers may pause web apps in the background. For guaranteed all-day background push notifications, the next step would be a hosted backend or native mobile wrapper.

Your habits are stored in browser `localStorage` on the same device.

## Personal coach

The app now has two coach modes:

- Online AI coach: asks a secure serverless function for real AI answers.
- Local fallback coach: still gives basic guidance if the online backend is not set up yet.

The online coach sends your chat message, mood, energy, and habit summary to the AI endpoint. Do not type private medical records, passwords, or anything you would not want sent to an online service.

The coach gives general wellbeing guidance only. For medical, mental health, or emergency support, contact a qualified professional or local emergency services.

## Online AI coach setup

GitHub Pages cannot safely run the online AI coach because it has no private backend for an API key. Deploy the app to Netlify for the online coach:

1. Create an OpenAI API key from your OpenAI developer account.
2. Go to Netlify and create a new site from your GitHub repository.
3. In Netlify, open **Site configuration** > **Environment variables**.
4. Add:

```text
OPENAI_API_KEY=your_api_key_here
```

5. Redeploy the site.

Netlify will use `netlify/functions/coach.js` as the private backend. The phone app calls `/api/coach`, and the API key stays on Netlify instead of inside the app.

## Offline support

After the first visit, the service worker caches the app shell so it can open without a network connection.
