#!/bin/bash

# Fix 1: Remove unused imports from DocumentWorkspace.tsx
sed -i 's/import React, { useState, useEffect }/import React, { useState }/' src/pages/features/DocumentWorkspace.tsx
sed -i 's/import { useNavigate, useParams }/import { useNavigate }/' src/pages/features/DocumentWorkspace.tsx

# Fix 2: Remove unused icon imports from DocumentWorkspace.tsx
sed -i '/Clock,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Star,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Settings,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Users,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Lock,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Eye,/d' src/pages/features/DocumentWorkspace.tsx
sed -i '/Check,/d' src/pages/features/DocumentWorkspace.tsx

# Fix 3: Remove unused imports from UnifiedDocumentEditor.tsx
sed -i '/Download,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Printer,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/AlignJustify,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Highlighter,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Type,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Grid3X3,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/MoreHorizontal,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Settings,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Users,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/MessageSquare,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/Clock,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/CheckCircle2/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/^import.*Badge.*from/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/DropdownMenuSeparator,/d' src/pages/features/UnifiedDocumentEditor.tsx

# Fix 4: Remove unused variables from UnifiedDocumentEditor.tsx
sed -i '/const { userData } = useAuth();/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/const \[textColor, setTextColor\]/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/const \[highlightColor, setHighlightColor\]/d' src/pages/features/UnifiedDocumentEditor.tsx

# Fix 5: Fix execCommand calls
sed -i "s/execCommand('insertImage', false, 'https:\/\/via.placeholder.com\/150')/execCommand('insertImage', 'https:\/\/via.placeholder.com\/150')/g" src/pages/features/UnifiedDocumentEditor.tsx
sed -i "s/execCommand('createLink', false, 'https:\/\/')/execCommand('createLink', 'https:\/\/')/g" src/pages/features/UnifiedDocumentEditor.tsx

echo "All fixes applied!"
