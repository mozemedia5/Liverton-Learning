import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  Share2,
  Download,
  Sparkles,
  Info,
  X,
  Star,
  FileText,
  Bookmark,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getDocument, updateReadingProgress, getReadingProgress, toggleDocumentFavorite } from '@/lib/documents';
import { streamHannaReply, isGeminiConfigured } from '@/lib/hannaGemini';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import DocumentFileViewer from '@/components/DocumentFileViewer';
import ShareDocumentDialog from '@/components/ShareDocumentDialog';
import { getDocumentDownloadName } from '@/lib/documents';

// CDN Paths for PDF.js
const PDFJS_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function isPdfDocumentRecord(record: any): boolean {
  const mime = String(record?.mimeType || '').toLowerCase();
  const name = String(record?.fileName || record?.title || '').toLowerCase();
  return record?.type === 'pdf' || mime === 'application/pdf' || name.endsWith('.pdf');
}

interface SearchResult {
  pageNumber: number;
  matchIndex: number;
  snippet: string;
  itemIndex: number;
  charIndex: number;
  textItem: any;
}

export default function DocumentEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  // Document metadata state
  const [docMeta, setDocMeta] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  // PDF.js loading state
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Reader Viewport Controls state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100%
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270 deg
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [shareDocumentOpen, setShareDocumentOpen] = useState(false);
  const [pageAspectRatio, setPageAspectRatio] = useState<number>(0.75); // Width / Height aspect ratio

  // Page bookmarks / favorites inside the document
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [allPagesText, setAllPagesText] = useState<{ [pageNum: number]: any[] }>({});

  // Hanna AI Side Panel state
  const [isHannaOpen, setIsHannaOpen] = useState(false);
  const [hannaMessages, setHannaMessages] = useState<Array<{ sender: 'user' | 'hanna'; text: string }>>([]);
  const [hannaInput, setHannaInput] = useState('');
  const [isHannaGenerating, setIsHannaGenerating] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const thumbnailRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});
  const hannaEndRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // 1. Fetch Document Metadata from Firestore
  useEffect(() => {
    const fetchMeta = async () => {
      if (!docId || !currentUser) return;
      try {
        const docRecord = await getDocument(docId);
        if (!docRecord) {
          toast.error('Document not found.');
          navigate('/dashboard/documents');
          return;
        }
        setDocMeta(docRecord);

        // Fetch User Progress
        const progress = await getReadingProgress(docId, currentUser.uid);
        if (progress) {
          setBookmarkedPages(progress.bookmarkedPages || []);
          if (progress.lastPageRead > 1) {
            // Let the reader render first, then scroll
            setTimeout(() => {
              const confirmResume = window.confirm(`Resume reading at page ${progress.lastPageRead}?`);
              if (confirmResume) {
                handleGoToPage(progress.lastPageRead);
              }
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Failed to load document metadata:', err);
        toast.error('Could not load document.');
        navigate('/dashboard/documents');
      } finally {
        setLoadingDoc(false);
      }
    };
    fetchMeta();
  }, [docId, currentUser]);

  // 2. Dynamically Load PDF.js from CDN
  useEffect(() => {
    const initPDFJS = async () => {
      try {
        if (docMeta && !isPdfDocumentRecord(docMeta)) return;
        if ((window as any).pdfjsLib) {
          setPdfjs((window as any).pdfjsLib);
          return;
        }
        const script = document.createElement('script');
        script.src = PDFJS_SCRIPT_URL;
        script.onload = () => {
          const lib = (window as any).pdfjsLib;
          lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          setPdfjs(lib);
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error('Failed to load PDF.js script:', err);
        setPdfError('Failed to load browser PDF renderer script.');
      }
    };
    initPDFJS();
  }, []);

  // 3. Load PDF Document once Metadata and PDF.js are loaded
  useEffect(() => {
    const loadPdfDoc = async () => {
      if (!pdfjs || !docMeta?.fileUrl || !isPdfDocumentRecord(docMeta)) return;
      setLoadingPdf(true);
      setPdfError(null);
      try {
        const loadingTask = pdfjs.getDocument(docMeta.fileUrl);
        const docInstance = await loadingTask.promise;
        setPdfDoc(docInstance);
        setNumPages(docInstance.numPages);

        // Update Page Count in metadata if it is 0
        if (!docMeta.pageCount || docMeta.pageCount === 0) {
          const refDoc = doc(db, 'documents', docId!);
          await updateDoc(refDoc, { pageCount: docInstance.numPages });
          setDocMeta((prev: any) => ({ ...prev, pageCount: docInstance.numPages }));
        }

        // Fetch first page aspect ratio
        const firstPage = await docInstance.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        setPageAspectRatio(viewport.width / viewport.height);

        // Pre-fetch text content of all pages in background for in-document search
        preloadAllText(docInstance);

      } catch (err) {
        console.error('Error loading PDF document:', err);
        setPdfError('Failed to load PDF document. Corrupted or password protected.');
      } finally {
        setLoadingPdf(false);
      }
    };
    loadPdfDoc();
  }, [pdfjs, docMeta]);

  // 4. Preload page text content for search capabilities
  const preloadAllText = async (instance: any) => {
    const pagesText: { [pageNum: number]: any[] } = {};
    for (let i = 1; i <= instance.numPages; i++) {
      try {
        const page = await instance.getPage(i);
        const textContent = await page.getTextContent();
        pagesText[i] = textContent.items;
      } catch (err) {
        console.warn(`Could not load search text for page ${i}`, err);
      }
    }
    setAllPagesText(pagesText);
  };

  // 5. Debounced reading progress updater
  const debouncedSaveProgress = useCallback((pageNum: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      if (!currentUser || !docId || numPages === 0) return;
      try {
        await updateReadingProgress({
          docId,
          userId: currentUser.uid,
          lastPageRead: pageNum,
          totalPages: numPages,
          bookmarkedPages,
        });

        // Sync local cache
        const localKey = `liverton_recent_pdfs_${currentUser.uid}`;
        const recent = JSON.parse(localStorage.getItem(localKey) || '[]') as any[];
        const filtered = recent.filter((r) => r.docId !== docId);
        filtered.unshift({
          docId,
          title: docMeta?.title || 'Untitled',
          lastPageRead: pageNum,
          totalPages: numPages,
          percentage: Math.round((pageNum / numPages) * 100),
          lastOpenedAt: new Date().toISOString(),
        });
        localStorage.setItem(localKey, JSON.stringify(filtered.slice(0, 4)));
      } catch (err) {
        console.warn('Could not save progress:', err);
      }
    }, 1500); // Debounce write operations for 1.5s
  }, [currentUser, docId, numPages, docMeta, bookmarkedPages]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 6. Draw PDF canvas page on-demand
  const renderCanvasPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom, rotation });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error(`Render failed for page ${pageNum}:`, err);
    }
  }, [pdfDoc, zoom, rotation]);

  // 7. Render Page Thumbnails on sidebar
  const renderThumbnailPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc || !canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.15 });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.warn(`Could not render thumbnail for page ${pageNum}`, err);
    }
  }, [pdfDoc]);

  // 8. Intersection Observer for Lazy Rendering & Current Page Tracking
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '0');
          if (pageNum === 0) return;

          if (entry.isIntersecting) {
            // Render visible page onto canvas on-demand
            renderCanvasPage(pageNum);

            // Highlight active page on scrolling
            if (entry.intersectionRatio > 0.4) {
              setCurrentPage(pageNum);
              debouncedSaveProgress(pageNum);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.1, 0.5, 0.8],
      }
    );

    // Observe all pages
    Object.keys(pageRefs.current).forEach((key) => {
      const el = pageRefs.current[parseInt(key)];
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, renderCanvasPage, debouncedSaveProgress]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Exclude forms
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleGoToPage(Math.min(currentPage + 1, numPages));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handleGoToPage(Math.max(currentPage - 1, 1));
      } else if (e.key === 'Home') {
        handleGoToPage(1);
      } else if (e.key === 'End') {
        handleGoToPage(numPages);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  // Jumps scrollbar to selected page index
  const handleGoToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return;
    setCurrentPage(pageNum);
    const targetEl = pageRefs.current[pageNum];
    if (targetEl && scrollContainerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    debouncedSaveProgress(pageNum);
  };

  // Fullscreen support
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Internal In-document Text Search matching
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setActiveMatchIndex(-1);
      return;
    }
    const matches: SearchResult[] = [];
    const term = searchQuery.toLowerCase();

    // Loop through all parsed pages text lines
    Object.keys(allPagesText).forEach((key) => {
      const pageNum = parseInt(key);
      const items = allPagesText[pageNum] || [];

      items.forEach((item, itemIdx) => {
        const text = item.str.toLowerCase();
        let charIdx = text.indexOf(term);
        let matchIdx = 0;

        while (charIdx !== -1) {
          matches.push({
            pageNumber: pageNum,
            matchIndex: matchIdx++,
            snippet: item.str,
            itemIndex: itemIdx,
            charIndex: charIdx,
            textItem: item,
          });
          charIdx = text.indexOf(term, charIdx + 1);
        }
      });
    });

    setSearchResults(matches);

    if (matches.length > 0) {
      setActiveMatchIndex(0);
      handleGoToPage(matches[0].pageNumber);
      toast.success(`Found ${matches.length} matches inside PDF.`);
    } else {
      setActiveMatchIndex(-1);
      toast.info('No matches found.');
    }
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    setActiveMatchIndex(nextIdx);
    handleGoToPage(searchResults[nextIdx].pageNumber);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveMatchIndex(prevIdx);
    handleGoToPage(searchResults[prevIdx].pageNumber);
  };

  // Page level bookmarking
  const handleToggleBookmark = async () => {
    const isBookmarked = bookmarkedPages.includes(currentPage);
    let nextBookmarks = [...bookmarkedPages];

    if (isBookmarked) {
      nextBookmarks = nextBookmarks.filter((p) => p !== currentPage);
      toast.success(`Removed Page ${currentPage} from Bookmarks.`);
    } else {
      nextBookmarks.push(currentPage);
      nextBookmarks.sort((a, b) => a - b);
      toast.success(`Bookmarked Page ${currentPage}!`);
    }

    setBookmarkedPages(nextBookmarks);

    // Save bookmarks to user reading progress doc
    if (currentUser && docId) {
      const progressRef = doc(db, 'documents', docId, 'userProgress', currentUser.uid);
      await updateDoc(progressRef, {
        bookmarkedPages: nextBookmarks,
      }).catch(() => {});
    }
  };

  // Document favorite toggle
  const handleToggleFavDoc = async () => {
    if (!docMeta) return;
    try {
      await toggleDocumentFavorite(docId!, !docMeta.isFavorite);
      setDocMeta((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));
      toast.success(docMeta.isFavorite ? 'Removed from favorites.' : 'Added document to favorites!');
    } catch (err) {
      toast.error('Could not save favorite');
    }
  };

  // Interactive Hanna AI query streaming inside PDF Reader
  const handleSendHanna = async (prePromptText?: string) => {
    const queryText = (prePromptText || hannaInput).trim();
    if (!queryText || isHannaGenerating) return;

    if (!isGeminiConfigured()) {
      toast.error('Hanna is offline. Gemini API key is missing.');
      return;
    }

    setHannaInput('');
    setIsHannaGenerating(true);
    setHannaMessages((prev) => [...prev, { sender: 'user', text: queryText }]);

    let pageContextPrompt = queryText;

    // Auto-generate contextual details about active page text
    const activePageText = allPagesText[currentPage]
      ?.map((item) => item.str)
      ?.join(' ')
      ?.slice(0, 1500) || '';

    if (activePageText) {
      pageContextPrompt = `[Currently Opened PDF Page Text (Page ${currentPage} of ${numPages}):\n"${activePageText}"]\n\nUser Question: ${queryText}`;
    }

    try {
      // Build conversation logs
      const history = hannaMessages.slice(-6).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'hanna') as 'user' | 'hanna',
        content: m.text,
      }));

      let streamingReply = '';
      setHannaMessages((prev) => [...prev, { sender: 'hanna', text: 'Thinking...' }]);

      await streamHannaReply(
        history,
        pageContextPrompt,
        [], // No direct upload file attachments necessary
        (chunk) => {
          streamingReply = chunk;
          setHannaMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { sender: 'hanna', text: streamingReply };
            return copy;
          });
        },
        undefined,
        {
          userName: userData?.fullName || 'Student',
          userRole: userRole || 'student',
        }
      );
    } catch (err) {
      console.error('Hanna response failed:', err);
      toast.error('Hanna experienced high demand. Please try again.');
    } finally {
      setIsHannaGenerating(false);
    }
  };

  // Auto-scroll Hanna chat to bottom
  useEffect(() => {
    hannaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hannaMessages]);

  if (loadingDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500 font-bold animate-pulse">Loading workspace metadata...</p>
        </div>
      </div>
    );
  }

  if (docMeta && !isPdfDocumentRecord(docMeta)) {
    return <DocumentFileViewer doc={docMeta} onBack={() => navigate('/dashboard/documents')} />;
  }

  return (
    <>
      <SEO title={`${docMeta?.title || 'Document'} | Liverton Learning`} description="Open and share documents, media, and course files in Liverton Learning." noIndex />

      <div
        ref={containerRef}
        className="h-[calc(100vh-4rem)] w-full bg-slate-100 dark:bg-[#07070a] flex flex-col overflow-hidden select-none relative lg:h-screen"
      >

        {/* TOP READER TOOLBAR */}
        <header className="h-14 border-b border-slate-200/60 dark:border-white/5 bg-white/90 dark:bg-[#09090d]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/documents')}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 flex-shrink-0 animate-pulse" />
              <h1 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[200px]" title={docMeta?.title}>
                {docMeta?.title}
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavDoc}
              className="h-8 w-8 text-slate-400 hover:text-amber-500"
              title="Bookmark file"
            >
              <Star className={`w-4.5 h-4.5 ${docMeta?.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
            </Button>
          </div>

          {/* Scrolling & Jump to Page Center block */}
          {numPages > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleGoToPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                <span>Page</span>
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= numPages) handleGoToPage(val);
                  }}
                  className="w-10 bg-transparent text-center border-b border-slate-300 dark:border-white/10 outline-none text-emerald-500 font-extrabold"
                />
                <span>of</span>
                <span>{numPages}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleGoToPage(Math.min(currentPage + 1, numPages))}
                disabled={currentPage === numPages}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* In-document Search input area */}
          <div className="hidden lg:flex items-center gap-2 max-w-xs relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find text..."
              className="h-8 text-xs glass-card pl-8 pr-12 w-48 focus:w-64 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

            {searchResults.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold mr-1">
                  {activeMatchIndex + 1}/{searchResults.length}
                </span>
                <button onClick={handlePrevMatch} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleNextMatch} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Controls toolbar buttons */}
          <div className="flex items-center gap-1.5">
            {/* Page Bookmarking */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleBookmark}
              className={`h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg ${bookmarkedPages.includes(currentPage) ? 'text-emerald-500' : 'text-slate-400'}`}
              title="Bookmark current page"
            >
              <Bookmark className="w-4.5 h-4.5" />
            </Button>

            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500 font-black px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.0))}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            {/* Fit Width / Reset Zoom */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1.0)}
              className="hidden sm:inline-flex h-8 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              100%
            </Button>

            {/* Rotation */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500"
              title="Rotate page"
            >
              <RotateCw className="w-4.5 h-4.5" />
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500"
              title="Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </Button>

            {/* Download */}
            {docMeta?.fileUrl && (
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-500 rounded-lg">
                <a href={docMeta.fileUrl} download={getDocumentDownloadName(docMeta)} target="_blank" rel="noreferrer">
                  <Download className="w-4.5 h-4.5" />
                </a>
              </Button>
            )}

            {/* Share */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShareDocumentOpen(true)}
              className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
              title="Share document"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            {/* Info Drawer */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className={`h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg ${isInfoOpen ? 'text-emerald-500' : 'text-slate-500'}`}
              title="Document properties"
            >
              <Info className="w-4.5 h-4.5" />
            </Button>

            {/* Hanna AI */}
            <Button
              onClick={() => setIsHannaOpen(!isHannaOpen)}
              className={`h-8 px-3 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${
                isHannaOpen
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
              }`}
              title="Ask Hanna AI Study Buddy"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Ask Hanna</span>
            </Button>
          </div>
        </header>

        {/* WORKSPACE MIDDLE BODY */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* LEFT SIDEBAR PANEL (Collapsible Page Thumbnails List) */}
          {isSidebarOpen && numPages > 0 && (
            <div className="w-56 bg-white dark:bg-[#09090d] border-r border-slate-200/60 dark:border-white/5 flex flex-col z-10 transition-all">
              <div className="p-3 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Page Thumbnails
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {Array.from({ length: numPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = currentPage === pageNum;
                  const isBookmarked = bookmarkedPages.includes(pageNum);

                  return (
                    <div
                      key={pageNum}
                      ref={(el) => { thumbnailRefs.current[pageNum] = el; }}
                      onClick={() => handleGoToPage(pageNum)}
                      className={`cursor-pointer group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500'
                      }`}
                    >
                      <div className="relative border border-slate-200 dark:border-white/5 rounded-lg overflow-hidden bg-slate-50 shadow-sm max-w-[140px] w-full">
                        {/* On-demand Thumbnail Render */}
                        <canvas
                          ref={(el) => {
                            if (el) renderThumbnailPage(pageNum, el);
                          }}
                          className="w-full h-auto object-contain bg-white"
                        />
                        {isBookmarked && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded shadow">
                            <Bookmark className="w-2.5 h-2.5 fill-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold">Page {pageNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sidebar Toggle handle */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute left-4 top-4 z-10 p-2 bg-white/90 dark:bg-[#09090d]/90 backdrop-blur border border-slate-200 dark:border-white/5 rounded-xl shadow-md hover:scale-105 active:scale-95 text-slate-500 transition-all"
              title="Show thumbnails"
            >
              <FileText className="w-4.5 h-4.5" />
            </button>
          )}

          {/* MAIN PDF CANVAS SCROLLER PORT */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {loadingPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm text-slate-500 font-bold animate-pulse">Rendering high-quality PDF canvases...</p>
              </div>
            ) : pdfError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
                <HelpCircle className="w-16 h-16 text-red-500" />
                <div className="space-y-1">
                  <h2 className="font-extrabold text-lg text-slate-800 dark:text-white">Failed to load PDF</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">{pdfError}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/dashboard/documents')} className="glass-card font-bold">
                  Return to library
                </Button>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-thin select-text"
              >
                {Array.from({ length: numPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  const hasPageBookmarks = bookmarkedPages.includes(pageNum);

                  // Extract active search highlights for this page
                  const pageSearchMatches = searchResults.filter((r) => r.pageNumber === pageNum);

                  return (
                    <div
                      key={pageNum}
                      ref={(el) => { pageRefs.current[pageNum] = el; }}
                      data-page-num={pageNum}
                      className="relative mx-auto border border-slate-200/80 dark:border-white/5 bg-white shadow-lg rounded-2xl overflow-hidden transition-all duration-300"
                      style={{
                        width: `${zoom * 800 * pageAspectRatio}px`,
                        maxWidth: '95%',
                        aspectRatio: pageAspectRatio,
                      }}
                    >
                      {/* On-demand Canvas view */}
                      <canvas
                        ref={(el) => { canvasRefs.current[pageNum] = el; }}
                        className="w-full h-full object-contain bg-white block"
                      />

                      {/* TEXT SEARCH HIGHLIGHTING LAYER OVERLAY */}
                      {pageSearchMatches.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {pageSearchMatches.map((match, idx) => {
                            // Find viewport details
                            const canvas = canvasRefs.current[pageNum];
                            if (!canvas || !pdfDoc) return null;

                            // Bounding box mapping math using conversion constants
                            // Text coordinates are relative to PDF page space (origin bottom-left)
                            const scaleFactor = canvas.width / match.textItem.transform[0];
                            const tx = match.textItem.transform[4] * scaleFactor;
                            const ty = canvas.height - (match.textItem.transform[5] * scaleFactor) - (match.textItem.height * scaleFactor);
                            const w = (match.textItem.width || 100) * scaleFactor;
                            const h = (match.textItem.height || 14) * scaleFactor;

                            const isMatchActive = activeMatchIndex !== -1 && searchResults[activeMatchIndex] === match;

                            return (
                              <div
                                key={idx}
                                className={`absolute rounded ${
                                  isMatchActive
                                    ? 'bg-amber-500/40 ring-2 ring-amber-500 animate-pulse'
                                    : 'bg-yellow-300/35 border border-yellow-300/10'
                                }`}
                                style={{
                                  left: `${tx}px`,
                                  top: `${ty}px`,
                                  width: `${w}px`,
                                  height: `${h}px`,
                                }}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Floating Ribbon indicator for Bookmarked Pages */}
                      {hasPageBookmarks && (
                        <div className="absolute top-0 right-6 bg-emerald-500 text-white px-2 py-3 rounded-b shadow font-bold text-[10px] tracking-wider flex flex-col items-center gap-1">
                          <Bookmark className="w-3.5 h-3.5 fill-white" />
                        </div>
                      )}

                      {/* Floating Bottom Page indicator */}
                      <div className="absolute bottom-3 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow border border-white/10 opacity-0 hover:opacity-100 transition-opacity">
                        Page {pageNum} of {numPages}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR PANEL (Collapsible Hanna AI Study Companion Drawer) */}
          {isHannaOpen && (
            <div className="w-[360px] max-w-full bg-white dark:bg-[#07070a] border-l border-slate-200/60 dark:border-white/5 flex flex-col z-10 transition-all relative">

              <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-white leading-tight">Hanna Study Tutor</h3>
                    <p className="text-[9px] text-emerald-500 font-bold">Active on Page {currentPage}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHannaOpen(false)}
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Study helper buttons panel */}
              <div className="p-3 bg-slate-100/50 dark:bg-white/[0.01] border-b border-slate-200/30 dark:border-white/5 flex flex-wrap gap-1.5 justify-start">
                <button
                  onClick={() => handleSendHanna('Can you write a concise, highly readable summary of this PDF page? Highlight 3 key lessons.')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/15"
                >
                  Summarize Page
                </button>
                <button
                  onClick={() => handleSendHanna('Extract the key takeaways and bullet points from this section.')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 border border-blue-500/15"
                >
                  Extract Key Points
                </button>
                <button
                  onClick={() => handleSendHanna('Create a quick 3-question revision practice quiz for me based on this page.')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border border-amber-500/15"
                >
                  Create Quiz
                </button>
              </div>

              {/* Chat log messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {hannaMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <Sparkles className="w-10 h-10 text-emerald-500 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Your PDF Study Helper</h4>
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                        Click any action chip above or type below to ask Hanna questions, explain topics, or generate exercises dynamically.
                      </p>
                    </div>
                  </div>
                ) : (
                  hannaMessages.map((m, i) => {
                    const isUser = m.sender === 'user';
                    return (
                      <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
                        <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isUser
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                {isHannaGenerating && (
                  <div className="flex justify-start animate-in fade-in duration-100">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400 animate-pulse">Hanna typing...</span>
                    </div>
                  </div>
                )}
                <div ref={hannaEndRef} />
              </div>

              {/* Hanna Chat composer footer */}
              <footer className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendHanna();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={hannaInput}
                    onChange={(e) => setHannaInput(e.target.value)}
                    placeholder="Type study question..."
                    className="h-9 text-xs glass-card"
                    disabled={isHannaGenerating}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!hannaInput.trim() || isHannaGenerating}
                    className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </footer>
            </div>
          )}

          {/* RIGHT SIDEBAR PANEL (Collapsible Document Properties Info Pane) */}
          {isInfoOpen && (
            <div className="w-72 bg-white dark:bg-[#09090d] border-l border-slate-200/60 dark:border-white/5 flex flex-col z-10 p-5 space-y-6 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-3">
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest">
                  Document Info
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsInfoOpen(false)}
                  className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Filename</span>
                  <p className="font-extrabold text-slate-700 dark:text-slate-200 break-words leading-tight">{docMeta?.title}.pdf</p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">File Size</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {docMeta?.fileSize ? `${(docMeta.fileSize / (1024 * 1024)).toFixed(2)} MB` : '—'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Total Pages</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{numPages} pages</p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Current position</span>
                  <p className="font-semibold text-emerald-500">Page {currentPage} ({Math.round((currentPage / numPages) * 100)}%)</p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Upload Date</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {docMeta?.createdAt instanceof Date
                      ? docMeta.createdAt.toLocaleString()
                      : typeof docMeta?.createdAt?.toDate === 'function'
                        ? docMeta.createdAt.toDate().toLocaleString()
                        : '—'}
                  </p>
                </div>

                <div className="space-y-1 border-t border-slate-200/50 dark:border-white/5 pt-4">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Internal Sharing</span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase py-0 tracking-wider">
                        {docMeta?.visibility}
                      </Badge>
                    </div>
                    {docMeta?.sharedWith && docMeta.sharedWith.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 block">Shared with:</span>
                        {docMeta.sharedWith.map((email: string) => (
                          <div key={email} className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                            {email}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-slate-400">Only visible to you unless shared.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <ShareDocumentDialog open={shareDocumentOpen} onOpenChange={setShareDocumentOpen} document={docMeta} />
    </>
  );
}
