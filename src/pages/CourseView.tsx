import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft, BookOpen, Loader2, Video, FileText, Music,
  FileSpreadsheet, Presentation, Image as ImageIcon, File as FileIcon,
  Users, DollarSign, Pencil, Share2, LogIn, UserPlus, Lock,
  Star, MessageCircle, Send, CheckCircle2
} from 'lucide-react';
import { enrollStudent, getPublicCourse, type Course, type CourseMaterial } from '@/services/courseService';
import { addCourseReview, subscribeToCourseReviews, type CourseReview } from '@/services/courseReviewService';
import { recordCourseView } from '@/services/courseStatsService';
import { absoluteUrl } from '@/lib/seo';

function materialIcon(type: CourseMaterial['type']) {
  switch (type) {
    case 'video': return <Video className="w-5 h-5" />;
    case 'audio': return <Music className="w-5 h-5" />;
    case 'image': return <ImageIcon className="w-5 h-5" />;
    case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5" />;
    case 'presentation': return <Presentation className="w-5 h-5" />;
    case 'pdf':
    case 'document': return <FileText className="w-5 h-5" />;
    default: return <FileIcon className="w-5 h-5" />;
  }
}

/**
 * Shareable, role-agnostic course detail page.
 * A shared course link opens exactly this page for any signed-in user.
 */
