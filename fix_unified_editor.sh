#!/bin/bash

# Remove unused imports from UnifiedDocumentEditor.tsx
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
sed -i '/Badge,/d' src/pages/features/UnifiedDocumentEditor.tsx
sed -i '/DropdownMenuSeparator,/d' src/pages/features/UnifiedDocumentEditor.tsx

echo "Unused imports removed from UnifiedDocumentEditor.tsx"
