# 🔐 Firebase Setup Guide - Liverton Learning

## Problem
```
Uncaught FirebaseError: Firebase: Error (auth/invalid-api-key)
```

This error occurs because the Firebase credentials are not configured in your `.env` file.

---

## Solution: Configure Firebase Credentials

### Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on **Project Settings** (gear icon)
4. Go to the **General** tab
5. Scroll down to find your **Firebase SDK snippet**
6. Copy the configuration object

Your config should look like:
```javascript
{
  apiKey: "AIzaSyD...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
}
```

---

### Step 2: Create `.env` File

In the root of your project (`/home/code/Liverton-Learning/`), create a `.env` file:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_DATABASE_URL=your_database_url_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# App Configuration
VITE_APP_NAME=Liverton Learning
VITE_APP_VERSION=1.0.0
VITE_API_URL=http://localhost:5173
```

### Step 3: Fill in Your Credentials

Replace each `your_*_here` value with the actual values from your Firebase config:

| Environment Variable | Firebase Config Key |
|----------------------|-------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_DATABASE_URL` | `databaseURL` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

---

### Step 4: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)

# Restart with the new environment variables
npm run dev
```

---

## Example `.env` File

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrst
VITE_FIREBASE_AUTH_DOMAIN=liverton-learning.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://liverton-learning.firebaseio.com
VITE_FIREBASE_PROJECT_ID=liverton-learning
VITE_FIREBASE_STORAGE_BUCKET=liverton-learning.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456ghi789

# App Configuration
VITE_APP_NAME=Liverton Learning
VITE_APP_VERSION=1.0.0
VITE_API_URL=http://localhost:5173
```

---

## ⚠️ Important Security Notes

1. **Never commit `.env` to Git**
   - The `.gitignore` file should already exclude it
   - Verify: `cat .gitignore | grep .env`

2. **Keep credentials private**
   - Don't share your `.env` file
   - Don't post it in public repositories
   - Use different credentials for development and production

3. **For Production Deployment**
   - Set environment variables in your hosting platform:
     - **Vercel**: Project Settings → Environment Variables
     - **GitHub Pages**: Use GitHub Secrets (requires custom deployment script)
     - **Other platforms**: Check their documentation

---

## Troubleshooting

### Still Getting "invalid-api-key" Error?

1. **Verify the `.env` file exists**
   ```bash
   ls -la .env
   ```

2. **Check the file is in the correct location**
   ```bash
   pwd  # Should be /home/code/Liverton-Learning
   ```

3. **Verify environment variables are loaded**
   ```bash
   # In your browser console, check:
   console.log(import.meta.env.VITE_FIREBASE_API_KEY)
   # Should show your API key (not undefined)
   ```

4. **Restart the development server**
   ```bash
   npm run dev
   ```

5. **Clear browser cache**
   - DevTools → Application → Clear site data
   - Or use Ctrl+Shift+Delete

### Firebase Console Issues?

- Make sure you're logged into the correct Google account
- Verify the project exists and is active
- Check that Firebase Authentication is enabled in your project

---

## Next Steps

Once Firebase is configured:

1. ✅ Development server should run without errors
2. ✅ You can test the application locally
3. ✅ Deploy to production with proper credentials
4. ✅ Monitor Firebase usage in the console

---

## Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)

---

**Last Updated**: February 11, 2026  
**Status**: Ready for configuration
