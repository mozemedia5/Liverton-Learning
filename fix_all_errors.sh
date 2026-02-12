#!/bin/bash

# Fix src/pages/features/Chat.tsx
# Remove Trash2 from imports
sed -i 's/  Trash2$//' src/pages/features/Chat.tsx
sed -i 's/  Trash2,$//' src/pages/features/Chat.tsx

# Remove deleteDoc from imports
sed -i 's/, deleteDoc//' src/pages/features/Chat.tsx

# Remove userRole declaration
sed -i '/const { currentUser, userRole } = useAuth();/c\  const { currentUser } = useAuth();' src/pages/features/Chat.tsx

# Remove userMessage declaration
sed -i '/const userMessage = messageInput.trim();/d' src/pages/features/Chat.tsx

# Fix src/pages/features/HannaAI.tsx
sed -i '/const userRole = userData\?\.role;/d' src/pages/features/HannaAI.tsx

# Fix src/services/hannaAIService.ts
sed -i '/const conversationHistory = /,/;$/d' src/services/hannaAIService.ts
sed -i '/const buildSystemPrompt = /,/;$/d' src/services/hannaAIService.ts

echo "✓ Fixed all TypeScript errors"
