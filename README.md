# Habit Harbor

A mobile-ready habit tracker with daily checkoffs, streaks, reminder times, overdue alerts, optional browser notifications, offline support, and home-screen install support.

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

## Offline support

After the first visit, the service worker caches the app shell so it can open without a network connection.
