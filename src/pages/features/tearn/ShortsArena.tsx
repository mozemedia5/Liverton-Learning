/**
 * Educational Shorts Arena Page
 * Vertical scrolling TikTok/Shorts style interface promoting full modules/lessons.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Tv,
  Heart,
  Share2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { getAllShorts, incrementShortLikes, incrementShortViews, followTeacher, type EducationalShort } from '@/services/tearnService';
import { useAuth } from '@/contexts/AuthContext';

export default function ShortsArena() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const [shorts, setShorts] = useState<EducationalShort[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const data = await getAllShorts();
        if (data && data.length > 0) {
          setShorts(data);
        }
      } catch (err) {
        console.error('Error fetching educational shorts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShorts();
  }, []);

  const currentShort = shorts[currentIndex];

  useEffect(() => {
    if (!currentShort?.id) return;
    incrementShortViews(currentShort.id).catch((error) => console.error('Unable to record Short view:', error));
  }, [currentShort?.id]);

  if (isLoading) {
    return <div className="min-h-screen bg-black text-white grid place-items-center"><div className="text-center"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" /><p className="text-sm text-white/60">Loading published Shorts…</p></div></div>;
  }

  if (!currentShort) {
    return <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6"><Card className="max-w-md border-white/10 bg-white/[.06] p-8 text-center text-white"><Tv className="mx-auto mb-5 h-10 w-10 text-emerald-400" /><h1 className="text-2xl font-black">No published Shorts yet</h1><p className="mt-3 text-sm leading-6 text-white/60">When an educator publishes a Short, it will appear here. Nothing is being substituted with sample videos.</p><Button className="mt-6 rounded-full bg-white text-black hover:bg-white/90" onClick={() => navigate(-1)}>Go back</Button></Card></div>;
  }

  const handleLike = async () => {
    const sId = currentShort.id;
    if (hasLiked[sId]) return;
    try {
      await incrementShortLikes(sId);
      setLikesCount(prev => ({ ...prev, [sId]: (prev[sId] || currentShort.likes) + 1 }));
      setHasLiked(prev => ({ ...prev, [sId]: true }));
      toast.success('Short liked');
    } catch (error) {
      console.error('Unable to like Short:', error);
      toast.error('Could not save your like');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Short link copied successfully!');
  };

  const handleFollow = async () => {
    if (!currentUser || userRole !== 'student') {
      toast.info('Sign in as a student to follow educators.');
      return;
    }
    try {
      await followTeacher(currentUser.uid, currentShort.teacherId);
      toast.success(`You are now following ${currentShort.teacherName}.`);
    } catch (error) {
      console.error('Unable to follow educator:', error);
      toast.error('Could not save that follow right now');
    }
  };

  const handleGoToCourse = () => {
    if (currentShort.courseId) {
      toast.success('Transitioning from Shorts to full Course curriculum!');
      navigate(`/courses/${currentShort.courseId}`);
    } else {
      toast.info('No full course linked to this promotional short yet.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between">
      {/* Top Header */}
      <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between sticky top-0 z-30">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-1">
          <Tv className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Micro-Learning</span>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Main vertical viewer */}
      <div className="flex-1 flex items-center justify-center relative p-4 max-w-lg mx-auto w-full">
        <Card className="bg-slate-950 border-white/5 w-full aspect-[9/16] relative overflow-hidden rounded-3xl flex items-center justify-center shadow-2xl">
          {/* Simulated Video background */}
          <video
            src={currentShort.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Left bottom details overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end space-y-3 z-10">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 text-slate-950 font-bold border-none">
                {currentShort.teacherName}
              </Badge>
              <Button
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] h-6 px-2.5 py-0 border-0"
                onClick={handleFollow}
              >
                Follow
              </Button>
            </div>

            <div>
              <h4 className="font-extrabold text-sm">{currentShort.title}</h4>
              <p className="text-xs text-slate-300 line-clamp-2 mt-1">{currentShort.description}</p>
            </div>

            {/* CTA action button linking snippet to Course */}
            <Button
              className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 py-2 w-full shadow-lg"
              onClick={handleGoToCourse}
            >
              <BookOpen className="w-4 h-4 fill-slate-950 text-slate-950" /> Go to Linked Lesson / Course
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Right vertical action bar */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-5 z-25 items-center bg-black/40 p-2.5 rounded-full border border-white/5 backdrop-blur-md">
            <button className="flex flex-col items-center gap-1 group" onClick={handleLike}>
              <Heart className={`w-5 h-5 transition-transform group-active:scale-90 ${hasLiked[currentShort.id] ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              <span className="text-[10px] text-slate-300 font-semibold">{likesCount[currentShort.id] || currentShort.likes}</span>
            </button>
            <button className="flex flex-col items-center gap-1 group" onClick={handleShare}>
              <Share2 className="w-5 h-5 text-white group-hover:text-emerald-400" />
              <span className="text-[10px] text-slate-300 font-semibold">Share</span>
            </button>
          </div>
        </Card>

        {/* Up/Down index swipers */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 flex gap-2">
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/5"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/5"
            disabled={currentIndex === shorts.length - 1}
            onClick={() => setCurrentIndex(prev => prev + 1)}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
