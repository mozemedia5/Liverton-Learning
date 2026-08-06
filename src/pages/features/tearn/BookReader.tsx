/**
 * Educational Book Reader & Explorer Page
 * visual side navigation for chapters, cover displays, bookmarking, and Drive PDF files.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Share2,
  Download,
  Star
} from 'lucide-react';
import { getBook, type EducationalBook } from '@/services/tearnService';

// High-fidelity fallback educational book if none exists in db
const fallbackBook: EducationalBook = {
  id: 'book_sample_1',
  title: 'Advanced Theoretical Physics Handbook',
  description: 'An exhaustive analysis of core paradigms, thermodynamic physics, quantum mechanics, and cosmic formulations.',
  coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
  teacherId: 'teacher_1',
  teacherName: 'Prof. Liverton',
  chapters: [
    {
      title: 'Chapter 1: Quantum Electro-dynamics & Paradigms',
      content: 'In quantum electrodynamics (QED), we study the relativistic quantum field theory of electrodynamics. Essentially, it describes how light and matter interact. It is mathematically complex, modeling the interactions of charged subatomic particles via exchange of virtual photons.',
      drivePdfUrls: ['https://drive.google.com/file/d/1_dummy_chapter1_pdf/view']
    },
    {
      title: 'Chapter 2: Relativistic Quantum Mechanics',
      content: 'Relativistic quantum mechanics (RQM) merges quantum mechanics with special relativity, predicting quantum behaviors at relativistic speeds (near speed of light). This chapter establishes Dirac equations, Klein-Gordon formulations, and anti-matter paradigms.',
      drivePdfUrls: ['https://drive.google.com/file/d/1_dummy_chapter2_pdf/view']
    }
  ],
  status: 'published',
  price: 19.99,
  ratingsCount: 5,
  averageRating: 4.8,
  createdAt: new Date(),
  updatedAt: new Date()
};

export default function BookReader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<EducationalBook | null>(null);
  const [loading, setLoading] = useState(true);

  // Active reading chapter index
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  // Bookmarking list
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadBookData = async () => {
      if (!bookId || bookId.startsWith('book_sample')) {
        setBook(fallbackBook);
        setLoading(false);
        return;
      }
      try {
        const data = await getBook(bookId);
        setBook(data || fallbackBook);
      } catch (err) {
        console.error('Error loading book:', err);
        setBook(fallbackBook);
      } finally {
        setLoading(false);
      }
    };
    loadBookData();
  }, [bookId]);

  const toggleBookmark = () => {
    setBookmarks(prev => {
      const isMarked = !prev[activeChapterIndex];
      if (isMarked) {
        toast.success(`Bookmarked Chapter ${activeChapterIndex + 1}!`);
      } else {
        toast.info(`Removed bookmark for Chapter ${activeChapterIndex + 1}`);
      }
      return { ...prev, [activeChapterIndex]: isMarked };
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Book reader link copied!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-[#020813] text-white min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-sm text-slate-400 font-medium">Opening Reader...</p>
      </div>
    );
  }

  const currentBook = book || fallbackBook;
  const currentChapter = currentBook.chapters?.[activeChapterIndex] || currentBook.chapters?.[0];

  return (
    <div className="min-h-screen bg-[#020813] text-white p-4 lg:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Book Reader</span>
            <h2 className="text-base font-black truncate max-w-sm md:max-w-md">{currentBook.title}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 rounded-xl" onClick={toggleBookmark}>
            <Bookmark className={`w-4 h-4 mr-1.5 ${bookmarks[activeChapterIndex] ? 'fill-amber-400 text-amber-400' : ''}`} />
            {bookmarks[activeChapterIndex] ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 rounded-xl" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>
      </div>

      {/* Reader Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Chapter Navigation Index */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="bg-[#030f26]/40 border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <img src={currentBook.coverUrl || fallbackBook.coverUrl} alt="Cover" className="h-44 w-full object-cover rounded-xl" />
              <div className="mt-3">
                <p className="text-xs text-slate-400">By {currentBook.teacherName}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  <span>{currentBook.averageRating || 4.8} ({currentBook.ratingsCount || 5} ratings)</span>
                </div>
              </div>
            </div>
            <CardContent className="p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 block mb-2">Chapters Catalog</span>
              <div className="space-y-1">
                {(currentBook.chapters || []).map((ch, idx) => (
                  <button
                    key={idx}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                      activeChapterIndex === idx
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                    onClick={() => setActiveChapterIndex(idx)}
                  >
                    <span className="truncate max-w-[80%]">{ch.title}</span>
                    {bookmarks[idx] && <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right Study Body Viewer */}
        <div className="lg:col-span-3 space-y-6">
          {currentChapter ? (
            <Card className="bg-[#030f26]/40 border-white/5 p-6 md:p-8 space-y-6 min-h-[440px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-lg md:text-xl font-black text-amber-400">{currentChapter.title}</h3>
                  <span className="text-xs text-slate-400">Chapter {activeChapterIndex + 1} of {currentBook.chapters?.length}</span>
                </div>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {currentChapter.content}
                </p>

                {/* Attached drive PDF resources */}
                {currentChapter.drivePdfUrls && currentChapter.drivePdfUrls.length > 0 && (
                  <div className="pt-6 border-t border-white/5 space-y-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Chapter Learning Handouts (PDF)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentChapter.drivePdfUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span className="truncate">Download Chapter Resource Part {idx + 1}</span>
                          <Download className="w-3.5 h-3.5 ml-auto text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Back / Next chapter footer */}
              <div className="flex justify-between pt-6 border-t border-white/5 mt-auto">
                <Button
                  variant="outline"
                  className="border-white/10 rounded-xl text-xs"
                  disabled={activeChapterIndex === 0}
                  onClick={() => setActiveChapterIndex(prev => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous Chapter
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 rounded-xl text-xs"
                  disabled={activeChapterIndex === currentBook.chapters.length - 1}
                  onClick={() => setActiveChapterIndex(prev => prev + 1)}
                >
                  Next Chapter <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-[#030f26]/40 border-white/5 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select any chapter from left-hand table to begin reading.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
