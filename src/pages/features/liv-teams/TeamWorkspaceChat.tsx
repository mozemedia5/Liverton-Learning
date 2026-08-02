import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Send, Smile, Paperclip, MoreVertical, Edit2, Trash,
  CornerDownRight, Pin, ShieldAlert, FileText, CheckCheck, MessageSquare, Download
} from 'lucide-react';
import {
  sendTeamMessage,
  listenToTeamMessages,
  editTeamMessage,
  deleteTeamMessage,
  toggleTeamMessageReaction,
  addTeamMessageReply,
  togglePinTeamMessage
} from '@/services/livTeamsChatService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import type { TeamMessage, TeamRole } from '@/types/livTeams';

interface ChatProps {
  teamId: string;
  teamName: string;
  teamRole: TeamRole;
}

export default function TeamWorkspaceChat({ teamId, teamName, teamRole }: ChatProps) {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Thread / Reply states
  const [activeThreadMessage, setActiveThreadMessage] = useState<TeamMessage | null>(null);
  const [threadInput, setThreadInput] = useState('');

  // Edit states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Emoji picker simulation
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<string | null>(null);

  const isModeratorOrAbove = ['owner', 'admin', 'moderator'].includes(teamRole);

  useEffect(() => {
    if (!teamId) return;
    const unsubscribe = listenToTeamMessages(teamId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !inputText.trim()) return;

    try {
      await sendTeamMessage(
        teamId,
        currentUser.uid,
        userData?.fullName || 'Anonymous',
        teamRole,
        inputText.trim(),
        'text'
      );
      setInputText('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'document') => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const url = await uploadToCloudinary(file, type === 'image' ? 'image' : type === 'document' ? 'document' : 'audio');

      let uploadType: TeamMessage['type'] = 'document';
      if (type === 'image') uploadType = 'image';
      else if (type === 'video') uploadType = 'video';
      else if (type === 'audio') uploadType = 'audio';

      await sendTeamMessage(
        teamId,
        currentUser.uid,
        userData?.fullName || 'Anonymous',
        teamRole,
        `Sent ${file.name}`,
        uploadType,
        {
          url,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        }
      );
      toast.success('File uploaded and shared in chat');
    } catch (error) {
      toast.error('Failed to upload and send file');
    } finally {
      setUploading(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    try {
      await editTeamMessage(teamId, messageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteTeamMessage(teamId, messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleReactionToggle = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await toggleTeamMessageReaction(teamId, messageId, emoji, currentUser.uid);
      setShowEmojiPickerId(null);
    } catch (error) {
      toast.error('Failed to react');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeThreadMessage || !threadInput.trim()) return;

    try {
      await addTeamMessageReply(teamId, activeThreadMessage.id, {
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'Anonymous',
        content: threadInput.trim()
      });
      setThreadInput('');
    } catch (error) {
      toast.error('Failed to send thread reply');
    }
  };

  const handleTogglePin = async (message: TeamMessage) => {
    try {
      await togglePinTeamMessage(teamId, message.id, !message.isPinned);
      toast.success(message.isPinned ? 'Unpinned' : 'Pinned message');
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  return (
    <div className="flex h-full relative">

      {/* Main Chat Conversation Container */}
      <div className="flex-1 flex flex-col justify-between h-full bg-slate-50/50 dark:bg-slate-900/10">

        {/* Chat Sticky Header (Pinned Messages) */}
        <div className="bg-white dark:bg-slate-950 p-3 border-b flex items-center justify-between text-xs gap-2">
          <span className="font-bold text-slate-500">Workspace Room: {teamName}</span>
          <div className="flex items-center gap-2">
            {messages.some(m => m.isPinned) && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 py-0 px-2">
                <Pin className="w-3.5 h-3.5" /> Pinned message exists
              </Badge>
            )}
          </div>
        </div>

        {/* Conversation Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 gap-2">
              <MessageSquare className="w-10 h-10 text-emerald-500" />
              <p className="text-sm">Welcome to {teamName} chat. Ask questions or share notes!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid;
              const hasReplies = msg.replies && msg.replies.length > 0;

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'} space-y-1`}>

                  {/* Sender Details */}
                  {!isMe && (
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      {msg.senderName}
                      <Badge variant="secondary" className="text-[8px] py-0 px-1 capitalize">
                        {msg.senderTeamRole?.replace('_', ' ')}
                      </Badge>
                    </span>
                  )}

                  {/* Message Bubble */}
                  <div className={`p-3 rounded-2xl relative group ${
                    isMe
                      ? 'bg-emerald-500 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-tl-none text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {msg.isPinned && (
                      <Pin className="w-3.5 h-3.5 absolute top-1 right-1 text-amber-500" />
                    )}

                    {/* Different Message Types Support */}
                    {editingMessageId === msg.id ? (
                      <div className="flex gap-2 min-w-[200px]">
                        <Input value={editingText} onChange={e => setEditingText(e.target.value)} className="h-8 text-xs text-black" />
                        <Button size="sm" className="h-8" onClick={() => handleEditMessage(msg.id)}>Save</Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}

                        {msg.type === 'image' && (
                          <div className="space-y-1">
                            <img src={msg.fileUrl} className="max-w-xs max-h-48 rounded-lg object-cover" alt="attachment" />
                            <p className="text-xs italic">{msg.content}</p>
                          </div>
                        )}

                        {msg.type === 'document' && (
                          <div className="flex items-center gap-2 p-2 rounded bg-slate-100 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200">
                            <FileText className="w-5 h-5 text-emerald-500" />
                            <div className="min-w-0">
                              <p className="font-bold truncate max-w-[150px]">{msg.fileName}</p>
                              <p className="text-[9px] text-slate-400">{msg.fileSize || 'Unknown Size'}</p>
                            </div>
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-600 ml-auto">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}

                        {msg.type === 'audio' && (
                          <div className="space-y-1 min-w-[200px]">
                            <audio src={msg.fileUrl} controls className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5 pt-1 border-t border-white/10">
                        {msg.reactions.map((react, idx) => (
                          <span
                            key={idx}
                            onClick={() => handleReactionToggle(msg.id, react.emoji)}
                            className="text-xs cursor-pointer bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full"
                          >
                            {react.emoji} <span className="text-[10px] font-bold">{react.userIds.length}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Dropdown Options (pin, edit, delete, threads) */}
                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-slate-950/90 rounded-full border px-1 z-10">
                      <Button size="icon" variant="ghost" className="w-5 h-5 rounded-full text-xs" onClick={() => setShowEmojiPickerId(msg.id)}>
                        <Smile className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-5 h-5 rounded-full text-xs" onClick={() => setActiveThreadMessage(msg)}>
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                      {isModeratorOrAbove && (
                        <Button size="icon" variant="ghost" className="w-5 h-5 rounded-full text-xs" onClick={() => handleTogglePin(msg)}>
                          <Pin className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                      )}
                      {(isMe || isModeratorOrAbove) && (
                        <>
                          {isMe && (
                            <Button size="icon" variant="ghost" className="w-5 h-5 rounded-full text-xs" onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }}>
                              <Edit2 className="w-3 h-3 text-slate-500" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="w-5 h-5 rounded-full text-xs text-red-500" onClick={() => handleDeleteMessage(msg.id)}>
                            <Trash className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Simple Emoji Reaction Tray Trigger */}
                    {showEmojiPickerId === msg.id && (
                      <div className="absolute -top-10 left-0 bg-white dark:bg-slate-950 rounded-xl shadow-xl border p-1.5 flex gap-1 z-20">
                        {['👍', '❤️', '🔥', '🎓', '👏', '😮'].map(emoji => (
                          <span key={emoji} onClick={() => handleReactionToggle(msg.id, emoji)} className="text-base cursor-pointer hover:scale-125 transition-transform">{emoji}</span>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Thread summary trigger */}
                  {hasReplies && (
                    <span
                      onClick={() => setActiveThreadMessage(msg)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {msg.replies?.length} Thread Replies
                    </span>
                  )}

                  {/* Timestamp & Read Receipts indicator */}
                  <span className="text-[9px] text-slate-400">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-500 inline ml-1" />}
                  </span>

                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Message panel */}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-white dark:bg-slate-950 flex items-center gap-2">

          {/* File Attachments Quick Menu */}
          <div className="flex gap-1.5">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'image')} className="hidden" />
              <div className="w-9 h-9 border rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Smile className="w-4 h-4 text-slate-400" />
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" onChange={e => handleFileUpload(e, 'document')} className="hidden" />
              <div className="w-9 h-9 border rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Paperclip className="w-4 h-4 text-slate-400" />
              </div>
            </label>
          </div>

          <Input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Send a chat, snippet, or notes..."
            className="flex-1 rounded-xl h-10 border"
            disabled={uploading}
          />

          <Button type="submit" size="icon" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-10 h-10" disabled={uploading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>

      </div>

      {/* Sidebar Thread / Reply Drawer */}
      {activeThreadMessage && (
        <div className="w-80 border-l bg-white dark:bg-slate-950 h-full flex flex-col justify-between absolute right-0 top-0 z-30 shadow-2xl">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-900">
            <span className="font-bold text-xs text-slate-500">Replies Thread</span>
            <Button size="xs" variant="ghost" className="text-xs h-7 py-0.5" onClick={() => setActiveThreadMessage(null)}>Close</Button>
          </div>

          {/* Root Message inside thread */}
          <div className="p-4 border-b bg-emerald-500/5 text-xs space-y-2">
            <p className="font-bold text-emerald-600">{activeThreadMessage.senderName}</p>
            <p>{activeThreadMessage.content}</p>
          </div>

          {/* Thread messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeThreadMessage.replies?.map((rep: any) => (
              <div key={rep.id} className="p-2.5 rounded-xl border text-xs space-y-1 bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex justify-between font-bold">
                  <span>{rep.senderName}</span>
                </div>
                <p>{rep.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="p-3 border-t flex items-center gap-2">
            <Input
              value={threadInput}
              onChange={e => setThreadInput(e.target.value)}
              placeholder="Reply to thread..."
              className="text-xs h-9 rounded-lg"
            />
            <Button type="submit" size="icon" className="bg-emerald-500 text-white rounded-lg w-9 h-9">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}

    </div>
  );
}
