const fs = require('fs');
let content = fs.readFileSync('Liverton-learning/src/pages/HannaChat.tsx', 'utf8');

content = content.replace("import { Card } from '@/components/ui/card';",
`import { Card } from '@/components/ui/card';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatSettingsEnhanced as ChatSettings } from '@/components/ChatSettingsEnhanced';
import { EmojiPicker } from '@/components/EmojiPicker';
import type { ChatSettings as ChatSettingsType } from '@/types/chat';`);

content = content.replace("const [showSettings, setShowSettings] = useState(false);",
`const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [longPressedChatId, setLongPressedChatId] = useState<string | null>(null);
  const [chatLongPressTimer, setChatLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light',
    fontSize: 14,
    fontStyle: 'normal',
    notificationsEnabled: true,
    muteNotifications: false,
    colors: {
      sentMessageBg: '#9333ea', // purple-600
      receivedMessageBg: '#f3f4f6', // gray-100
      textColor: '#ffffff',
      accentColor: '#9333ea',
    },
  });`);

fs.writeFileSync('Liverton-learning/src/pages/HannaChat.tsx', content);
