const fs = require('fs');
let content = fs.readFileSync('Liverton-learning/src/pages/HannaChat.tsx', 'utf8');

const target = `                messages.map((message) => (
                  <div
                    key={message.id}
                    className={\`flex \${
                      message.senderRole === 'user'
                        ? 'justify-end'
                        : 'justify-start'
                    } group\`}
                  >
                    <div
                      className={\`max-w-md lg:max-w-2xl \${
                        message.senderRole === 'user'
                          ? 'order-2'
                          : 'order-1'
                      }\`}
                    >
                      <Card
                        className={\`p-4 rounded-2xl transition-all \${
                          message.senderRole === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white dark:from-purple-700 dark:to-purple-800 shadow-lg'
                            : 'bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-200 dark:border-gray-700'
                        }\`}
                      >
                        <p className="text-xs font-semibold mb-2 opacity-75">
                          {message.senderName}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-60 mt-2">
                          {formatTime(message.createdAt)}
                        </p>
                      </Card>
                      {message.senderRole === 'hanna' && (
                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(message.content)}
                            className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))`;

const replacement = `                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message as any}
                    isCurrentUser={message.senderRole === 'user'}
                    showDate={false}
                    customColors={chatSettings.colors}
                    fontSize={chatSettings.fontSize}
                    fontStyle={chatSettings.fontStyle}
                    isRecipientOnline={true}
                    isMessageRead={true}
                    onDelete={handleDeleteMessage}
                    onEdit={handleEditMessage}
                  />
                ))`;

content = content.replace(target, replacement);

fs.writeFileSync('Liverton-learning/src/pages/HannaChat.tsx', content);
