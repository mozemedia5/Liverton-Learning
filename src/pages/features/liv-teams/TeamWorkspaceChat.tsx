import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Send, Smile, Paperclip, Edit2, Trash, CornerDownRight, Pin,
  CheckCheck, MessageSquare,
  Search, X, Loader2, Mic
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
import { uploadToCloudinary, type CloudinaryUploadType } from '@/services/cloudinaryService';
import type { TeamMessage, TeamMessageReply, TeamRole } from '@/types/livTeams';
import { LivLoader } from './livTeamsUi';
import TeamAttachmentViewer from '@/components/TeamAttachmentViewer';

interface ChatProps {
  teamId: string;
  teamName: string;
  teamRole: TeamRole;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎓', '👏', '😮'];

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TeamWorkspaceChat({ teamId, teamName, teamRole }: ChatProps) {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Thread / reply states
  const [activeThreadMessage, setActiveThreadMessage] = useState<TeamMessage | null>(null);
  const [threadInput, setThreadInput] = useState('');

  // Edit states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Emoji picker
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<string | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isModeratorOrAbove = ['owner', 'admin', 'moderator'].includes(teamRole);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!teamId) return;
    setInitialLoading(true);
    const unsubscribe = listenToTeamMessages(
      teamId,
      (msgs) => {
        setMessages(msgs);
        setInitialLoading(false);
      },
      () => setInitialLoading(false)
    );
    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m =>
      (m.content || '').toLowerCase().includes(q) ||
      (m.fileName || '').toLowerCase().includes(q) ||
      (m.senderName || '').toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const pinnedCount = useMemo(() => messages.filter(m => m.isPinned).length, [messages]);

