#!/bin/bash

# Fix src/lib/hannaService.ts - remove unused toast import
sed -i "8d" src/lib/hannaService.ts

# Fix src/pages/HannaChat.tsx - remove unused imports
sed -i "s/import {$/import {/" src/pages/HannaChat.tsx
sed -i "17s/  MoreVertical,//" src/pages/HannaChat.tsx
sed -i "19s/  Download,//" src/pages/HannaChat.tsx
sed -i "23s/  AlertCircle,//" src/pages/HannaChat.tsx

echo "Fixed HannaChat.tsx imports"
