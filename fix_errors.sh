#!/bin/bash

# Fix 1: Fix App.tsx - Add userRole prop to DocumentWorkspace
sed -i 's/<DocumentWorkspace \/>/<DocumentWorkspace userRole={userRole || "student"} \/>/g' src/App.tsx

# Fix 2: Remove unused imports from DocumentWorkspace.tsx
sed -i '/import.*useEffect.*from/s/useEffect, //' src/pages/features/DocumentWorkspace.tsx
sed -i '/import.*useParams.*from/s/, useParams//' src/pages/features/DocumentWorkspace.tsx
sed -i '/Clock,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Star,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Settings,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Users,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Lock,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Eye,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Check,/d' src/pages/features/DocumentWorkspace.tsx

echo "Fixes applied!"