  /* ------------------------------ Actions ------------------------------ */

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
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) return;
    const file = e.target.files[0];
    e.target.value = '';
    setUploading(true);
    try {
      const mime = file.type || '';
      let kind: 'image' | 'video' | 'audio' | 'document' = 'document';
      if (mime.startsWith('image/')) kind = 'image';
      else if (mime.startsWith('video/')) kind = 'video';
      else if (mime.startsWith('audio/')) kind = 'audio';

      let presetType: CloudinaryUploadType = 'document';
      let purpose = 'chat_document';

      if (kind === 'image') {
        presetType = 'image';
        purpose = 'chat_image';
      } else if (kind === 'video') {
        presetType = 'course_video'; // Force chat videos to Courses/Video preset
        purpose = 'chat_video'; // Temporary chat video subject to 7-day deletion policy
      } else if (kind === 'audio') {
        presetType = 'audio';
        purpose = 'chat_audio';
      }

      const url = await uploadToCloudinary(file, presetType, {
        userId: currentUser.uid,
        referenceId: teamId,
        purpose
      });

      const messageType: TeamMessage['type'] =
        kind === 'image' ? 'image'
        : kind === 'video' ? 'video'
        : kind === 'audio' ? 'audio'
        : file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar') ? 'zip'
        : 'document';

      await sendTeamMessage(
        teamId,
        currentUser.uid,
        userData?.fullName || 'Anonymous',
        teamRole,
        `Shared ${file.name}`,
        messageType,
        {
          url,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        }
      );
      toast.success('File shared in chat');
    } catch {
      toast.error('Failed to upload and send file');
    } finally {
      setUploading(false);
    }
  };

  // Real Voice Note Recording with MediaRecorder API
  const handleVoiceInput = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Audio recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100 || !currentUser) return;

        setUploading(true);
        try {
          const file = new File([audioBlob], `team-voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          const url = await uploadToCloudinary(file, 'audio', {
            userId: currentUser.uid,
            referenceId: teamId,
            purpose: 'chat_audio'
          });

          await sendTeamMessage(
            teamId,
            currentUser.uid,
            userData?.fullName || 'Anonymous',
            teamRole,
            'Voice Note',
            'audio',
            {
              url,
              name: 'Voice Note.webm',
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            }
          );
          toast.success('Voice note sent to team!');
        } catch {
          toast.error('Failed to send voice note');
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording voice note for team... Click mic again to send.', { duration: 4000 });
    } catch {
      toast.error('Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    try {
      await editTeamMessage(teamId, messageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message updated');
    } catch {
      toast.error('Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteTeamMessage(teamId, messageId);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleReactionToggle = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await toggleTeamMessageReaction(teamId, messageId, emoji, currentUser.uid);
      setShowEmojiPickerId(null);
    } catch {
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
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const handleTogglePin = async (message: TeamMessage) => {
    try {
      await togglePinTeamMessage(teamId, message.id, !message.isPinned);
      toast.success(message.isPinned ? 'Message unpinned' : 'Message pinned');
    } catch {
      toast.error('Failed to update pin status');
    }
  };

  /* ------------------------------ Render ------------------------------ */

  let lastDayLabel = '';

  return (
    <div className="flex h-full relative">

      {/* Main conversation */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Chat header */}
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{teamName} — Team Chat</p>
            <p className="text-[11px] text-slate-400">
              {messages.length} messages{pinnedCount > 0 ? ` • ${pinnedCount} pinned` : ''}
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Search messages"
            className={searchOpen ? 'text-emerald-500' : 'text-slate-400'}
            onClick={() => { setSearchOpen(o => !o); setSearchQuery(''); }}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {searchOpen && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages, files, people..."
              className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
            />
            {searchQuery && (
              <Button size="icon-sm" variant="ghost" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {initialLoading ? (
            <LivLoader message="Loading conversation..." />
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm max-w-xs">
                {searchQuery ? 'No messages match your search.' : `No messages yet. Start the conversation in ${teamName}!`}
              </p>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid;
              const hasReplies = (msg.replies?.length || 0) > 0;
              const msgDate = msg.createdAt ? new Date(msg.createdAt) : null;
              const label = msgDate ? dayLabel(msgDate) : '';
              const showDaySeparator = label && label !== lastDayLabel;
              if (showDaySeparator) lastDayLabel = label;
              const attachmentType = ['image', 'video', 'audio', 'document', 'zip'].includes(msg.type)
                ? msg.type as 'image' | 'video' | 'audio' | 'document' | 'zip'
                : null;

              return (
                <div key={msg.id} className="space-y-3">
                  {showDaySeparator && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 border-t border-gray-100 dark:border-white/5" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                      <div className="flex-1 border-t border-gray-100 dark:border-white/5" />
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'} space-y-1`}>
                    {!isMe && (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        {msg.senderName}
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 capitalize">
                          {msg.senderTeamRole?.replace('_', ' ') || 'member'}
                        </Badge>
                      </span>
                    )}

                    <div className={`p-3 rounded-2xl relative group ${
                      isMe
                        ? 'bg-emerald-500 text-white rounded-tr-md'
                        : 'bg-white dark:bg-slate-950 border border-gray-100 dark:border-white/5 rounded-tl-md text-slate-800 dark:text-slate-200'
                    }`}>
                      {msg.isPinned && (
                        <Pin className="w-3.5 h-3.5 absolute -top-1.5 -right-1.5 text-amber-500 fill-current bg-white dark:bg-slate-950 rounded-full p-0.5 border border-gray-100 dark:border-white/10" />
                      )}

                      {editingMessageId === msg.id ? (
                        <div className="flex gap-2 min-w-[220px]">
                          <Input value={editingText} onChange={e => setEditingText(e.target.value)} className="h-8 text-xs text-slate-900" />
                          <Button size="sm" className="h-8" onClick={() => handleEditMessage(msg.id)}>Save</Button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {(msg.type === 'text' || msg.type === 'code') && (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}

                          {attachmentType && (
                            <TeamAttachmentViewer
                              url={msg.fileUrl}
                              name={msg.fileName || msg.content}
                              type={attachmentType}
                              size={msg.fileSize}
                              isMine={isMe}
                            />
                          )}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex gap-1 flex-wrap mt-1.5 pt-1.5 ${isMe ? 'border-t border-white/20' : 'border-t border-gray-100 dark:border-white/5'}`}>
                          {msg.reactions.map((react, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleReactionToggle(msg.id, react.emoji)}
                              className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                                react.userIds.includes(currentUser?.uid || '')
                                  ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50'
                                  : 'bg-black/10 dark:bg-white/10'
                              }`}
                            >
                              {react.emoji} <span className="text-[10px] font-bold">{react.userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5 bg-white/95 dark:bg-slate-950/95 rounded-full border border-gray-100 dark:border-white/10 px-1 z-10 shadow">
                        <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => setShowEmojiPickerId(showEmojiPickerId === msg.id ? null : msg.id)} aria-label="React">
                          <Smile className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => setActiveThreadMessage(msg)} aria-label="Reply in thread">
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        {isModeratorOrAbove && (
                          <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => handleTogglePin(msg)} aria-label={msg.isPinned ? 'Unpin' : 'Pin'}>
                            <Pin className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        )}
                        {isMe && msg.type === 'text' && (
                          <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }} aria-label="Edit">
                            <Edit2 className="w-3 h-3 text-slate-500" />
                          </Button>
                        )}
                        {(isMe || isModeratorOrAbove) && (
                          <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => handleDeleteMessage(msg.id)} aria-label="Delete">
                            <Trash className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>

                      {/* Emoji tray */}
                      {showEmojiPickerId === msg.id && (
                        <div className="absolute -top-11 left-0 bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 p-1.5 flex gap-1 z-20">
                          {QUICK_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => handleReactionToggle(msg.id, emoji)} className="text-base hover:scale-125 transition-transform">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {hasReplies && (
                      <button
                        onClick={() => setActiveThreadMessage(msg)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> {msg.replies?.length} {msg.replies?.length === 1 ? 'reply' : 'replies'}
                      </button>
                    )}

                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {msgDate ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {msg.editedAt && <span>(edited)</span>}
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Unified High-Fidelity Input panel matching Hanna AI - Sticky & Responsive Auto-Resizing */}
        <footer className="sticky bottom-0 z-20 shrink-0 p-4 bg-white/95 dark:bg-[#07070a]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/5">
          <form
            onSubmit={handleSendMessage}
            className="flex items-end gap-2.5 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/95 shadow-xl p-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200 max-w-5xl mx-auto w-full"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
              onChange={handleGeneralFileUpload}
              className="hidden"
              disabled={uploading}
            />

            {/* Standard Paperclip Attachment Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full w-10 h-10 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            {/* Text Input Composer */}
            <div className="flex-1 relative min-w-0">
              <textarea
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={1}
                placeholder={uploading ? 'Uploading attachment...' : 'Type a message...'}
                className="w-full min-h-[38px] max-h-[112px] bg-transparent resize-none border-none outline-none px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                disabled={uploading}
              />
            </div>

            {/* Microphone Voice Input Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleVoiceInput}
              disabled={uploading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              title="Voice Input"
            >
              <Mic className="w-5 h-5" />
            </Button>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={uploading || !inputText.trim()}
              className="rounded-full w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </footer>
      </div>

      {/* Thread drawer */}
      {activeThreadMessage && (
        <div className="w-full sm:w-80 border-l border-gray-100 dark:border-white/5 bg-white dark:bg-slate-950 h-full flex flex-col absolute right-0 top-0 z-30 shadow-2xl">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <span className="font-semibold text-sm">Thread</span>
            <Button size="icon-sm" variant="ghost" onClick={() => setActiveThreadMessage(null)} aria-label="Close thread">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-emerald-500/5 text-sm space-y-1">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{activeThreadMessage.senderName}</p>
            <p>{activeThreadMessage.content}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(activeThreadMessage.replies || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No replies yet. Start the thread below.</p>
            ) : (
              activeThreadMessage.replies?.map((rep: TeamMessageReply) => (
                <div key={rep.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/5 text-sm space-y-1 bg-slate-50/60 dark:bg-slate-900/40">
                  <p className="font-semibold text-xs">{rep.senderName}</p>
                  <p>{rep.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendReply} className="p-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
            <Input
              value={threadInput}
              onChange={e => setThreadInput(e.target.value)}
              placeholder="Reply in thread..."
              className="text-sm h-9 rounded-lg"
            />
            <Button type="submit" size="icon-sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" disabled={!threadInput.trim()} aria-label="Send reply">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
