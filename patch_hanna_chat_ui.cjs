const fs = require('fs');
let content = fs.readFileSync('Liverton-learning/src/pages/HannaChat.tsx', 'utf8');

content = content.replace(
  "                messages.map((message) => (\n                  <div\n                    key={message.id}\n                    className={`flex ${\n                      message.senderRole === 'user'\n                        ? 'justify-end'\n                        : 'justify-start'\n                    } group`}\n                  >\n                    <div\n                      className={`max-w-md lg:max-w-2xl ${\n                        message.senderRole === 'user'\n                          ? 'order-2'\n                          : 'order-1'\n                      }`}\n                    >\n                      <Card\n                        className={`p-4 rounded-2xl transition-all ${\n                          message.senderRole === 'user'\n                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white dark:from-purple-700 dark:to-purple-800 shadow-lg'\n                            : 'bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-200 dark:border-gray-700'\n                        }`}\n                      >\n                        <p className=\"text-xs font-semibold mb-2 opacity-75\">\n                          {message.senderName}\n                        </p>\n                        <p className=\"text-sm leading-relaxed whitespace-pre-wrap\">\n                          {message.content}\n                        </p>\n                        <p className=\"text-xs opacity-60 mt-2\">\n                          {formatTime(message.createdAt)}\n                        </p>\n                      </Card>\n                      {message.senderRole === 'hanna' && (\n                        <div className=\"flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity\">\n                          <Button\n                            variant=\"ghost\"\n                            size=\"sm\"\n                            onClick={() => handleCopyMessage(message.content)}\n                            className=\"h-8 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200\"\n                          >\n                            <Copy className=\"w-3 h-3 mr-1\" />\n                            Copy\n                          </Button>\n                        </div>\n                      )}\n                    </div>\n                  </div>\n                ))",
  "                messages.map((message) => (\n                  <ChatMessage\n                    key={message.id}\n                    message={message}\n                    isCurrentUser={message.senderRole === 'user'}\n                    showDate={false}\n                    customColors={chatSettings.colors}\n                    fontSize={chatSettings.fontSize}\n                    fontStyle={chatSettings.fontStyle}\n                    isRecipientOnline={true}\n                    isMessageRead={true}\n                    onDelete={handleDeleteMessage}\n                    onEdit={handleEditMessage}\n                  />\n                ))"
);

content = content.replace(
  "              <form onSubmit={handleSendMessage} className=\"flex gap-3\">\n                <Input\n                  type=\"text\"\n                  placeholder=\"Ask Hanna anything...\"\n                  value={inputValue}\n                  onChange={(e) => setInputValue(e.target.value)}\n                  disabled={isSendingMessage}\n                  className=\"flex-1 rounded-full border-gray-300 dark:border-gray-700 focus:ring-purple-500\"\n                />\n                <input\n                  ref={fileInputRef}\n                  type=\"file\"\n                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}\n                  className=\"hidden\"\n                  accept=\".pdf,.doc,.docx,.txt,.jpg,.png\"\n                />\n                <Button\n                  type=\"button\"\n                  variant=\"outline\"\n                  size=\"icon\"\n                  onClick={() => fileInputRef.current?.click()}\n                  className=\"rounded-full hover:bg-gray-100 dark:hover:bg-gray-800\"\n                >\n                  <FileUp className=\"w-4 h-4\" />\n                </Button>\n                <Button\n                  type=\"submit\"\n                  disabled={isSendingMessage || !inputValue.trim()}\n                  className=\"rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold\"\n                >\n                  {isSendingMessage ? (\n                    <Loader2 className=\"w-4 h-4 animate-spin\" />\n                  ) : (\n                    <Send className=\"w-4 h-4\" />\n                  )}\n                </Button>\n              </form>",
  `              {uploadingFile && (
                <div className="mb-4 flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={\`\${2 * Math.PI * 20}\`}
                        strokeDashoffset={\`\${2 * Math.PI * 20 * (1 - uploadProgress / 100)}\`}
                        className="text-purple-600 transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Uploading file...</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Please wait</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-end relative">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile || isSendingMessage}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                    disabled={uploadingFile || isSendingMessage}
                    asChild
                  >
                    <div>
                      <FileUp className="w-5 h-5" />
                    </div>
                  </Button>
                </label>

                {/* Emoji Picker Button */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={\`rounded-full h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 transition-all \${
                      showEmojiPicker ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 shadow-md scale-105' : 'hover:scale-105 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }\`}
                    disabled={isSendingMessage}
                    title="Insert Emoji"
                  >
                    <span className="text-2xl sm:text-3xl">😊</span>
                  </Button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 transform origin-bottom-left transition-all scale-100 sm:scale-110">
                      <EmojiPicker
                        onEmojiSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </div>
                  )}
                </div>

                <Input
                  type="text"
                  placeholder="Ask Hanna anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSendingMessage || uploadingFile}
                  className="flex-1 rounded-full border-gray-300 dark:border-gray-700 h-10 sm:h-11 px-4 focus:ring-purple-500"
                />

                <Button
                  type="submit"
                  disabled={isSendingMessage || !inputValue.trim() || uploadingFile}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-full h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 p-0"
                  size="icon"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>`
);

content = content.replace(
  "          {chatSessions.length === 0 ? (\n            <div className=\"p-4 text-center text-gray-500 dark:text-gray-400\">\n              No chat history\n            </div>\n          ) : (\n            chatSessions.map((session) => (\n              <button\n                key={session.id}\n                onClick={() => {\n                  setCurrentChatId(session.id);\n                  if (window.innerWidth < 1024) setSidebarOpen(false);\n                }}\n                className={`w-full text-left p-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${\n                  currentChatId === session.id\n                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'\n                    : 'border-l-4 border-transparent'\n                }`}\n              >\n                <MessageSquare className=\"w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400\" />\n                <div className=\"flex-1 min-w-0\">\n                  <p className=\"text-sm font-medium text-gray-900 dark:text-white truncate\">\n                    {session.title}\n                  </p>\n                  <p className=\"text-xs text-gray-500 dark:text-gray-400 mt-1\">\n                    {formatTime(session.createdAt)}\n                  </p>\n                </div>\n              </button>\n            ))\n          )}",
  `          {chatSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No chat history
            </div>
          ) : (
            <>
              {chatSessions.map((session) => (
                <div key={session.id} className="relative">
                  <button
                    onClick={() => {
                      setCurrentChatId(session.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    onMouseDown={() => handleChatPressStart(session.id)}
                    onMouseUp={handleChatPressEnd}
                    onMouseLeave={handleChatPressEnd}
                    onTouchStart={() => handleChatPressStart(session.id)}
                    onTouchEnd={handleChatPressEnd}
                    className={\`w-full text-left p-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors \${
                      currentChatId === session.id
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
                        : 'border-l-4 border-transparent'
                    }\`}
                  >
                    <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(session.createdAt)}
                      </p>
                    </div>
                  </button>
                  {longPressedChatId === session.id && (
                    <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleDeleteChat(session.id)}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Chat
                      </button>
                      <button
                        onClick={() => setLongPressedChatId(null)}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewChat}
                  className="w-3/4 rounded-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chat
                </Button>
              </div>
            </>
          )}`
);

fs.writeFileSync('Liverton-learning/src/pages/HannaChat.tsx', content);
