import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { toast } from 'sonner';
import {
  ArrowLeft, BookOpen, Loader2, Video, FileText, Music,
  FileSpreadsheet, Presentation, Image as ImageIcon, File as FileIcon,
  Users, DollarSign, Pencil, Share2
} from 'lucide-react';
import { getCourse, type Course, type CourseMaterial } from '@/services/courseService';
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
  const { currentUser, userRole } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!courseId) return;
      try {
        const data = await getCourse(courseId);
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

  const handleShare = async () => {
    const url = absoluteUrl(`/courses/${courseId}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Course link copied to clipboard');
    } catch {
      toast.info(url);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-400">Loading course...</p>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookOpen className="w-10 h-10 text-slate-300" />
        <p className="font-semibold">Course not found</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const isOwner = currentUser?.uid === course.teacherId;
  const isEnrolled = !!currentUser && course.enrolledStudents?.includes(currentUser.uid);
  const isStudentLike = userRole === 'student' || userRole === 'parent';

  return (
    <div className="space-y-6">
      <SEO
        title={course.title}
        description={course.description?.slice(0, 155) || `Learn ${course.subject} on Liverton Learning with ${course.teacherName}.`}
        path={`/courses/${course.id}`}
        image={course.thumbnail}
        type="article"
      />

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
                {course.description || 'A course on Liverton Learning.'}
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
              {isOwner ? (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={() => navigate(`/teacher/courses/${course.id}`)}
                >
                  <Pencil className="w-4 h-4 mr-1.5" /> Manage Course
                </Button>
              ) : isEnrolled ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 py-1.5 px-3">
                  Enrolled
                </Badge>
              ) : isStudentLike ? (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={() => navigate('/student/courses')}
                >
                  Enroll from Courses
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Course Materials ({course.materials?.length || 0})</h2>
        {(course.materials || []).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-400">
              The teacher hasn't uploaded materials yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-white/5">
              {course.materials.map((material, idx) => (
                <a
                  key={material.id || idx}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    {materialIcon(material.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{material.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{material.type}</p>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
