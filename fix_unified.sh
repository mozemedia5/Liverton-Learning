#!/bin/bash

# Remove unused userData variable
sed -i '/const userData = useAuth();/d' src/pages/features/UnifiedDocumentEditor.tsx

# Remove unused textColor and setTextColor
sed -i '/const \[textColor, setTextColor\]/d' src/pages/features/UnifiedDocumentEditor.tsx

# Remove unused highlightColor and setHighlightColor
sed -i '/const \[highlightColor, setHighlightColor\]/d' src/pages/features/UnifiedDocumentEditor.tsx

echo "Unused variables removed from UnifiedDocumentEditor.tsx"
