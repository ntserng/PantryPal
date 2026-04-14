# PantryPal (Next.js)

PantryPal uses Firebase Authentication for login and Firestore for pantry persistence.

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file at `./.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

3. Start the app.

### Firebase usage

When the Firebase environment variables are present, PantryPal saves each user’s pantry in Firestore under a `pantries` collection. If Firebase is not configured, the app falls back to localStorage so the UI still works during setup.

## Run In Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Run In Production (Local)

1. Build:

```bash
npm run build
```

2. Start production server:

```bash
npm run start
```

Important: `npm run start` requires a successful build first. Running `start` without `build` will fail.

## Scripts

- `npm run dev`: Run development server with hot reload.
- `npm run build`: Create an optimized production build.
- `npm run start`: Run the production server from the build output.
