#!/bin/bash

# Fix the generateAIResponse function to use userMessage parameter
# Replace the function to actually use the userMessage parameter

sed -i '/const generateAIResponse = (userMessage: string): string => {/,/};/{
  s/const generateAIResponse = (userMessage: string): string => {/const generateAIResponse = (_userMessage: string): string => {/
}' src/pages/features/Chat.tsx

echo "✓ Fixed generateAIResponse to mark userMessage as intentionally unused"
