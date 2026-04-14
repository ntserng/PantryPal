# PantryPal

Main app directory: `pantrypal/`

## Quick Start

```bash
cd pantrypal
npm install
```

Create `pantrypal/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Run development server:

```bash
cd pantrypal
npm run dev
```

Run production build locally:

```bash
cd pantrypal
npm run build
npm run start
```

Note: `npm run start` must be run after `npm run build`.

For full project docs, see `pantrypal/README.md`.