export default function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();
  const location = useLocation();

  const [course, setCourse] = useState<Course | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!courseId) return;
      try {
        const data = await getPublicCourse(courseId);
        if (!data) {
          setNotFound(true);
        } else {
          setCourse(data);
        }
      } catch (error) {
        console.error('Error loading course:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    return subscribeToCourseReviews(courseId, setReviews);
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !currentUser?.uid || !course) return;
    const sessionKey = `liverton-module-view:${courseId}:${currentUser.uid}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    void recordCourseView(courseId, currentUser.uid).catch((error) => {
      sessionStorage.removeItem(sessionKey);
      console.warn('Unable to record module view:', error);
    });
  }, [courseId, currentUser?.uid, course]);

  const handleShare = async () => {
    const url = absoluteUrl(`/courses/${courseId}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Module link copied to clipboard');
    } catch {
      toast.info(url);
    }
  };

  // Structured Data (JSON-LD) for SEO / AI Search Engines
  useEffect(() => {
    if (!course) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": course.title,
      "description": course.description || `Learn ${course.subject} in a Liverton module.`,
      "provider": {
        "@type": "Organization",
        "name": "Liverton Learning",
        "sameAs": "https://liverton-learning.vercel.app"
      },
      "instructor": {
        "@type": "Person",
        "name": course.teacherName
      },
      "educationalCredentialAwarded": "Certificate of Completion",
      "about": course.subject
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [course]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-400">Loading module...</p>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookOpen className="w-10 h-10 text-slate-300" />
        <p className="font-semibold">Module not found</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const isOwner = currentUser?.uid === course.teacherId;
  const isEnrolled = !!currentUser && course.enrolledStudents?.includes(currentUser.uid);
  const isStudentLike = userRole === 'student' || userRole === 'parent';
  const isFreeModule = course.price <= 0 || course.isFree === true;
  const averageRating = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const hasReviewed = reviews.some((review) => review.userId === currentUser?.uid);

  const handleEnroll = async () => {
    if (!currentUser) {
      handleGuestAction(isFreeModule ? 'to join this free module' : 'to purchase this module');
      return;
    }
    if (!isStudentLike) return;
    if (!isFreeModule) {
      toast.info('This module requires verified checkout. Payment access will be enabled from the payment page.');
      navigate(`/payments?moduleId=${course.id}`);
      return;
    }
    if (isEnrolled) return;
    try {
      await enrollStudent(course.id, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton learner', currentUser.email || undefined);
      setCourse((previous) => previous ? { ...previous, enrolledStudents: [...(previous.enrolledStudents || []), currentUser.uid] } : previous);
      toast.success('You are enrolled. Start learning for free.');
    } catch (error) {
      console.error('Unable to enroll in free module:', error);
      toast.error('We could not enroll you right now. Please try again.');
    }
  };

  const submitReview = async () => {
    if (!currentUser || !userData) {
      handleGuestAction('to leave a review');
      return;
    }
    if (hasReviewed) {
      toast.info('You have already reviewed this module.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await addCourseReview({
        courseId: course.id,
        userId: currentUser.uid,
        userName: userData.fullName || currentUser.displayName || 'Liverton learner',
        username: userData.username,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewComment('');
      setReviewRating(5);
      toast.success('Your review is now live.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'We could not publish your review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Guest trigger state
  const handleGuestAction = (reason: string) => {
    setAuthModalReason(reason);
    setShowAuthModal(true);
  };

  const handleAuthRedirect = (mode: 'login' | 'register') => {
    const intended = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/${mode}`, { state: { from: intended } });
  };

  return (
    <div className="space-y-6">
      <SEO
        title={course.title}
        description={course.description?.slice(0, 155) || `Learn ${course.subject} on Liverton Learning with ${course.teacherName}.`}
        path={`/courses/${course.id}`}
        image={course.thumbnail}
        type="article"
      />

      {/* Guest Authentication Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative design elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />

          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner relative z-10">
              <Lock className="w-8 h-8" />
            </div>

            <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Unlock Full Access
            </DialogTitle>

            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              You need a Liverton Learning account {authModalReason}. Sign in or create a free profile now to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-6 relative z-10">
            <Button
              className="py-6 bg-[#00A86B] hover:bg-[#00905B] text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/10 transition-all duration-200 hover:scale-103"
              onClick={() => handleAuthRedirect('login')}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Button>

            <Button
              variant="outline"
              className="py-6 border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-2xl font-bold text-base transition-all duration-200 hover:scale-103"
              onClick={() => handleAuthRedirect('register')}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create Free Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden py-0 gap-0">
        <div className="relative">
          <CloudinaryImage
            src={course.thumbnail}
            alt={course.title}
            aspect="21/9"
            widths={[640, 960, 1280, 1600]}
            sizes="(max-width: 1280px) 100vw, 1280px"
            eager
            fallback={<div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>

        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold">{course.title}</h1>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 capitalize">
                  {course.subject}
                </Badge>
                {course.grade && <Badge variant="outline">{course.grade}</Badge>}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
                {course.description || 'A learning module on Liverton Learning.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                <span>By <span className="font-semibold text-slate-600 dark:text-slate-300">{course.teacherName}</span></span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.enrolledStudents?.length || 0} enrolled</span>
                {course.lessons > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.lessons} lessons</span>}
                {course.duration && <span>{course.duration}</span>}
              </div>
            </div>

            <div className="flex-shrink-0 flex md:flex-col items-center md:items-end gap-2">
              {course.price > 0 ? (
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> {course.currency || 'UGX'} {course.price.toLocaleString()}
                </span>
              ) : (
                <Badge className="bg-emerald-500 text-white border-0">FREE</Badge>
              )}
              {!currentUser ? (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={handleEnroll}
                >
                  {isFreeModule ? 'Start for free' : 'Purchase module'}
                </Button>
              ) : isOwner ? (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={() => navigate(`/teacher/courses/${course.id}`)}
                >
                  <Pencil className="w-4 h-4 mr-1.5" /> Manage Module
                </Button>
              ) : isEnrolled ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 py-1.5 px-3">
                  Enrolled
                </Badge>
              ) : isStudentLike ? (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={handleEnroll}
                >
                  {isFreeModule ? 'Start for free' : 'Purchase module'}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="module-reviews-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Live learner feedback</p>
            <h2 id="module-reviews-heading" className="flex items-center gap-2 text-lg font-bold"><MessageCircle className="h-5 w-5 text-emerald-500" /> Module reviews</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{averageRating ? averageRating.toFixed(1) : '0.0'}</span>
            <span>from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
          </div>
        </div>

        {currentUser && isStudentLike && !hasReviewed && !isOwner && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold">Share your experience</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your review appears here for other learners in real time.</p>
              </div>
              <div className="flex items-center gap-1" aria-label="Choose a rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} stars`} aria-pressed={reviewRating === value} className="rounded-md p-1 transition hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <Star className={`h-5 w-5 ${value <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="What did you learn from this module?" rows={3} maxLength={500} className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-zinc-950" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">{reviewComment.length}/500</span>
                <Button size="sm" onClick={submitReview} disabled={isSubmittingReview || !reviewComment.trim()} className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> {isSubmittingReview ? 'Publishing...' : 'Publish review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!currentUser && <Button variant="outline" onClick={() => handleGuestAction('to leave a review')} className="rounded-xl"><MessageCircle className="mr-2 h-4 w-4" /> Sign in to review</Button>}
        {hasReviewed && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" /> Your review is live. Thanks for helping other learners.</div>}

        {reviews.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No reviews yet. Be the first learner to share feedback.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{review.userName}</p>
                      <p className="text-[11px] text-slate-400">{review.username ? `@${review.username} · ` : ''}{review.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />)}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Module Materials ({course.materials?.length || 0})</h2>
        {(course.materials || []).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-400">
              The teacher hasn't uploaded materials yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-white/5">
              {course.materials.map((material, idx) => {
                const itemContent = (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      {materialIcon(material.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{material.name}</p>
                      <p className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                        <span>{material.type}</span>
                        {!currentUser && <span className="text-amber-500 flex items-center gap-0.5 ml-1"><Lock className="w-3 h-3" /> Locked</span>}
                      </p>
                    </div>
                  </>
                );

                if (!currentUser) {
                  return (
                    <button
                      key={material.id || idx}
                      onClick={() => handleGuestAction('to unlock premium module materials and assignments')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors text-left"
                    >
                      {itemContent}
                    </button>
                  );
                }

                const materialUrl = material.documentId
                  ? `/dashboard/documents/${material.documentId}`
                  : material.url;

                return (
                  <a
                    key={material.id || idx}
                    href={materialUrl}
                    target={material.documentId ? undefined : '_blank'}
                    rel={material.documentId ? undefined : 'noopener noreferrer'}
                    download={material.documentId ? undefined : material.name}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {itemContent}
                  </a>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
