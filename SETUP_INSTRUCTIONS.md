# 🚀 Liverton Learning - Complete Setup Instructions

**Last Updated**: February 11, 2026  
**Status**: ✅ Production Ready (Pending Firebase Configuration)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Firebase Configuration](#firebase-configuration)
3. [Development Setup](#development-setup)
4. [Production Build](#production-build)
5. [Deployment Options](#deployment-options)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Firebase project (free tier available)

### 1. Clone the Repository
```bash
git clone https://github.com/mozemedia5/Liverton-Learning.git
cd Liverton-Learning
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase (See section below)
```bash
# Create .env file with Firebase credentials
cp .env.example .env
# Edit .env with your Firebase credentials
```

### 4. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔐 Firebase Configuration

### The Error You're Seeing
```
Uncaught FirebaseError: Firebase: Error (auth/invalid-api-key)
```

This means Firebase credentials are not configured. Follow these steps:

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or select existing project
3. Enable the following services:
   - ✅ Authentication (Email/Password, Google Sign-in)
   - ✅ Firestore Database
   - ✅ Cloud Storage
   - ✅ Realtime Database (optional)

### Step 2: Get Your Credentials

1. In Firebase Console, click **Project Settings** (⚙️ icon)
2. Go to **General** tab
3. Scroll to **"Your apps"** section
4. Click **"Web"** app (or create one)
5. Copy the configuration object

### Step 3: Create `.env` File

In your project root, create a `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://YOUR_PROJECT.firebaseio.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID

# App Configuration
VITE_APP_NAME=Liverton Learning
VITE_APP_VERSION=1.0.0
VITE_API_URL=http://localhost:5173
```

### Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

✅ The error should now be resolved!

---

## 💻 Development Setup

### Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run TypeScript type checking
npm run type-check

# Lint code
npm run lint
```

### Project Structure

```
Liverton-Learning/
├── src/
│   ├── components/          # React components
│   ├── dashboards/          # Dashboard pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities (including PWA)
│   ├── types/               # TypeScript interfaces
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── dist/                    # Production build output
├── .env.example             # Environment variables template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

### Key Features

✅ **PWA Support**
- Service worker for offline functionality
- Automatic updates notification
- Installable on mobile devices

✅ **Type Safety**
- Full TypeScript support
- Strict type checking enabled

✅ **Performance**
- Optimized chunk splitting
- Lazy loading components
- Efficient caching strategies

✅ **Error Handling**
- Error boundaries for React errors
- Firebase error handling
- Network error recovery

---

## 🏗️ Production Build

### Build the Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Build Output

```
dist/
├── index.html                    # Main HTML file
├── manifest.webmanifest          # PWA manifest
├── sw.js                         # Service worker
├── assets/
│   ├── index-*.css              # Styles
│   ├── vendor-*.js              # React, React-DOM, etc.
│   ├── firebase-*.js            # Firebase SDK
│   ├── ui-*.js                  # UI components
│   └── index-*.js               # App code
└── workbox-*.js                 # Workbox caching
```

### Verify Build

```bash
# Check build size
npm run build

# Preview locally
npm run preview
```

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

**Easiest deployment with automatic updates**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

**Configure Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all `VITE_*` variables from your `.env` file
3. Redeploy

### Option 2: GitHub Pages

**Free hosting directly from GitHub**

```bash
# Build the project
npm run build

# Deploy to gh-pages branch
npm run deploy
```

**Setup:**
1. Add to `package.json`:
```json
{
  "homepage": "https://YOUR_USERNAME.github.io/Liverton-Learning",
  "scripts": {
    "deploy": "gh-pages -d dist"
  }
}
```

2. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

### Option 3: Docker

**Deploy anywhere with Docker**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
```

Build and run:
```bash
docker build -t liverton-learning .
docker run -p 3000:3000 liverton-learning
```

### Option 4: Traditional Hosting

**Deploy to any web server**

1. Build the project: `npm run build`
2. Upload `dist/` folder to your hosting
3. Configure server to serve `index.html` for all routes
4. Set environment variables on your hosting platform

---

## 🔧 Troubleshooting

### Firebase Error: "invalid-api-key"

**Solution**: Make sure `.env` file exists and contains valid Firebase credentials.

```bash
# Check if .env exists
ls -la .env

# Verify environment variables are loaded
# In browser console:
console.log(import.meta.env.VITE_FIREBASE_API_KEY)
```

### Build Fails with TypeScript Errors

**Solution**: Run type checking and fix errors

```bash
npm run type-check
```

### Service Worker Not Working

**Solution**: Check browser DevTools

1. Open DevTools → Application → Service Workers
2. Verify service worker is registered
3. Check Cache Storage for cached files
4. Clear site data and reload

### Port 5173 Already in Use

**Solution**: Use a different port

```bash
npm run dev -- --port 3000
```

### Environment Variables Not Loading

**Solution**: Restart development server

```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## 📚 Documentation

- **[PRODUCTION_FIX_REPORT.md](./PRODUCTION_FIX_REPORT.md)** - Detailed fixes applied
- **[FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)** - Firebase configuration guide
- **[Vite Documentation](https://vitejs.dev/)** - Build tool docs
- **[Firebase Documentation](https://firebase.google.com/docs)** - Firebase guides
- **[React Documentation](https://react.dev/)** - React guides

---

## 🔒 Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Verify: `cat .gitignore | grep .env`

2. **Use different credentials for each environment**
   - Development: One Firebase project
   - Production: Another Firebase project

3. **Restrict Firebase API Key**
   - In Firebase Console → Project Settings → API Keys
   - Restrict to Web apps only
   - Restrict to specific domains

4. **Enable Firebase Security Rules**
   - Firestore: Restrict read/write access
   - Storage: Require authentication
   - Realtime Database: Set proper rules

---

## 📊 Project Statistics

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Backend**: Firebase
- **UI Components**: Radix UI + Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks
- **PWA**: Workbox + Service Workers

---

## 🎯 Next Steps

1. ✅ Configure Firebase credentials
2. ✅ Run `npm install`
3. ✅ Start development server with `npm run dev`
4. ✅ Test the application locally
5. ✅ Build for production with `npm run build`
6. ✅ Deploy to your chosen platform

---

## 💬 Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)
3. Check [PRODUCTION_FIX_REPORT.md](./PRODUCTION_FIX_REPORT.md)
4. Visit [Firebase Documentation](https://firebase.google.com/docs)

---

## ✅ Checklist Before Deployment

- [ ] Firebase project created and configured
- [ ] `.env` file created with valid credentials
- [ ] `npm install` completed successfully
- [ ] `npm run dev` runs without errors
- [ ] Application loads in browser
- [ ] Service worker registered (DevTools → Application)
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Environment variables set on hosting platform
- [ ] Domain configured in Firebase Console

---

**Status**: 🚀 Ready for deployment!

For detailed information about the production fixes applied, see [PRODUCTION_FIX_REPORT.md](./PRODUCTION_FIX_REPORT.md).
