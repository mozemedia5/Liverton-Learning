# Liverton Learning - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase project with Firestore, Authentication, and Storage enabled

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/mozemedia5/Liverton-Learning.git
cd Liverton-Learning
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your Firebase credentials
# Get these from your Firebase Console:
# - Project Settings > General > Web API Key
# - Authentication > Web SDK setup
# - Firestore Database > Project ID
# - Storage > Bucket name
```

4. **Start development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

6. **Preview production build**
```bash
npm run preview
```

## 📋 Environment Variables

Required Firebase configuration variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🔐 Security Notes

⚠️ **IMPORTANT**: Never commit `.env.local` or any files containing API keys to version control.

The `.gitignore` file is configured to prevent accidental commits of:
- `.env` files
- `node_modules/`
- Build artifacts
- IDE configuration

## 📱 PWA Features

The app is configured as a Progressive Web App with:
- ✅ Offline support for cached content
- ✅ Auto-update service worker
- ✅ Installable on mobile and desktop
- ✅ Smart caching for Firebase data

### Testing PWA Locally

1. Build the project: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools → Application → Service Workers
4. Test offline mode: Network tab → Offline checkbox

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Theme)
├── dashboards/         # Role-specific dashboards
├── hooks/              # Custom React hooks
├── lib/                # Utilities and Firebase config
├── pages/              # Page components
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component
```

## 🔧 Key Features

### Authentication
- Email/password authentication via Firebase Auth
- Role-based access control (Student, Teacher, School Admin, Parent, Platform Admin)
- Persistent session management

### Data Management
- Real-time data fetching from Firestore
- Custom hooks for courses, quizzes, announcements
- Error handling and loading states

### UI/UX
- Dark mode support
- Responsive design with Tailwind CSS
- Loading skeletons for better UX
- Error boundaries for crash prevention

## 🐛 Debugging

### Common Issues

**Firebase credentials not loading:**
- Check `.env.local` file exists and has correct values
- Verify Firebase project is active
- Check browser console for specific errors

**Service worker not updating:**
- Clear browser cache
- Unregister old service workers in DevTools
- Hard refresh (Ctrl+Shift+R)

**Offline mode not working:**
- Ensure app is built (`npm run build`)
- Check Network tab in DevTools
- Verify service worker is registered

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create a pull request

## 📝 License

This project is proprietary. All rights reserved.
