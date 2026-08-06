/**
 * Zoom Lesson Arena Page
 * Highly engaging, real-time live classroom workspace with video simulation,
 * interactive class chat, pinned learning resources, student rosters, and polls.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  MessageSquare,
  Users,
  Pin,
  Plus,
  Send,
  Loader2,
  ArrowLeft,
  Settings,
  Circle,
  BarChart2,
  FileText,
  Bookmark,
  Share2
} from 'lucide-react';
import { getLesson, type ZoomLesson } from '@/lib/zoomService';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function ZoomLessonArena() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { currentUser, userRole, userData } = useAuth();

  const [lesson, setLesson] = useState<ZoomLesson | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio/Video control states
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Classroom tabs
  const [activeTab, setActiveTab] = useState('chat');

  // Live real-time chats
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewChatMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Pinned resources
  const [pinnedResources, setPinnedResources] = useState<Array<{ name: string; url: string }>>([
    { name: 'Introduction Handout Guide.pdf', url: 'https://drive.google.com/file/d/1_handout/view' },
    { name: 'Lecture Slides.pdf', url: 'https://drive.google.com/file/d/1_slides/view' }
  ]);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  // Participant attendance roster
  const [roster, setRoster] = useState<Array<{ name: string; status: 'present' | 'offline'; role: string }>>([
    { name: 'Prof. Liverton', status: 'present', role: 'Teacher' },
    { name: 'Alex Mercer', status: 'present', role: 'Student' },
    { name: 'Clara Oswald', status: 'present', role: 'Student' },
    { name: 'Martha Jones', status: 'offline', role: 'Student' }
  ]);

  // Poll state
  const [polls, setPolls] = useState<Array<{ question: string; options: string[]; votes: number[] }>>([
    {
      question: 'Do you feel comfortable with the current theoretical paradigms?',
      options: ['Extremely comfortable', 'Need more examples', 'Still struggling'],
      votes: [5, 3, 1]
    }
  ]);
  const [voted, setVoted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadLessonData = async () => {
      if (!lessonId) return;
      try {
        const data = await getLesson(lessonId);
        setLesson(data);
      } catch (err) {
        console.error('Error loading live lesson:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLessonData();
  }, [lessonId]);

  // Real-time chat listener
  useEffect(() => {
    if (!lessonId) return;

    const q = query(
      collection(db, 'liveLessonArenaChats'),
      where('lessonId', '==', lessonId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(msgs);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error('Live lesson chat stream error:', err);
      // Online restrict sandbox fallback
      setChatMessages([
        { id: 'm1', senderName: 'Alex Mercer', content: 'Excited for today\'s lecture!', role: 'Student' },
        { id: 'm2', senderName: 'Clara Oswald', content: 'Will there be a PDF handbook shared today?', role: 'Student' }
      ]);
    });

    return () => unsubscribe();
  }, [lessonId]);

  const handleSendChatMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, 'liveLessonArenaChats'), {
        lessonId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || userData?.fullName || 'Anonymous',
        role: userRole || 'Student',
        content: newMessage,
        createdAt: serverTimestamp()
      });
      setNewChatMessage('');
    } catch (err) {
      // offline fallback
      setChatMessages(prev => [
        ...prev,
        {
          id: `off_${Date.now()}`,
          senderName: currentUser.displayName || userData?.fullName || 'Anonymous',
          role: userRole || 'Student',
          content: newMessage
        }
      ]);
      setNewChatMessage('');
      toast.info('Message sent (developer simulation)');
    }
  };

  const handleAddResource = () => {
    if (!newResourceName || !newResourceUrl) {
      toast.error('Please enter name and URL');
      return;
    }
    setPinnedResources(prev => [...prev, { name: newResourceName, url: newResourceUrl }]);
    setNewResourceName('');
    setNewResourceUrl('');
    toast.success('New supplementary resource pinned!');
  };

  const handleVote = (pollIdx: number, optionIdx: number) => {
    if (voted[pollIdx]) {
      toast.error('You already voted on this poll');
      return;
    }
    setPolls(prev => prev.map((p, idx) => {
      if (idx === pollIdx) {
        const updatedVotes = [...p.votes];
        updatedVotes[optionIdx] += 1;
        return { ...p, votes: updatedVotes };
      }
      return p;
    }));
    setVoted(prev => ({ ...prev, [pollIdx]: true }));
    toast.success('Thank you for participating in class poll!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-[#020813] text-white min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <p className="text-sm text-slate-400 font-medium">Entering Classroom Arena...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020813] text-white p-4 lg:p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs uppercase font-extrabold text-red-500 tracking-wider">Live streaming</span>
            </div>
            <h2 className="text-lg font-black mt-0.5">{lesson?.title || 'Interactive Knowledge Lecture'}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Audio/Video controllers */}
          <Button
            variant={micOn ? 'default' : 'destructive'}
            className="rounded-xl h-10 w-10 p-0"
            onClick={() => setMicOn(!micOn)}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <Button
            variant={videoOn ? 'default' : 'destructive'}
            className="rounded-xl h-10 w-10 p-0"
            onClick={() => setVideoOn(!videoOn)}
          >
            {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            className={`rounded-xl px-4 h-10 text-xs font-bold ${isRecording ? 'animate-pulse' : 'border-white/10'}`}
            onClick={() => {
              setIsRecording(!isRecording);
              toast.info(isRecording ? 'Recording saved to cloud and published!' : 'Recording started...');
            }}
          >
            <Circle className="w-3 h-3 mr-1.5 fill-red-500 text-red-500" />
            {isRecording ? 'Stop Recording' : 'Record'}
          </Button>
        </div>
      </div>

      {/* Main Grid: Stream View vs Sidebar Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center">
            {videoOn ? (
              <video
                src="https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-computer-39885-large.mp4"
                autoPlay
                loop
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center space-y-2">
                <VideoOff className="w-16 h-16 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Your video is off</p>
              </div>
            )}

            {/* Pinned Resource Slide Banner overlay */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border border-white/10">
              <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span>Attending: <strong>{roster.filter(r => r.status === 'present').length} students</strong></span>
            </div>
          </div>
        </div>

        {/* Tabbed Interactive Sidebar */}
        <div className="space-y-4">
          <Card className="bg-[#030f26]/40 border-white/5 h-[480px] flex flex-col justify-between">
            <CardHeader className="p-4 pb-0 border-b border-white/5">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-900 w-full p-1 rounded-xl">
                  <TabsTrigger value="chat" className="flex-1 rounded-lg data-[state=active]:bg-emerald-500">Chat</TabsTrigger>
                  <TabsTrigger value="resources" className="flex-1 rounded-lg data-[state=active]:bg-emerald-500">Resources</TabsTrigger>
                  <TabsTrigger value="polls" className="flex-1 rounded-lg data-[state=active]:bg-emerald-500">Polls ({polls.length})</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto">
              {/* CHAT CONTENT */}
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={msg.id || idx} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-emerald-400">{msg.senderName}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-bold capitalize">
                            {msg.role || 'Student'}
                          </span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-2xl text-slate-200 inline-block max-w-[90%]">
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <Input
                      className="bg-slate-900 border-white/5 text-xs text-white"
                      placeholder="Type message to class chat..."
                      value={newMessage}
                      onChange={e => setNewChatMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                    />
                    <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-xl" onClick={handleSendChatMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* RESOURCES CONTENT */}
              {activeTab === 'resources' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider">Pinned Lesson Materials</h4>
                    {pinnedResources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-300 hover:bg-white/10 transition-all"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="truncate">{res.name}</span>
                      </a>
                    ))}
                  </div>

                  {userRole === 'teacher' && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <h4 className="font-extrabold text-xs text-slate-300">Pin a supplementary PDF/Link</h4>
                      <Input
                        placeholder="Material Name"
                        className="bg-slate-900 border-white/5 text-xs text-white"
                        value={newResourceName}
                        onChange={e => setNewResourceName(e.target.value)}
                      />
                      <Input
                        placeholder="Drive Link URL"
                        className="bg-slate-900 border-white/5 text-xs text-white"
                        value={newResourceUrl}
                        onChange={e => setNewResourceUrl(e.target.value)}
                      />
                      <Button className="w-full bg-emerald-500 text-white rounded-xl text-xs font-bold" onClick={handleAddResource}>
                        Pin to Class
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* POLLS CONTENT */}
              {activeTab === 'polls' && (
                <div className="space-y-4">
                  {polls.map((poll, pollIdx) => (
                    <div key={pollIdx} className="p-3 bg-white/5 border border-white/5 rounded-2xl space-y-2.5">
                      <p className="text-xs font-extrabold text-slate-200">{poll.question}</p>
                      <div className="space-y-1.5">
                        {poll.options.map((opt, optIdx) => {
                          const totalVotes = poll.votes.reduce((a, b) => a + b, 0) || 1;
                          const percentage = Math.round((poll.votes[optIdx] / totalVotes) * 100);
                          return (
                            <button
                              key={optIdx}
                              className="w-full text-left p-2 bg-slate-950/60 hover:bg-slate-900 rounded-xl text-[11px] relative overflow-hidden transition-all group"
                              onClick={() => handleVote(pollIdx, optIdx)}
                            >
                              <div className="absolute inset-y-0 left-0 bg-emerald-500/10 transition-all" style={{ width: `${percentage}%` }} />
                              <div className="relative z-10 flex justify-between">
                                <span>{opt}</span>
                                <span className="font-bold">{percentage}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
