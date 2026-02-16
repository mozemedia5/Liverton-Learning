#!/bin/bash

# Restore the file and remove only the unused function
git checkout src/components/SideNavbar.tsx

# Now properly remove just the unused function
sed -i '/^  \/\*\*$/,/^  \};$/{ /const handleAddDocument/,/^  };$/d; }' src/components/SideNavbar.tsx

echo "SideNavbar.tsx fixed!"
