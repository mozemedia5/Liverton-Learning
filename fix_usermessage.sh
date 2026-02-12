#!/bin/bash

# Fix Chat.tsx - restore userMessage declaration in handleSendHannaMessage
# Find the line with "const handleSendHannaMessage" and add userMessage declaration after it

sed -i '/const handleSendHannaMessage = async () => {/a\    const userMessage = messageInput.trim();' src/pages/features/Chat.tsx

echo "✓ Fixed userMessage declaration in Chat.tsx"
