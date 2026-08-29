import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Mail, MessageSquare, Search, Send, Share2, Sparkles, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { listenToUserChats, getOrCreateChat, searchUsers, sendMessage, type ChatContact } from '@/services/chatService';
import { shareDocumentWithUsers } from '@/lib/documents';
import { shareDocumentToCourse, subscribeToTeacherCourses, type Course, type CourseMaterial } from '@/services/courseService';
import type { Chat, DocumentMeta, UserRole } from '@/types';

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentMeta | null;
}

function chatLabel(chat: Chat, currentUserId?: string) {
  if (chat.title) return chat.title;
  const names = Object.entries(chat.participantNames || {})
    .filter(([id]) => id !== currentUserId)
    .map(([, name]) => name)
    .filter(Boolean);
  return names.join(', ') || 'Liverton conversation';
}

function materialTypeForDocument(type: DocumentMeta['type']): CourseMaterial['type'] {
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  if (type === 'image') return 'image';
  if (type === 'pdf') return 'pdf';
  if (type === 'sheet') return 'spreadsheet';
  if (type === 'presentation') return 'presentation';
  return 'document';
}

export default function ShareDocumentDialog({ open, onOpenChange, document }: ShareDocumentDialogProps) {
  const { currentUser, userData, userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [busyChatId, setBusyChatId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!document) return '';
    return `${window.location.origin}/dashboard/documents/${document.id}`;
  }, [document]);

  const shareText = useMemo(() => {
    if (!document) return '';
    return `Shared document: “${document.title}”\n${shareUrl}`;
  }, [document, shareUrl]);

  useEffect(() => {
    if (!open || !currentUser?.uid) return;
    return listenToUserChats(currentUser.uid, setChats, (error) => {
      console.error('Could not load chats for document sharing:', error);
      toast.error('Could not load your chats for sharing.');
    });
  }, [open, currentUser?.uid]);

  useEffect(() => {
    if (!open || userRole !== 'teacher' || !currentUser?.uid) {
      setTeacherCourses([]);
      return;
    }
    return subscribeToTeacherCourses(currentUser.uid, setTeacherCourses);
  }, [open, userRole, currentUser?.uid]);

  useEffect(() => {
    if (!open || !currentUser?.uid) return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      setContacts([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        setContacts(await searchUsers(term, currentUser.uid));
      } catch (error) {
        console.error('Could not search users for document sharing:', error);
        setContacts([]);
        toast.error('Could not load real users for sharing.');
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, searchTerm, currentUser?.uid]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setContacts([]);
      setSelectedIds([]);
      setCopied(false);
    }
  }, [open]);

  if (!document) return null;

  const toggleContact = (uid: string) => {
    setSelectedIds((ids) => ids.includes(uid) ? ids.filter((id) => id !== uid) : [...ids, uid]);
  };

  const notifyAndGrantAccess = async (userIds: string[]) => {
    if (!currentUser || !userRole) throw new Error('You must be signed in to share a document.');
    await shareDocumentWithUsers({
      docId: document.id,
      title: document.title,
      userIds,
      senderId: currentUser.uid,
      senderName: userData?.fullName || currentUser.displayName || 'Liverton member',
      senderRole: userRole as UserRole,
    });
  };

  const handleShareWithSelectedUsers = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one real user first.');
      return;
    }
    setIsSharing(true);
    try {
      await notifyAndGrantAccess(selectedIds);
      toast.success(`Document shared with ${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'}.`);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Document sharing failed.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToChat = async (chat: Chat) => {
    if (!currentUser || !userRole) return;
    setBusyChatId(chat.id);
    try {
      const recipientIds = (chat.participants || []).filter((id) => id !== currentUser.uid && id !== 'hanna-ai');
      if (recipientIds.length > 0) await notifyAndGrantAccess(recipientIds);
      await sendMessage(chat.id, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton member', shareText);
      toast.success(`Document sent to ${chatLabel(chat, currentUser.uid)}.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the document to this chat.');
    } finally {
      setBusyChatId(null);
    }
  };

  const handleShareToNewChat = async (contact: ChatContact) => {
    if (!currentUser || !userRole) return;
    setBusyChatId(contact.uid);
    try {
      const chatId = await getOrCreateChat(
        currentUser.uid,
        contact.uid,
        { fullName: userData?.fullName || currentUser.displayName || 'Liverton member', role: userRole, username: userData?.username, email: currentUser.email || userData?.email },
        { fullName: contact.fullName, role: contact.role, username: contact.username, email: contact.email },
        shareText,
      );
      await notifyAndGrantAccess([contact.uid]);
      await sendMessage(chatId, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton member', shareText);
      toast.success(`Document sent to ${contact.fullName}.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the chat and send the document.');
    } finally {
      setBusyChatId(null);
    }
  };

  const handleShareToModule = async (course: Course) => {
    setBusyChatId(`module:${course.id}`);
    try {
      await shareDocumentToCourse({
        courseId: course.id,
        documentId: document.id,
        title: document.title,
        type: materialTypeForDocument(document.type),
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.fileSize,
        viewerUrl: shareUrl,
      });
      toast.success(`Document added to ${course.title}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share the document to this module.');
    } finally {
      setBusyChatId(null);
    }
  };

  const handleShareWithHanna = () => {
    window.dispatchEvent(new CustomEvent('open-hanna', {
      detail: { prompt: `Please review the document “${document.title}”. Open it here: ${shareUrl}` },
    }));
    toast.success('Document context loaded into Hanna.');
    onOpenChange(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Document link copied.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy the document link.');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      toast.info('Native sharing is not available here. Use Copy link or an external app below.');
      return;
    }
    try {
      await navigator.share({ title: document.title, text: `Open ${document.title} on Liverton Learning`, url: shareUrl });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') toast.error('Could not open the device share sheet.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-black">Share document</DialogTitle>
              <p className="mt-1 truncate text-xs text-slate-500">{document.title}</p>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close share dialog"><X className="h-4 w-4" /></button>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <p className="break-all text-xs font-semibold text-emerald-900 dark:text-emerald-100">{shareUrl}</p>
            <p className="mt-1 text-[11px] text-emerald-800/70 dark:text-emerald-200/70">Recipients must sign in. Access is granted to the actual account UID before the link is sent.</p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div><h3 className="text-sm font-black">Share with real users</h3><p className="text-xs text-slate-500">Search by username, email, or name.</p></div>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search a real username or email" className="pl-9" />
            </div>
            {isSearching && <p className="text-xs text-slate-500">Searching the user directory…</p>}
            {!isSearching && searchTerm.trim().length >= 2 && contacts.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">No matching real users found.</p>}
            {contacts.length > 0 && <div className="max-h-44 space-y-2 overflow-y-auto">{contacts.map((contact) => {
              const selected = selectedIds.includes(contact.uid);
              return <div key={contact.uid} className={`flex items-center gap-3 rounded-xl border p-3 ${selected ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
                <button type="button" onClick={() => toggleContact(contact.uid)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-900'}`} aria-label={`${selected ? 'Remove' : 'Select'} ${contact.fullName}`}>
                  {selected ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{contact.fullName}</p><p className="truncate text-[11px] text-slate-500">{contact.username ? `@${contact.username} · ` : ''}{contact.email}</p></div>
                <Button size="sm" variant="outline" onClick={() => handleShareToNewChat(contact)} disabled={busyChatId !== null} className="h-8 shrink-0 text-xs">{busyChatId === contact.uid ? 'Sending…' : 'Chat'}</Button>
              </div>;
            })}</div>}
            <Button onClick={handleShareWithSelectedUsers} disabled={isSharing || selectedIds.length === 0} className="w-full bg-emerald-600 text-white hover:bg-emerald-700"><Share2 className="mr-2 h-4 w-4" />{isSharing ? 'Sharing…' : `Grant access${selectedIds.length ? ` to ${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'}` : ''}`}</Button>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div><h3 className="text-sm font-black">Share in Liverton Chat</h3><p className="text-xs text-slate-500">Direct and team conversations use the same real document link.</p></div>
            {chats.filter((chat) => chat.type !== 'hanna').length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">No existing conversations. Search a user above and choose Chat.</p> : <div className="max-h-40 space-y-2 overflow-y-auto">{chats.filter((chat) => chat.type !== 'hanna').map((chat) => <button key={chat.id} type="button" onClick={() => handleShareToChat(chat)} disabled={busyChatId !== null} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-400 dark:border-slate-800"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{chatLabel(chat, currentUser?.uid)}</strong><small className="text-[11px] text-slate-500">{chat.participants.length > 2 ? 'Team conversation' : 'Direct conversation'}</small></span><Send className="h-4 w-4 text-slate-400" />{busyChatId === chat.id && <span className="text-[11px] text-emerald-600">Sending…</span>}</button>)}</div>}
          </section>

          {userRole === 'teacher' && (
            <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div><h3 className="text-sm font-black">Share to a module</h3><p className="text-xs text-slate-500">Add this existing document to one of your real modules for enrolled learners.</p></div>
              {teacherCourses.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">No teacher-owned modules are available.</p> : <div className="max-h-40 space-y-2 overflow-y-auto">{teacherCourses.map((course) => <button key={course.id} type="button" onClick={() => handleShareToModule(course)} disabled={busyChatId !== null} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-400 dark:border-slate-800"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600"><Users className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{course.title}</strong><small className="text-[11px] text-slate-500">{course.status} · {course.materials?.length || 0} materials</small></span><Send className="h-4 w-4 text-slate-400" />{busyChatId === `module:${course.id}` && <span className="text-[11px] text-emerald-600">Adding…</span>}</button>)}</div>}
            </section>
          )}

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div><h3 className="text-sm font-black">Hanna and other apps</h3><p className="text-xs text-slate-500">Hanna receives the document context; external apps receive the real link.</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Button variant="outline" onClick={handleShareWithHanna} className="h-10 gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Hanna</Button>
              <Button variant="outline" onClick={copyLink} className="h-10 gap-1.5 text-xs">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</Button>
              <Button variant="outline" onClick={nativeShare} className="h-10 gap-1.5 text-xs"><Share2 className="h-3.5 w-3.5" /> Device</Button>
              <Button variant="outline" asChild className="h-10 gap-1.5 text-xs"><a href={`mailto:?subject=${encodeURIComponent(document.title)}&body=${encodeURIComponent(shareText)}`}><Mail className="h-3.5 w-3.5" /> Email</a></Button>
              <Button variant="outline" asChild className="h-10 gap-1.5 text-xs"><a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
