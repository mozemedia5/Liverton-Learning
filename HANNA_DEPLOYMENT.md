# Hanna AI - Deployment Guide

## Pre-Deployment Checklist

- [ ] Gemini API key configured in Firebase
- [ ] Firestore security rules updated
- [ ] Cloud Functions built and tested locally
- [ ] Environment variables set
- [ ] Database collections created
- [ ] All dependencies installed

## Step 1: Prepare Environment

```bash
# Install dependencies
npm install

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set Firebase project
firebase use liverton-learning-52b7c
```

## Step 2: Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Set environment variables
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"

# Deploy functions
firebase deploy --only functions

# Verify deployment
firebase functions:list
```

## Step 3: Deploy Firestore Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Verify rules
firebase firestore:indexes:list
```

## Step 4: Build Frontend

```bash
# Build the application
npm run build

# Verify build
ls -la dist/
```

## Step 5: Deploy to Hosting (Optional)

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting

# View deployment
firebase open hosting:site
```

## Step 6: Verify Deployment

### Check Cloud Functions

```bash
# List all functions
firebase functions:list

# Expected functions:
# - hannaChat
# - hannaUpload
# - createHannaChat
# - getHannaChats
# - getHannaMessages
# - searchHannaMessages
# - deleteHannaChat
# - archiveOldChats
# - deleteUserData
# - updateChatMetadata
```

### Check Firestore

```bash
# View collections
firebase firestore:indexes:list

# Expected collections:
# - hanna_chats
# - hanna_messages
# - hanna_files
# - users
```

### Test API Endpoints

```bash
# Test create chat
curl -X POST https://us-central1-liverton-learning-52b7c.cloudfunctions.net/createHannaChat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","title":"Test Chat"}'

# Test send message
curl -X POST https://us-central1-liverton-learning-52b7c.cloudfunctions.net/hannaChat \
  -H "Content-Type: application/json" \
  -d '{
    "chatId":"test-chat",
    "userId":"test-user",
    "userMessage":"Hello Hanna",
    "userName":"Test User",
    "userRole":"student"
  }'
```

## Step 7: Monitor Deployment

```bash
# View real-time logs
firebase functions:log --follow

# View specific function logs
firebase functions:log --only hannaChat

# View errors
firebase functions:log --level error
```

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous version
firebase deploy --only functions --force

# Or delete and redeploy
firebase functions:delete hannaChat --region us-central1
firebase deploy --only functions
```

## Production Checklist

- [ ] All environment variables set correctly
- [ ] Firestore rules tested and verified
- [ ] Cloud Functions tested with real data
- [ ] Error handling working properly
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] API keys secured

## Monitoring & Maintenance

### Daily
- Check Cloud Function logs for errors
- Monitor API response times
- Verify Firestore quota usage

### Weekly
- Review user feedback
- Check for performance issues
- Update dependencies if needed

### Monthly
- Analyze usage metrics
- Review security logs
- Plan feature updates

## Troubleshooting Deployment

### Issue: Functions not deploying

```bash
# Check for errors
npm run build

# Verify Node version
node --version  # Should be 20.x

# Clear cache and retry
rm -rf node_modules
npm install
npm run deploy
```

### Issue: Firestore rules error

```bash
# Validate rules syntax
firebase firestore:rules:validate

# Check for typos in rules
cat firestore.rules
```

### Issue: API returning 500 errors

```bash
# Check function logs
firebase functions:log --level error

# Verify environment variables
firebase functions:config:get

# Check Gemini API key
firebase functions:config:get gemini
```

## Performance Tuning

### Optimize Cloud Functions

```typescript
// Use connection pooling
const pool = new Pool({
  max: 10,
  idleTimeoutMillis: 30000,
});

// Cache responses
const cache = new Map();

// Implement rate limiting
const rateLimit = require('express-rate-limit');
```

### Optimize Firestore

```javascript
// Create indexes for frequently queried fields
db.collection('hanna_chats').where('userId', '==', uid).orderBy('updatedAt', 'desc')

// Use pagination
.limit(50)
.offset(0)
```

### Optimize Frontend

```typescript
// Lazy load components
const HannaChat = lazy(() => import('./pages/HannaChat'));

// Memoize expensive computations
const memoizedMessages = useMemo(() => messages, [messages]);

// Debounce search
const debouncedSearch = debounce(handleSearch, 300);
```

## Scaling Considerations

### Current Limits
- Cloud Functions: 540 concurrent executions
- Firestore: 50,000 reads/writes per second
- Storage: Unlimited

### When to Scale
- > 1000 concurrent users: Increase function memory
- > 100k messages/day: Add caching layer
- > 10GB data: Consider data archiving

### Scaling Strategy
1. Increase Cloud Function memory (512MB → 2GB)
2. Add Redis caching layer
3. Implement message archiving
4. Use Firestore sharding for hot collections

## Backup & Recovery

### Backup Strategy

```bash
# Export Firestore data
gcloud firestore export gs://liverton-learning-backups/backup-$(date +%Y%m%d)

# Schedule daily backups
gcloud scheduler jobs create app-engine daily-backup \
  --schedule="0 2 * * *" \
  --http-method=POST \
  --uri="https://us-central1-liverton-learning-52b7c.cloudfunctions.net/backup"
```

### Recovery Procedure

```bash
# Import from backup
gcloud firestore import gs://liverton-learning-backups/backup-20240101

# Verify data
firebase firestore:indexes:list
```

## Security Hardening

### API Security
- [ ] Enable API key restrictions
- [ ] Set up CORS properly
- [ ] Implement rate limiting
- [ ] Add request validation

### Data Security
- [ ] Enable Firestore encryption
- [ ] Set up backup encryption
- [ ] Enable audit logging
- [ ] Implement data retention policies

### Access Control
- [ ] Use service accounts for backend
- [ ] Implement role-based access
- [ ] Enable MFA for Firebase console
- [ ] Audit user permissions regularly

## Cost Optimization

### Monitor Costs
```bash
# View Firebase usage
firebase billing:list

# Check Firestore reads/writes
gcloud firestore operations list
```

### Reduce Costs
- Implement caching to reduce reads
- Archive old chats to reduce storage
- Optimize Cloud Function memory usage
- Use Firestore batch operations

## Support & Documentation

- Firebase Documentation: https://firebase.google.com/docs
- Cloud Functions: https://cloud.google.com/functions/docs
- Firestore: https://cloud.google.com/firestore/docs
- Gemini API: https://ai.google.dev/docs



## Active Vercel deployment path (current)

The active production Hanna endpoint is the root-level Vercel function at `/api/hanna`. The browser must use the same-origin route in production; do not point the client back to the legacy Firebase Functions URL.

Before deploying, set these server-only Vercel variables in Production and Preview: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.6-flash`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Keep `GEMINI_API_KEY` and Firebase Admin credentials unprefixed by `VITE_`. After deployment, request `/api/health`; the response must include `capabilities.hanna: true`, `capabilities.hannaConfig: true`, and `capabilities.hannaModel.reachable: true`.

To repair existing chat discovery records, first run a dry run locally or in a trusted administrative environment:

```bash
FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY='...' npm run backfill:user-directory -- --dry-run
```

If the dry-run counts are correct, run the idempotent write with explicit confirmation:

```bash
FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY='...' BACKFILL_CONFIRM=1 npm run backfill:user-directory
```

The script writes only minimal searchable identity fields to `userDirectory/{uid}` and processes records in batches. It does not copy private profile fields or read data from the browser.
