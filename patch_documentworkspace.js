const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/features/DocumentWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Remove unused useEffect import
content = content.replace('import React, { useState, useEffect } from \'react\';', 'import React, { useState } from \'react\';');

// Fix 2: Fix the undefined check for selectedDocument.sharedWith
content = content.replace(
  '{selectedDocument.sharedWith.map((email, idx) => (',
  '{selectedDocument?.sharedWith?.map((email, idx) => ('
);

// Fix 3: Fix the undefined check for selectedDocument
content = content.replace(
  '{selectedDocument && selectedDocument.sharedWith && (',
  '{selectedDocument && selectedDocument.sharedWith && selectedDocument.sharedWith.length > 0 && ('
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentWorkspace.tsx patched!');
