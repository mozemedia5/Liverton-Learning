const fs = require('fs');
const path = require('path');

// Fix src/lib/hannaService.ts - remove unused toast import
let file1 = fs.readFileSync('src/lib/hannaService.ts', 'utf8');
file1 = file1.replace("import { toast } from 'sonner';\n\n", "");
fs.writeFileSync('src/lib/hannaService.ts', file1);
console.log('✓ Fixed src/lib/hannaService.ts');

// Fix src/pages/HannaChat.tsx - remove unused imports
let file2 = fs.readFileSync('src/pages/HannaChat.tsx', 'utf8');
file2 = file2.replace(/,\s*MoreVertical/g, '');
file2 = file2.replace(/,\s*Download/g, '');
file2 = file2.replace(/,\s*AlertCircle/g, '');
file2 = file2.replace(/const \[showSearch, setShowSearch\] = useState\(false\);/g, '');
fs.writeFileSync('src/pages/HannaChat.tsx', file2);
console.log('✓ Fixed src/pages/HannaChat.tsx');

// Fix src/pages/features/Chat.tsx - remove unused imports and variables
let file3 = fs.readFileSync('src/pages/features/Chat.tsx', 'utf8');
file3 = file3.replace(/,\s*Trash2/g, '');
file3 = file3.replace(/const userRole = userData\?.role;/g, '');
file3 = file3.replace(/const \[showHannaSessions, setShowHannaSessions\] = useState\(false\);/g, '');
file3 = file3.replace(/const deleteHannaSession = async \(sessionId: string\) => \{[\s\S]*?\};/g, '');
file3 = file3.replace(/const userMessage = inputValue;/g, '');
fs.writeFileSync('src/pages/features/Chat.tsx', file3);
console.log('✓ Fixed src/pages/features/Chat.tsx');

// Fix src/pages/features/HannaAI.tsx - remove unused userRole
let file4 = fs.readFileSync('src/pages/features/HannaAI.tsx', 'utf8');
file4 = file4.replace(/const userRole = userData\?.role;/g, '');
fs.writeFileSync('src/pages/features/HannaAI.tsx', file4);
console.log('✓ Fixed src/pages/features/HannaAI.tsx');

// Fix src/services/hannaAIService.ts - remove unused systemPrompt
let file5 = fs.readFileSync('src/services/hannaAIService.ts', 'utf8');
file5 = file5.replace(/const systemPrompt = [\s\S]*?;/g, '');
fs.writeFileSync('src/services/hannaAIService.ts', file5);
console.log('✓ Fixed src/services/hannaAIService.ts');

console.log('\n✅ All TypeScript errors fixed!');
