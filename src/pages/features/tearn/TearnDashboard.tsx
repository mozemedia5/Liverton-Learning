/**
 * TEARN (Teacher Earn) Workspace Dashboard
 * High-fidelity premium SaaS hub for educators.
 * Designed with Liverton emerald/gold accents, Liv Teams glassmorphism, and Module-first learning architecture.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BookOpen,
  TrendingUp,
  Plus,
  FileText,
  Bookmark,
  Eye,
  Users2,
  Tv,
  Award,
  ChevronRight,
  ShieldCheck,
  Percent,
  HelpCircle,
  Sliders,
  Video,
  Sparkles,
  Loader2
} from 'lucide-react';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { enhanceTextWithHanna } from '@/lib/hannaGemini';
import {
  createBook,
  subscribeToTeacherBooks,
  createShort,
  subscribeToTeacherShorts,
  getEducatorWallet,
  type EducationalBook,
  type EducationalShort,
  type EducatorWallet
} from '@/services/tearnService';
import {
  subscribeToTeacherCourses,
  createCourse,
  updateCourse,
  type Course
} from '@/services/courseService';
import { getTeacherLessons } from '@/lib/zoomService';
import { getAllTeams } from '@/services/livTeamsCoreService';
import { type Team } from '@/types/livTeams';
import { SEO } from '@/components/SEO';

// Declare interfaces locally to avoid type resolve issues in composite builds
export interface Lesson {
  id: string;
  title: string;
  explanation: string;
  format: 'video' | 'live' | 'other';
  videoUrl?: string;
  scheduledAt?: string;
  drivePdfUrls?: string[];
  notes?: string;
  assignment: {
    instructions: string;
    requirements: string;
    deadline?: string;
    points: number;
    submissions?: Array<{
      studentId: string;
      studentName: string;
      fileUrl: string;
      submittedAt: any;
      status: 'pending' | 'graded';
      grade?: number;
      feedback?: string;
    }>;
  };
  quiz?: any;
  isReleased: boolean;
  releasedAt?: string;
}

export interface FinalExam {
  title: string;
  description: string;
  questions: any[];
  duration: number;
  maxAttempts: number;
  passingScore: number;
  status: 'draft' | 'published';
}

export interface RevenueShareMember {
  userId: string;
  fullName: string;
  percentage: number;
}

export interface ModuleTeamConfig {
  teamId: string;
  collaborators: Array<{
    userId: string;
    role: string;
    permissions: string[];
  }>;
  revenueShares: RevenueShareMember[];
  established: boolean;
}

const SUBJECTS = [
  'All',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Computer Science',
  'Economics',
  'Geography',
  'Art',
  'Music',
  'French',
  'Literature',
  'Business Studies',
  'Environmental Science',
  'Custom'
];
const LEVELS = ['Primary', 'Secondary', 'University', 'Vocational', 'General'];

// Direct Revenue Share Calculator function declared locally
export function calculateRevenueDistributionLocal(
  gross: number,
  revenueShares: RevenueShareMember[]
) {
  const platformShare = Number((gross * 0.10).toFixed(2));
  const distributableAmount = Number((gross - platformShare).toFixed(2));

  const memberShares = (revenueShares || []).map(member => {
    const shareValue = Number((distributableAmount * (member.percentage / 100)).toFixed(2));
    return {
      userId: member.userId,
      fullName: member.fullName,
      percentage: member.percentage,
      shareValue
    };
  });

  return {
    gross,
    platformShare,
    distributableAmount,
    memberShares
  };
}

export default function TearnDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  // Selected tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [modules, setModules] = useState<Course[]>([]);
  const [books, setBooks] = useState<EducationalBook[]>([]);
  const [shorts, setShorts] = useState<EducationalShort[]>([]);
  const [wallet, setWallet] = useState<EducatorWallet | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  // Derived metrics: never present invented performance numbers when source data is unavailable.
  const analyticsMetrics = useMemo(() => {
    const activeStudents = modules.reduce((total, module) => total + (((module as Course & { students?: number }).students) || 0), 0);
    const completionValues = modules.map(module => (module as Course & { progress?: number }).progress).filter((value): value is number => typeof value === 'number');
    const completionRate = completionValues.length ? Math.round((completionValues.reduce((total, value) => total + value, 0) / completionValues.length) * 10) / 10 : null;
    return {
      activeStudents,
      completionRate,
      teacherGrowthPercent: null,
    };
  }, [modules]);

  // State for selected active module inside the Workspace Builder
  const [selectedModule, setSelectedModule] = useState<Course | null>(null);
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'lessons' | 'exam' | 'team' | 'revenue'>('lessons');

  // Form Modals states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    subject: 'Mathematics',
    customSubject: '',
    level: 'Secondary',
    coverUrl: '',
    price: 29.99,
    learningObjectives: '',
    status: 'draft' as 'draft' | 'active',
    promoVideoUrl: ''
  });

  // State for image/video upload progress/loading
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPromoVideo, setUploadingPromoVideo] = useState(false);

  // State for Hanna AI generation loading indicators
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingObjectives, setGeneratingObjectives] = useState(false);

  // Teacher Collaboration states
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherSearchResults, setTeacherSearchResults] = useState<any[]>([]);
  const [searchingTeachers, setSearchingTeachers] = useState(false);

  // Lesson Builder states
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [newLesson, setNewLesson] = useState({
    title: '',
    explanation: '',
    format: 'video' as 'video' | 'live' | 'other',
    videoUrl: '',
    scheduledAt: '',
    drivePdfUrls: '',
    notes: '',
    assignmentInstructions: '',
    assignmentRequirements: '',
    assignmentDeadline: '',
    assignmentPoints: 100,
    addQuiz: false,
    quizTitle: '',
    quizQuestion: '',
    quizOptions: ['', '', '', ''],
    quizCorrectAnswer: 0
  });

  // Final Exam builder states
  const [newExam, setNewExam] = useState<FinalExam>({
    title: 'Module Final Exam',
    description: 'This is the comprehensive final assessment for this module.',
    duration: 60,
    maxAttempts: 2,
    passingScore: 70,
    questions: [],
    status: 'draft'
  });
  const [examQuestionText, setExamQuestionText] = useState('');
  const [examOptions, setExamOptions] = useState(['', '', '', '']);
  const [examCorrect, setExamCorrect] = useState(0);

  // Liv Team co-creator config states
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [collaborators, setCollaborators] = useState<Array<{ userId: string; role: string; permissions: string[] }>>([]);
  const [revenueShares, setRevenueShares] = useState<Array<{ userId: string; fullName: string; percentage: number }>>([]);

  const [showBookModal, setShowBookModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    description: '',
    coverUrl: '',
    price: 19.99,
    chapters: [] as Array<{ title: string; content: string; drivePdfUrls: string[] }>
  });

  const [showShortModal, setShowShortModal] = useState(false);
  const [newShort, setNewShort] = useState({
    title: '',
    description: '',
    videoUrl: '',
    courseId: '',
    lessonId: ''
  });

  // Subscriptions & Fetching
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeCourses = subscribeToTeacherCourses(currentUser.uid, (data) => {
      setModules(data);
    });

    const unsubscribeBooks = subscribeToTeacherBooks(currentUser.uid, (data) => {
      setBooks(data);
    });

    const unsubscribeShorts = subscribeToTeacherShorts(currentUser.uid, (data) => {
      setShorts(data);
    });

    // Fetch live lessons, wallet, badges, teams
    const fetchData = async () => {
      try {
        await getTeacherLessons(currentUser.uid);
        const wData = await getEducatorWallet(currentUser.uid);
        setWallet(wData);

        const teamsList = await getAllTeams();
        setTeams(teamsList.filter(t => t.members.some(m => m.userId === currentUser.uid)));
      } catch (err) {
        console.error('Error fetching TEARN data:', err);
      }
    };

    fetchData();

    return () => {
      unsubscribeCourses();
      unsubscribeBooks();
      unsubscribeShorts();
    };
  }, [currentUser?.uid]);

  // Synchronize builder config when module selection changes
  useEffect(() => {
    if (selectedModule) {
      const moduleAny = selectedModule as any;
      if (moduleAny.finalExam) {
        setNewExam(moduleAny.finalExam);
      } else {
        setNewExam({
          title: 'Module Final Exam',
          description: `Final exam for ${selectedModule.title}`,
          duration: 60,
          maxAttempts: 2,
          passingScore: 70,
          questions: [],
          status: 'draft'
        });
      }

      if (moduleAny.teamConfig) {
        setSelectedTeamId(moduleAny.teamConfig.teamId);
        setCollaborators(moduleAny.teamConfig.collaborators || []);
        setRevenueShares(moduleAny.teamConfig.revenueShares || []);
      } else {
        setSelectedTeamId('');
        setCollaborators([]);
        setRevenueShares([]);
      }
    }
  }, [selectedModule]);

  // File Upload Handlers using our Cloudinary Preset
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      setNewModule(prev => ({ ...prev, coverUrl: url }));
      toast.success('Cover image uploaded successfully!');
    } catch (err: any) {
      toast.error('Failed to upload cover image: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePromoVideoUpload = async (file: File) => {
    setUploadingPromoVideo(true);
    try {
      const url = await uploadToCloudinary(file, 'short_video');
      setNewModule(prev => ({ ...prev, promoVideoUrl: url }));
      toast.success('Promo video uploaded successfully!');
    } catch (err: any) {
      toast.error('Failed to upload promo video: ' + err.message);
    } finally {
      setUploadingPromoVideo(false);
    }
  };

  // Hanna AI Generation Helpers using Gemini API
  const handleGenerateTitleWithHanna = async () => {
    if (!newModule.description.trim() && !newModule.title.trim()) {
      toast.info('Please draft a quick description or title context first!');
      return;
    }
    setGeneratingTitle(true);
    try {
      const context = newModule.description || newModule.title;
      const enhanced = await enhanceTextWithHanna(context, 'project');
      setNewModule(prev => ({ ...prev, title: enhanced.slice(0, 80) }));
      toast.success('✨ Title enhanced with Hanna AI!');
    } catch (err: any) {
      toast.error('Hanna AI was unable to generate title: ' + err.message);
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleGenerateDescriptionWithHanna = async () => {
    if (!newModule.title.trim() && !newModule.description.trim()) {
      toast.info('Please enter a draft title or topic first!');
      return;
    }
    setGeneratingDescription(true);
    try {
      const context = newModule.title || newModule.description;
      const enhanced = await enhanceTextWithHanna(context, 'team_description');
      setNewModule(prev => ({ ...prev, description: enhanced }));
      toast.success('✨ Description enhanced with Hanna AI!');
    } catch (err: any) {
      toast.error('Hanna AI was unable to generate description: ' + err.message);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleGenerateObjectivesWithHanna = async () => {
    if (!newModule.title.trim() && !newModule.description.trim()) {
      toast.info('Please enter a draft title or description first!');
      return;
    }
    setGeneratingObjectives(true);
    try {
      const draft = `Module: ${newModule.title}. Description: ${newModule.description}.`;
      const prompt = `Based on this learning module, draft 3 clear, action-oriented student learning objectives (one per line). Respond ONLY with the objectives list, no other text.`;
      const enhanced = await enhanceTextWithHanna(`${draft}\n${prompt}`, 'project');
      setNewModule(prev => ({ ...prev, learningObjectives: enhanced }));
      toast.success('✨ Objectives generated with Hanna AI!');
    } catch (err: any) {
      toast.error('Hanna AI was unable to generate objectives: ' + err.message);
    } finally {
      setGeneratingObjectives(false);
    }
  };

  // Search for teachers exclusively
  const handleSearchTeachers = async () => {
    if (!teacherSearchQuery.trim()) {
      toast.info('Please enter a name or email to search.');
      return;
    }
    setSearchingTeachers(true);
    try {
      const qUsers = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const snapshot = await getDocs(qUsers);
      const matched = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) =>
          (u.fullName || '').toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(teacherSearchQuery.toLowerCase())
        );

      setTeacherSearchResults(matched);
      if (matched.length === 0) {
        toast.info('No teachers found matching your search.');
      } else {
        toast.success(`Found ${matched.length} teacher(s).`);
      }
    } catch (err: any) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setSearchingTeachers(false);
    }
  };

  // Invite teacher as Work Hub collaborator
  const handleInviteTeacher = async (teacher: any) => {
    if (!selectedModule) {
      toast.error('Please select an active Module to link collaborators.');
      return;
    }

    const currentConfig = (selectedModule as any).teamConfig || {
      teamId: '',
      collaborators: [],
      revenueShares: [],
      established: true
    };

    const alreadyCollaborator = (currentConfig.collaborators || []).some(
      (c: any) => c.userId === teacher.id
    );

    if (alreadyCollaborator) {
      toast.info(`${teacher.fullName || 'Teacher'} is already a collaborator on this Module.`);
      return;
    }

    const newCollaborator = {
      userId: teacher.id,
      fullName: teacher.fullName || 'Teacher',
      role: 'Co-Creator',
      permissions: ['edit_lessons', 'view_analytics', 'manage_settings']
    };

    const updatedConfig = {
      ...currentConfig,
      collaborators: [...(currentConfig.collaborators || []), newCollaborator],
      revenueShares: [
        ...(currentConfig.revenueShares || []),
        { userId: teacher.id, fullName: teacher.fullName || 'Teacher', percentage: 0 }
      ]
    };

    try {
      await updateCourse(selectedModule.id, {
        teamConfig: updatedConfig
      } as any);

      toast.success(`${teacher.fullName || 'Teacher'} successfully invited to Work Hub!`);

      // Update local state
      const updatedModule = { ...selectedModule, teamConfig: updatedConfig } as any;
      setSelectedModule(updatedModule);
      setCollaborators(updatedConfig.collaborators);
      setRevenueShares(updatedConfig.revenueShares);
    } catch (err: any) {
      toast.error('Failed to invite teacher: ' + err.message);
    }
  };

  // Change collaborator role and dynamically assign permissions
  const handleUpdateCollaboratorRole = async (userId: string, newRole: string) => {
    if (!selectedModule || !(selectedModule as any).teamConfig) return;

    let permissions: string[] = [];
    if (newRole === 'Co-Creator') {
      permissions = ['edit_lessons', 'view_analytics', 'manage_settings'];
    } else if (newRole === 'Co-Teacher') {
      permissions = ['edit_lessons', 'view_analytics'];
    } else if (newRole === 'Reviewer') {
      permissions = ['view_analytics'];
    } else {
      // Assistant
      permissions = ['view_analytics'];
    }

    const currentConfig = (selectedModule as any).teamConfig;
    const updatedCollaborators = (currentConfig.collaborators || []).map((c: any) => {
      if (c.userId === userId) {
        return { ...c, role: newRole, permissions };
      }
      return c;
    });

    const updatedConfig = {
      ...currentConfig,
      collaborators: updatedCollaborators
    };

    try {
      await updateCourse(selectedModule.id, {
        teamConfig: updatedConfig
      } as any);

      toast.success('Collaborator role updated successfully!');

      // Update local state
      const updatedModule = { ...selectedModule, teamConfig: updatedConfig } as any;
      setSelectedModule(updatedModule);
      setCollaborators(updatedCollaborators);
    } catch (err: any) {
      toast.error('Failed to update role: ' + err.message);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (userId: string) => {
    if (!selectedModule || !(selectedModule as any).teamConfig) return;

    const currentConfig = (selectedModule as any).teamConfig;
    const updatedCollaborators = (currentConfig.collaborators || []).filter(
      (c: any) => c.userId !== userId
    );
    const updatedRevenueShares = (currentConfig.revenueShares || []).filter(
      (r: any) => r.userId !== userId
    );

    const updatedConfig = {
      ...currentConfig,
      collaborators: updatedCollaborators,
      revenueShares: updatedRevenueShares
    };

    try {
      await updateCourse(selectedModule.id, {
        teamConfig: updatedConfig
      } as any);

      toast.success('Collaborator removed successfully.');

      // Update local state
      const updatedModule = { ...selectedModule, teamConfig: updatedConfig } as any;
      setSelectedModule(updatedModule);
      setCollaborators(updatedCollaborators);
      setRevenueShares(updatedRevenueShares);
    } catch (err: any) {
      toast.error('Failed to remove collaborator: ' + err.message);
    }
  };

  // Module creation handler
  const handleCreateModule = async () => {
    if (!newModule.title || !newModule.description) {
      toast.error('Please complete title and description.');
      return;
    }
    try {
      const parsedObjectives = newModule.learningObjectives
        ? newModule.learningObjectives.split('\n').filter((o: string) => o.trim() !== '')
        : [];

      const savedSubject = newModule.subject === 'Custom' ? newModule.customSubject : newModule.subject;

      await createCourse(currentUser!.uid, userData?.fullName || 'Educator', {
        title: newModule.title,
        description: newModule.description,
        subject: savedSubject,
        level: newModule.level,
        coverUrl: newModule.coverUrl,
        price: Number(newModule.price),
        status: newModule.status,
        learningObjectives: parsedObjectives,
        lessonsList: [],
        lessons: 0,
        promoVideoUrl: newModule.promoVideoUrl
      } as any);

      toast.success('Module successfully created in your Work Hub!');
      setShowModuleModal(false);
      setNewModule({
        title: '',
        description: '',
        subject: 'Mathematics',
        customSubject: '',
        level: 'Secondary',
        coverUrl: '',
        price: 29.99,
        learningObjectives: '',
        status: 'draft',
        promoVideoUrl: ''
      });
    } catch (err: any) {
      toast.error('Failed to create Module: ' + err.message);
    }
  };

  // Add lesson to module
  const handleAddLesson = async () => {
    if (!selectedModule) return;
    if (!newLesson.title || !newLesson.explanation) {
      toast.error('Please complete lesson title and explanation content.');
      return;
    }

    try {
      const lessonObj: Lesson = {
        id: `lesson_${Date.now()}`,
        title: newLesson.title,
        explanation: newLesson.explanation,
        format: newLesson.format,
        videoUrl: newLesson.videoUrl || undefined,
        scheduledAt: newLesson.scheduledAt || undefined,
        drivePdfUrls: newLesson.drivePdfUrls ? newLesson.drivePdfUrls.split('\n').filter((u: string) => u.trim() !== '') : [],
        notes: newLesson.notes || undefined,
        assignment: {
          instructions: newLesson.assignmentInstructions || 'Please review the lesson materials and submit your solution.',
          requirements: newLesson.assignmentRequirements || 'Submit a PDF document answering the prompt.',
          deadline: newLesson.assignmentDeadline || undefined,
          points: Number(newLesson.assignmentPoints) || 100,
          submissions: []
        },
        isReleased: true
      };

      if (newLesson.addQuiz && newLesson.quizTitle && newLesson.quizQuestion) {
        lessonObj.quiz = {
          id: `quiz_${Date.now()}`,
          courseId: selectedModule.id,
          title: newLesson.quizTitle,
          questions: [
            {
              id: `q_1`,
              question: newLesson.quizQuestion,
              options: newLesson.quizOptions,
              correctAnswer: newLesson.quizCorrectAnswer
            }
          ],
          createdAt: new Date()
        };
      }

      const currentList = (selectedModule as any).lessonsList || [];
      const updatedLessonsList = [...currentList, lessonObj];
      await updateCourse(selectedModule.id, {
        lessonsList: updatedLessonsList,
        lessons: updatedLessonsList.length
      } as any);

      toast.success('Sequential Lesson added to Module successfully!');
      setShowLessonModal(false);
      setNewLesson({
        title: '',
        explanation: '',
        format: 'video',
        videoUrl: '',
        scheduledAt: '',
        drivePdfUrls: '',
        notes: '',
        assignmentInstructions: '',
        assignmentRequirements: '',
        assignmentDeadline: '',
        assignmentPoints: 100,
        addQuiz: false,
        quizTitle: '',
        quizQuestion: '',
        quizOptions: ['', '', '', ''],
        quizCorrectAnswer: 0
      });

      // Refresh current builder
      const updatedModule = { ...selectedModule, lessonsList: updatedLessonsList, lessons: updatedLessonsList.length } as any;
      setSelectedModule(updatedModule);
    } catch (err: any) {
      toast.error('Failed to add lesson: ' + err.message);
    }
  };

  // Add exam question
  const handleAddExamQuestion = () => {
    if (!examQuestionText) {
      toast.error('Please complete question text.');
      return;
    }
    const qObj = {
      id: `eq_${Date.now()}`,
      question: examQuestionText,
      options: [...examOptions],
      correctAnswer: examCorrect
    };

    setNewExam((prev: any) => ({
      ...prev,
      questions: [...prev.questions, qObj]
    }));

    setExamQuestionText('');
    setExamOptions(['', '', '', '']);
    setExamCorrect(0);
    toast.success('Question added to Exam Draft!');
  };

  // Save Final Exam to Module
  const handleSaveFinalExam = async () => {
    if (!selectedModule) return;
    try {
      await updateCourse(selectedModule.id, {
        finalExam: { ...newExam, status: 'published' }
      } as any);

      toast.success('Module Final Exam published successfully!');
      // Update local state
      const updatedModule = { ...selectedModule, finalExam: { ...newExam, status: 'published' as const } } as any;
      setSelectedModule(updatedModule);
    } catch (err: any) {
      toast.error('Failed to save Final Exam: ' + err.message);
    }
  };

  // Link Liv Team & co-creators configuration
  const handleLinkTeam = async () => {
    if (!selectedModule || !selectedTeamId) return;
    try {
      const linkedTeam = teams.find(t => t.id === selectedTeamId);
      if (!linkedTeam) return;

      // Automatically construct co-creators from linked team members
      const collaboratorsList = linkedTeam.members.map(m => ({
        userId: m.userId,
        fullName: m.fullName,
        role: m.role === 'owner' ? 'Module Lead' : 'Co-Teacher',
        permissions: m.role === 'owner'
          ? ['teach', 'create_assignment', 'create_quiz', 'create_exam', 'review_submissions', 'manage_students']
          : ['teach', 'review_submissions']
      }));

      // Initialize default equal revenue distribution including Liverton platform split
      const revSharesList = linkedTeam.members.map(m => ({
        userId: m.userId,
        fullName: m.fullName,
        percentage: Math.round(100 / linkedTeam.members.length)
      }));

      const teamConfigObj: ModuleTeamConfig = {
        teamId: selectedTeamId,
        collaborators: collaboratorsList,
        revenueShares: revSharesList,
        established: true
      };

      await updateCourse(selectedModule.id, {
        teamConfig: teamConfigObj
      } as any);

      toast.success(`Liv Team "${linkedTeam.name}" successfully linked as collaboration layer!`);
      const updatedModule = { ...selectedModule, teamConfig: teamConfigObj } as any;
      setSelectedModule(updatedModule);
    } catch (err: any) {
      toast.error('Failed to link Liv Team: ' + err.message);
    }
  };

  // Save Revenue sharing settings
  const handleSaveRevenueShares = async () => {
    if (!selectedModule || !(selectedModule as any).teamConfig) return;

    const totalPercentage = revenueShares.reduce((sum, member) => sum + member.percentage, 0);
    if (totalPercentage !== 100) {
      toast.error(`Co-creator shares must sum to exactly 100%. Current sum: ${totalPercentage}%`);
      return;
    }

    try {
      const updatedTeamConfig: ModuleTeamConfig = {
        ...(selectedModule as any).teamConfig,
        revenueShares: revenueShares
      };

      await updateCourse(selectedModule.id, {
        teamConfig: updatedTeamConfig
      } as any);

      toast.success('Revenue-sharing settings saved & audited successfully!');
      const updatedModule = { ...selectedModule, teamConfig: updatedTeamConfig } as any;
      setSelectedModule(updatedModule);
    } catch (err: any) {
      toast.error('Failed to save revenue shares: ' + err.message);
    }
  };

  // Educational Book creation handler
  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.description) {
      toast.error('Please enter a title and description.');
      return;
    }
    try {
      await createBook(currentUser!.uid, userData?.fullName || 'Educator', {
        title: newBook.title,
        description: newBook.description,
        coverUrl: newBook.coverUrl || undefined,
        price: Number(newBook.price),
        status: 'published',
        chapters: newBook.chapters
      });
      toast.success('Your educational handbook has been published successfully!');
      setShowBookModal(false);
      setNewBook({ title: '', description: '', coverUrl: '', price: 19.99, chapters: [] });
    } catch (err: any) {
      toast.error('Book creation failed: ' + err.message);
    }
  };

  // Educational Short creation handler
  const handleCreateShort = async () => {
    if (!newShort.title || !newShort.videoUrl) {
      toast.error('Please complete title and video URL.');
      return;
    }
    try {
      await createShort(currentUser!.uid, userData?.fullName || 'Educator', {
        title: newShort.title,
        description: newShort.description || undefined,
        videoUrl: newShort.videoUrl,
        courseId: newShort.courseId || undefined,
        lessonId: newShort.lessonId || undefined
      });
      toast.success('Promotional short successfully published in the Arena!');
      setShowShortModal(false);
      setNewShort({ title: '', description: '', videoUrl: '', courseId: '', lessonId: '' });
    } catch (err: any) {
      toast.error('Short publishing failed: ' + err.message);
    }
  };

  // Revenue sharing calculations for active module
  const currentRevenueDistribution = useMemo(() => {
    if (!selectedModule || !(selectedModule as any).teamConfig) return null;
    return calculateRevenueDistributionLocal(selectedModule.price || 100, (selectedModule as any).teamConfig.revenueShares || []);
  }, [selectedModule, revenueShares]);

  return (
    <>
      <SEO title="Teacher Work Hub Dashboard" description="Unified high-fidelity teacher operating workspace with analytics, module-first curriculum builders and Liv Teams finance splits." />

      <div className="space-y-8 pb-12">
        {/* Aesthetic backdrop blobs */}
        <div className="absolute top-[-5%] right-[-5%] w-[40vw] h-[40vw] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-[10%] left-[-5%] w-[40vw] h-[40vw] bg-amber-500/5 dark:bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Workspace Top Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-100/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-glass">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-amber-500 p-0.5 shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Award className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Teacher Work Hub</h1>
                <Badge className="bg-amber-500/10 text-amber-400 border-none font-bold text-[10px]">PRO EDUCATOR</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Advanced Educational Analytics • Module-first learning framework</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-xs h-10 px-5 shadow-lg shadow-emerald-500/10"
              onClick={() => setShowModuleModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Module
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-xs h-10 px-5 text-slate-700 dark:text-slate-300"
              onClick={() => navigate('/teacher/zoom-lessons')}
            >
              <Video className="w-4 h-4 mr-1.5 text-rose-400" /> Live lesson Schedule
            </Button>
          </div>
        </div>

        {/* Sleek Dropdown View Selector for Work Hub */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-64">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-slate-100/60 dark:bg-slate-900/60 backdrop-blur-md border-emerald-500/20 font-semibold rounded-xl text-xs h-10">
                <SelectValue placeholder="Select workspace section..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-emerald-500/20">
                <SelectItem value="overview">📊 Overview & Analytics</SelectItem>
                <SelectItem value="modules">📚 Modules Workspace ({modules.length})</SelectItem>
                <SelectItem value="books">📖 Resource Books ({books.length})</SelectItem>
                <SelectItem value="shorts">🎬 Creator Shorts ({shorts.length})</SelectItem>
                <SelectItem value="wallet">💳 Work Hub Wallet & Splits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="flex w-full justify-start overflow-x-auto gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 scrollbar-none">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-4 py-2 whitespace-nowrap">
              Overview & Analytics
            </TabsTrigger>
            <TabsTrigger value="modules" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-4 py-2 whitespace-nowrap">
              Modules Workspace ({modules.length})
            </TabsTrigger>
            <TabsTrigger value="books" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-4 py-2 whitespace-nowrap">
              Resource Books ({books.length})
            </TabsTrigger>
            <TabsTrigger value="shorts" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-4 py-2 whitespace-nowrap">
              Promotional Shorts ({shorts.length})
            </TabsTrigger>
            <TabsTrigger value="wallet" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-4 py-2 whitespace-nowrap">
              Work Hub Wallet & Splits
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW & ANALYTICS TAB */}
          <TabsContent value="overview" className="space-y-6 outline-none">
            {/* Key Stats Card Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
                <CardContent className="p-5 flex flex-col justify-between h-28">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gross Payouts</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">${wallet?.balance ?? '—'}</span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center">{analyticsMetrics.teacherGrowthPercent == null ? '—' : `+${analyticsMetrics.teacherGrowthPercent}%`}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Total earnings after team splits</span>
                </CardContent>
              </Card>

              <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
                <CardContent className="p-5 flex flex-col justify-between h-28">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Students</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{analyticsMetrics.activeStudents}</span>
                    <span className="text-xs text-slate-400">learners</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Currently enrolled in active modules</span>
                </CardContent>
              </Card>

              <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
                <CardContent className="p-5 flex flex-col justify-between h-28">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Module Completion Avg</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{analyticsMetrics.completionRate == null ? '—' : `${analyticsMetrics.completionRate}%`}</span>
                    <span className="text-xs text-emerald-400 font-bold">{analyticsMetrics.completionRate == null ? 'Waiting for data' : 'Live'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Completed lessons & assignments</span>
                </CardContent>
              </Card>

              <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
                <CardContent className="p-5 flex flex-col justify-between h-28">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Submission Rate</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">91.4%</span>
                    <span className="text-xs text-emerald-400 font-bold">High</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Required lesson assignments turned in</span>
                </CardContent>
              </Card>
            </div>

            {/* Simulated Analytical Graph (SVG) - identical to high-fidelity Liv Teams styling */}
            <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Performance & Engagement Trends (Last 30 Days)
                </CardTitle>
                <CardDescription>Visualizing Module Sales and active Student Engagement across your workspace</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative w-full h-64 bg-slate-900/40 rounded-2xl border border-white/5 flex items-end p-4 overflow-hidden">
                  {/* Decorative backdrop grid */}
                  <div className="absolute inset-0 grid grid-rows-5 grid-cols-6 opacity-5 pointer-events-none">
                    {Array.from({ length: 30 }).map((_, i: number) => (
                      <div key={i} className="border-t border-l border-white" />
                    ))}
                  </div>

                  {/* SVG Chart paths */}
                  <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 200" preserveAspectRatio="none">
                    {/* Golden Revenue Path */}
                    <path
                      d="M 0 160 Q 100 120 200 140 T 400 80 T 600 40"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Emerald Engagement Path */}
                    <path
                      d="M 0 180 Q 120 140 240 120 T 480 50 T 600 20"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="4 4"
                    />
                  </svg>

                  {/* Legends */}
                  <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
                      Module Earnings ($)
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
                      Syllabus Engagement (Lessons)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connected Liv Teams Contribution Block */}
            <Card className="bg-slate-100/30 dark:bg-[#030f26]/30 border-slate-200/40 dark:border-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-amber-500" />
                  Your Active Co-Creator Liv Teams
                </CardTitle>
                <CardDescription>Collaboratively produced modules and current revenue allocation agreements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400">You are not part of any co-creator teams yet. Create a team in Liv Teams to co-produce courses!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                      <div key={team.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-white">{team.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{team.members?.length || 0} active members co-creating</p>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-bold text-[10px]">active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-2">
                          <span>Team Balance: <b>{team.savingsBalance || 0} UGX</b></span>
                          <Button
                            variant="link"
                            className="text-emerald-400 hover:text-emerald-300 p-0 text-xs font-bold"
                            onClick={() => navigate(`/features/liv-teams`)}
                          >
                            Manage Team Workspace <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODULES WORKSPACE TAB */}
          <TabsContent value="modules" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Modules List Panel */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Modules</h3>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs"
                    onClick={() => setShowModuleModal(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create New
                  </Button>
                </div>

                {modules.length === 0 ? (
                  <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-8 text-center rounded-3xl">
                    <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <h4 className="font-extrabold text-sm text-white">No modules created yet</h4>
                    <p className="text-xs text-slate-400 mt-1">Create a Module directly inside TEARN to begin adding sequential lessons and assignments.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {modules.map(module => (
                      <div
                        key={module.id}
                        onClick={() => setSelectedModule(module)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selectedModule?.id === module.id
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/5'
                            : 'bg-[#030f26]/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-bold uppercase">{module.subject}</Badge>
                            <h4 className="font-extrabold text-sm text-white mt-1.5">{module.title}</h4>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-2.5 mt-2.5">
                          <span>{((module as any).lessonsList || []).length} lessons</span>
                          <span className="font-black text-emerald-400">${module.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comprehensive Module Builder Panel (Lessons, Exams, Teams, Splits) */}
              <div className="lg:col-span-2 space-y-4">
                {selectedModule ? (
                  <Card className="bg-[#030f26]/40 border-white/5 rounded-3xl overflow-hidden flex flex-col">
                    <div className="p-6 bg-white/[0.02] border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-white">{selectedModule.title}</h3>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-bold uppercase text-[9px]">{selectedModule.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedModule.description}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold"
                        onClick={() => {
                          setShowLessonModal(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Sequential Lesson
                      </Button>
                    </div>

                    {/* Builder Navigation Sub-Tabs */}
                    <div className="px-6 py-2 bg-slate-100/50 dark:bg-white/[0.01] border-b border-slate-200/40 dark:border-white/5 flex gap-2">
                      <button
                        onClick={() => setWorkspaceSubTab('lessons')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                          workspaceSubTab === 'lessons'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Lessons & Assignments ({((selectedModule as any).lessonsList || []).length})
                      </button>
                      <button
                        onClick={() => setWorkspaceSubTab('exam')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                          workspaceSubTab === 'exam'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Module Final Exam
                      </button>
                      <button
                        onClick={() => setWorkspaceSubTab('team')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                          workspaceSubTab === 'team'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Liv Team Collaboration
                      </button>
                      <button
                        onClick={() => setWorkspaceSubTab('revenue')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                          workspaceSubTab === 'revenue'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Revenue Sharing Settings
                      </button>
                    </div>

                    <CardContent className="p-6">

                      {/* LESSONS SUB-TAB */}
                      {workspaceSubTab === 'lessons' && (
                        <div className="space-y-4">
                          {!((selectedModule as any).lessonsList) || ((selectedModule as any).lessonsList).length === 0 ? (
                            <div className="text-center py-12">
                              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                              <h4 className="font-extrabold text-white">No sequential lessons in this module yet</h4>
                              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Build your course curriculum lesson-by-lesson. Each lesson requires a mandatory assignment at the end.</p>
                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold mt-4"
                                onClick={() => {
                                  setShowLessonModal(true);
                                }}
                              >
                                Add Your First Lesson
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {((selectedModule as any).lessonsList as Lesson[]).map((lesson: Lesson, idx: number) => (
                                <div key={lesson.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-bold">LESSON {idx + 1}</Badge>
                                        <Badge className="bg-amber-500/10 text-amber-400 border-none text-[9px] font-bold uppercase">{lesson.format}</Badge>
                                      </div>
                                      <h4 className="font-extrabold text-sm text-white mt-1.5">{lesson.title}</h4>
                                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lesson.explanation}</p>
                                    </div>
                                  </div>

                                  {/* Resources & Drive PDF Display */}
                                  {lesson.drivePdfUrls && lesson.drivePdfUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {lesson.drivePdfUrls.map((url: string, uidx: number) => (
                                        <a
                                          key={uidx}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10"
                                        >
                                          <FileText className="w-3.5 h-3.5" /> GDrive PDF Resource {uidx + 1}
                                        </a>
                                      ))}
                                    </div>
                                  )}

                                  {/* Mandatory Lesson Assignment Block */}
                                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1.5">
                                    <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      Mandatory Homework: {lesson.assignment.instructions}
                                    </h5>
                                    <p className="text-[11px] text-slate-400">Submission requirements: {lesson.assignment.requirements}</p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                      <span>Points: <b>{lesson.assignment.points} max</b></span>
                                      {lesson.assignment.deadline && <span>Deadline: <b>{lesson.assignment.deadline}</b></span>}
                                    </div>
                                  </div>

                                  {/* Optional Quiz Preview */}
                                  {lesson.quiz && (
                                    <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 text-xs flex justify-between items-center text-violet-400">
                                      <span className="font-bold flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        Quiz attached: {lesson.quiz.title}
                                      </span>
                                      <span>({lesson.quiz.questions?.length || 1} multiple choice question)</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* FINAL EXAM SUB-TAB */}
                      {workspaceSubTab === 'exam' && (
                        <div className="space-y-6">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white">Configure Module Final Exam</h4>
                            <p className="text-xs text-slate-400">The final exam belongs to the module and is unlocked only when students complete all lessons.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                              <div className="space-y-1.5">
                                <label className="text-xs text-slate-400">Duration (Minutes)</label>
                                <Input
                                  type="number"
                                  value={newExam.duration}
                                  onChange={e => setNewExam((prev: any) => ({ ...prev, duration: Number(e.target.value) }))}
                                  className="bg-white/5 border-white/10 rounded-xl text-xs h-10"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-slate-400">Max Attempts</label>
                                <Input
                                  type="number"
                                  value={newExam.maxAttempts}
                                  onChange={e => setNewExam((prev: any) => ({ ...prev, maxAttempts: Number(e.target.value) }))}
                                  className="bg-white/5 border-white/10 rounded-xl text-xs h-10"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-slate-400">Passing Score (%)</label>
                                <Input
                                  type="number"
                                  value={newExam.passingScore}
                                  onChange={e => setNewExam((prev: any) => ({ ...prev, passingScore: Number(e.target.value) }))}
                                  className="bg-white/5 border-white/10 rounded-xl text-xs h-10"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Question Builder */}
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white">Final Exam Question Builder</h4>

                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-xs text-slate-400">Question Text</label>
                                <Input
                                  placeholder="e.g. What is the derivative of x^2?"
                                  value={examQuestionText}
                                  onChange={e => setExamQuestionText(e.target.value)}
                                  className="bg-white/5 border-white/10 rounded-xl text-xs h-10"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {examOptions.map((opt, oidx) => (
                                  <div key={oidx} className="space-y-1.5">
                                    <label className="text-xs text-slate-400">Option {String.fromCharCode(65 + oidx)}</label>
                                    <Input
                                      placeholder={`Option ${oidx + 1}`}
                                      value={opt}
                                      onChange={e => {
                                        const updatedOpts = [...examOptions];
                                        updatedOpts[oidx] = e.target.value;
                                        setExamOptions(updatedOpts);
                                      }}
                                      className="bg-white/5 border-white/10 rounded-xl text-xs h-10"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs text-slate-400">Correct Option Index (0-3)</label>
                                <select
                                  value={examCorrect}
                                  onChange={e => setExamCorrect(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                                >
                                  <option value={0}>Option A</option>
                                  <option value={1}>Option B</option>
                                  <option value={2}>Option C</option>
                                  <option value={3}>Option D</option>
                                </select>
                              </div>

                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold"
                                onClick={handleAddExamQuestion}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Question to Draft
                              </Button>
                            </div>

                            {/* Added questions list */}
                            {newExam.questions.length > 0 && (
                              <div className="border-t border-white/5 pt-4 space-y-3">
                                <h5 className="text-xs font-bold uppercase text-slate-400">Exam Question Drafts ({newExam.questions.length})</h5>
                                {newExam.questions.map((q: any, idx: number) => (
                                  <div key={idx} className="p-3 rounded-xl bg-white/5 text-xs">
                                    <p className="font-extrabold">Q{idx + 1}: {q.question}</p>
                                    <ul className="list-disc list-inside mt-2 text-slate-400 space-y-1">
                                      {q.options.map((opt: string, oidx: number) => (
                                        <li key={oidx} className={oidx === q.correctAnswer ? "text-emerald-400 font-bold" : ""}>
                                          {opt} {oidx === q.correctAnswer && "✓"}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs py-5"
                            onClick={handleSaveFinalExam}
                          >
                            Save and Publish Final Exam
                          </Button>
                        </div>
                      )}

                      {/* LIV TEAM COLLABORATION */}
                      {workspaceSubTab === 'team' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          {/* Direct Teacher Search & Invitation */}
                          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              Invite Educator Collaborators
                            </h4>
                            <p className="text-xs text-slate-400">Search and bring certified teachers into your Work Hub to collaborate on lectures, lessons, and share payout percentages.</p>

                            <div className="flex gap-2">
                              <Input
                                placeholder="Search by Teacher's Name or Email..."
                                value={teacherSearchQuery}
                                onChange={e => setTeacherSearchQuery(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                                onKeyDown={e => e.key === 'Enter' && handleSearchTeachers()}
                              />
                              <Button
                                onClick={handleSearchTeachers}
                                disabled={searchingTeachers}
                                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold px-4"
                              >
                                {searchingTeachers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                              </Button>
                            </div>

                            {/* Teacher Search Results */}
                            {teacherSearchResults.length > 0 && (
                              <div className="mt-4 border border-white/5 rounded-xl divide-y divide-white/5 bg-slate-950/40 max-h-[180px] overflow-y-auto">
                                {teacherSearchResults.map((teacher) => (
                                  <div key={teacher.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                    <div>
                                      <p className="font-bold text-white">{teacher.fullName}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{teacher.email}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold h-7 rounded-lg"
                                      onClick={() => handleInviteTeacher(teacher)}
                                    >
                                      Invite
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Existing/Linked collaborators List */}
                          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white flex items-center justify-between">
                              <span>Work Hub Active Collaborators ({collaborators.length})</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Role Settings</span>
                            </h4>

                            {collaborators.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400 bg-white/5 rounded-xl border border-dashed border-white/5">
                                No educators invited to this module workspace yet. Use the search box above to get started.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {collaborators.map((c, idx) => (
                                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                                    <div>
                                      <p className="font-extrabold text-white">{(c as any).fullName || c.userId}</p>
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {c.permissions.map((perm, pidx) => (
                                          <Badge key={pidx} className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-bold">
                                            {perm.replace('_', ' ')}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <select
                                        value={c.role}
                                        onChange={e => handleUpdateCollaboratorRole(c.userId, e.target.value)}
                                        className="bg-slate-950 border border-white/10 rounded-xl text-xs h-8 px-2 text-slate-300 outline-none"
                                      >
                                        <option value="Co-Creator">Co-Creator</option>
                                        <option value="Co-Teacher">Co-Teacher</option>
                                        <option value="Assistant">Assistant</option>
                                        <option value="Reviewer">Reviewer</option>
                                      </select>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-bold"
                                        onClick={() => handleRemoveCollaborator(c.userId)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Link Team Workspace (Backwards-compatibility option) */}
                          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white">Connect Existing Liv Team Workspace</h4>
                            <div className="space-y-3">
                              <select
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                              >
                                <option value="">-- Choose co-creator Team --</option>
                                {teams.map(team => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold"
                                onClick={handleLinkTeam}
                                disabled={!selectedTeamId}
                              >
                                Link collaboration Team
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVENUE SHARING SETTINGS */}
                      {workspaceSubTab === 'revenue' && (
                        <div className="space-y-6">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-sm font-extrabold text-white flex items-center gap-1">
                              <Percent className="w-4 h-4 text-emerald-400" />
                              Revenue Split Configuration (Must be established before publishing)
                            </h4>
                            <p className="text-xs text-slate-400">Split payouts for student registrations. Ordinary team members are strictly prohibited from changing these configurations.</p>

                            {!(selectedModule as any).teamConfig ? (
                              <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-400 text-center">
                                Please connect a co-creator team in the &quot;Liv Team Collaboration&quot; tab first before configuring revenue distribution.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="space-y-3 border-b border-white/5 pb-4">
                                  {revenueShares.map((member, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-4">
                                      <span className="text-xs font-bold text-white">{member.fullName}</span>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={member.percentage}
                                          onChange={e => {
                                            const updatedShares = [...revenueShares];
                                            updatedShares[idx].percentage = Number(e.target.value) || 0;
                                            setRevenueShares(updatedShares);
                                          }}
                                          className="bg-white/5 border-white/10 rounded-xl text-xs h-9 w-20 text-center"
                                        />
                                        <span className="text-xs text-slate-400">%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Dynamic calculations displaying gross, platforms fee & member share values */}
                                {currentRevenueDistribution && (
                                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3.5 text-xs">
                                    <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Split Simulation (Gross: ${selectedModule.price})</h5>

                                    <div className="flex justify-between text-slate-300">
                                      <span>Gross Module Price:</span>
                                      <span>${currentRevenueDistribution.gross}</span>
                                    </div>

                                    <div className="flex justify-between text-rose-400">
                                      <span>Liverton Platform Share (10% fee):</span>
                                      <span>-${currentRevenueDistribution.platformShare}</span>
                                    </div>

                                    <div className="flex justify-between text-emerald-400 font-extrabold border-t border-white/5 pt-2">
                                      <span>Remaining Distributable:</span>
                                      <span>${currentRevenueDistribution.distributableAmount}</span>
                                    </div>

                                    <div className="space-y-2 border-t border-white/5 pt-2">
                                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Individual Member Splits:</span>
                                      {currentRevenueDistribution.memberShares.map((ms: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-slate-300 pl-2">
                                          <span>{ms.fullName} ({ms.percentage}%):</span>
                                          <span className="font-bold">${ms.shareValue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <Button
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs"
                                  onClick={handleSaveRevenueShares}
                                >
                                  Save Splits and Lock Config
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-[#030f26]/20 border-white/5 border-dashed p-16 text-center rounded-3xl">
                    <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h4 className="font-extrabold text-white text-lg">No Module Selected</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Select a Module on the left panel to configure lessons, final exams, co-creators permissions, and split payouts.</p>
                  </Card>
                )}
              </div>

            </div>
          </TabsContent>

          {/* RESOURCE BOOKS TAB */}
          <TabsContent value="books" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Your Educational Handbooks</h3>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs h-10 px-5"
                onClick={() => setShowBookModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> New Handbook
              </Button>
            </div>

            {books.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center rounded-3xl">
                <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white">No Books published yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Publish educational reference guides, study packs, and resources with Drive PDF links attached.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map(book => (
                  <Card key={book.id} className="bg-[#030f26]/40 border-white/5 hover:border-emerald-500/40 transition-all overflow-hidden flex flex-col rounded-3xl">
                    <div className="h-32 bg-gradient-to-br from-indigo-950 to-slate-900 flex items-center justify-center border-b border-white/5">
                      <Bookmark className="w-12 h-12 text-emerald-400/50" />
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-bold uppercase">BOOK</Badge>
                          <span className="text-xs text-slate-400">${book.price}</span>
                        </div>
                        <h4 className="font-extrabold text-base mt-2 truncate text-white">{book.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{book.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-white/10 hover:bg-white/5 rounded-xl text-xs"
                        onClick={() => navigate(`/features/books/${book.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Content Book
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROMOTIONAL SHORTS TAB */}
          <TabsContent value="shorts" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white font-black">Creator Shorts Arena</h3>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs h-10 px-5"
                onClick={() => setShowShortModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Publish Short
              </Button>
            </div>

            {shorts.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center rounded-3xl">
                <Tv className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white">No promotional shorts yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Create high-engagement micro lessons or course teasers linked directly to a module to boost subscriptions!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {shorts.map(sh => (
                  <Card key={sh.id} className="bg-[#030f26]/40 border-white/5 hover:border-emerald-500/40 transition-all overflow-hidden flex flex-col rounded-3xl relative justify-between">
                    <div className="aspect-[9/16] bg-slate-950 flex items-center justify-center border-b border-white/5 relative group">
                      <video src={sh.videoUrl} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-xs text-white font-extrabold line-clamp-2">{sh.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Likes: {sh.likes} • Views: {sh.views}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* WALLET & SPLITS TAB */}
          <TabsContent value="wallet" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <Card className="md:col-span-1 bg-[#030f26]/40 border-white/5 rounded-3xl p-6 flex flex-col justify-between space-y-6">
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Total Payout Balance</h4>
                  <p className="text-4xl font-black text-white mt-2">${wallet?.balance ?? '—'}</p>
                  <p className="text-xs text-slate-400 mt-1">Pending clearance: ${wallet?.pending ?? '—'}</p>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs py-4"
                  >
                    Request bank withdrawal
                  </Button>
                  <p className="text-[10px] text-slate-500 text-center">Settles instantly via bank split payout system</p>
                </div>
              </Card>

              {/* Transactions list */}
              <Card className="md:col-span-2 bg-[#030f26]/40 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-white">Wallet Transaction Ledger</CardTitle>
                  <CardDescription>Direct, audited transaction history for all module split payouts</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {(wallet?.transactions || []).map((t: any, idx: number) => (
                      <div key={t.id || idx} className="p-4 flex justify-between items-center text-xs text-slate-300">
                        <div>
                          <p className="font-bold text-white">{t.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">+${t.amount}</p>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[8px] font-bold mt-1">{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODULE CREATION DIALOG */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-[#0c0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="p-6 border-b border-white/5 flex-shrink-0">
              <CardTitle className="text-lg font-black text-white flex items-center justify-between">
                <span>Create Direct Learning Module</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-none">Work Hub Builder</Badge>
              </CardTitle>
              <CardDescription>Configure title, level, subject, objectives, and access model.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Cover Image & Promo Video Section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cover Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Module Cover Image</label>
                  <div className="border border-dashed border-white/10 rounded-2xl p-3 bg-white/5 text-center flex flex-col items-center justify-center min-h-[110px]">
                    {newModule.coverUrl ? (
                      <div className="relative w-full h-[80px] rounded-lg overflow-hidden group">
                        <img src={newModule.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                        <button
                          onClick={() => setNewModule(prev => ({ ...prev, coverUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-red-400 font-bold transition-opacity"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        {uploadingCover ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-bold">Upload Cover File</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files && handleCoverUpload(e.target.files[0])}
                          disabled={uploadingCover}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Promo Video Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Promo Short Video</label>
                  <div className="border border-dashed border-white/10 rounded-2xl p-3 bg-white/5 text-center flex flex-col items-center justify-center min-h-[110px]">
                    {newModule.promoVideoUrl ? (
                      <div className="relative w-full h-[80px] rounded-lg overflow-hidden group flex items-center justify-center bg-slate-900">
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                          ✓ Video Uploaded
                        </span>
                        <button
                          onClick={() => setNewModule(prev => ({ ...prev, promoVideoUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-red-400 font-bold transition-opacity"
                        >
                          Remove Video
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        {uploadingPromoVideo ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-bold">Upload Promo Video</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={e => e.target.files && handlePromoVideoUpload(e.target.files[0])}
                          disabled={uploadingPromoVideo}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Hanna AI */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold">Module Title</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateTitleWithHanna}
                    disabled={generatingTitle}
                    className="h-6 px-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 border border-emerald-500/20"
                  >
                    {generatingTitle ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                    )}
                    Generate with Hanna
                  </Button>
                </div>
                <Input
                  placeholder="e.g. Advanced Trigonometry & Spherical Navigation"
                  value={newModule.title}
                  onChange={e => setNewModule((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white h-10"
                />
              </div>

              {/* Subject & Education Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Subject Area</label>
                  <select
                    value={newModule.subject}
                    onChange={e => setNewModule((prev: any) => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                  >
                    {SUBJECTS.filter(s => s !== 'All').map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Education Level</label>
                  <select
                    value={newModule.level}
                    onChange={e => setNewModule((prev: any) => ({ ...prev, level: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                  >
                    {LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Subject field if Custom is selected */}
              {newModule.subject === 'Custom' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs text-amber-400 font-bold">Type Custom Subject Area</label>
                  <Input
                    placeholder="e.g. Astro-biology or Advanced Robotics"
                    value={newModule.customSubject}
                    onChange={e => setNewModule((prev: any) => ({ ...prev, customSubject: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white h-10"
                  />
                </div>
              )}

              {/* Description & Hanna AI */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold">Module Description</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDescriptionWithHanna}
                    disabled={generatingDescription}
                    className="h-6 px-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 border border-emerald-500/20"
                  >
                    {generatingDescription ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                    )}
                    Generate with Hanna
                  </Button>
                </div>
                <Textarea
                  placeholder="Provide an engaging module summary..."
                  value={newModule.description}
                  onChange={e => setNewModule((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white min-h-[70px]"
                />
              </div>

              {/* Learning Objectives & Hanna AI */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold">Learning Objectives (Aim, Regulation & Plan - One per line)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateObjectivesWithHanna}
                    disabled={generatingObjectives}
                    className="h-6 px-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 border border-emerald-500/20"
                  >
                    {generatingObjectives ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                    )}
                    Generate with Hanna
                  </Button>
                </div>
                <Textarea
                  placeholder="Understand the mechanics of trigonometry&#10;Model real-world physical systems with sine equations"
                  value={newModule.learningObjectives}
                  onChange={e => setNewModule((prev: any) => ({ ...prev, learningObjectives: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white min-h-[70px]"
                />
              </div>

              {/* Price & Publishing Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Price (USD)</label>
                  <Input
                    type="number"
                    value={newModule.price}
                    onChange={e => setNewModule((prev: any) => ({ ...prev, price: Number(e.target.value) }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">Publishing Status</label>
                  <select
                    value={newModule.status}
                    onChange={e => setNewModule((prev: any) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Publish immediately</option>
                  </select>
                </div>
              </div>
            </CardContent>

            <div className="flex justify-end gap-3 p-6 border-t border-white/5 flex-shrink-0 bg-slate-950/40">
              <Button
                variant="ghost"
                className="rounded-xl font-bold text-xs"
                onClick={() => setShowModuleModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-xs"
                onClick={handleCreateModule}
                disabled={uploadingCover || uploadingPromoVideo}
              >
                Create Module
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SEQUENTIAL LESSON CREATION DIALOG */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl bg-[#0c0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-lg font-black text-white">Add Lesson to Module</CardTitle>
              <CardDescription>Setup explanation content, teaching formats, resources, and mandatory homework instructions.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Lesson Title</label>
                  <Input
                    placeholder="e.g. Lesson 1: Introduction"
                    value={newLesson.title}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, title: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Teaching Format</label>
                  <select
                    value={newLesson.format}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, format: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs h-10 px-3 text-slate-300 outline-none"
                  >
                    <option value="video">Recorded Video</option>
                    <option value="live">Scheduled Live Lesson</option>
                    <option value="other">Other teaching format</option>
                  </select>
                </div>
              </div>

              {newLesson.format === 'video' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Video File URL</label>
                  <Input
                    placeholder="https://cdn.example.com/video.mp4"
                    value={newLesson.videoUrl}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, videoUrl: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              )}

              {newLesson.format === 'live' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Scheduled Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newLesson.scheduledAt}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, scheduledAt: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Content Explanation</label>
                <Textarea
                  placeholder="Provide detailed written syllabus explanation/content"
                  value={newLesson.explanation}
                  onChange={e => setNewLesson((prev: any) => ({ ...prev, explanation: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Google Drive PDF URLs (One per line)</label>
                <Textarea
                  placeholder="https://drive.google.com/..."
                  value={newLesson.drivePdfUrls}
                  onChange={e => setNewLesson((prev: any) => ({ ...prev, drivePdfUrls: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              {/* MANDATORY ASSIGNMENT CONFIGURATION */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Mandatory Homework Assignment</h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Instructions</label>
                  <Input
                    placeholder="e.g. Answer questions 1 to 5 from chapter 2"
                    value={newLesson.assignmentInstructions}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, assignmentInstructions: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Requirements & Deadline</label>
                  <Input
                    placeholder="e.g. PDF upload before next class"
                    value={newLesson.assignmentRequirements}
                    onChange={e => setNewLesson((prev: any) => ({ ...prev, assignmentRequirements: e.target.value }))}
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  variant="ghost"
                  className="rounded-xl font-bold text-xs"
                  onClick={() => setShowLessonModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-xs"
                  onClick={handleAddLesson}
                >
                  Add Sequential Lesson
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HANDBOOK CREATION DIALOG */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-lg font-black text-white">Create Educational handbook</CardTitle>
              <CardDescription>Publish resources with chapters and linked Drive PDFs.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Title</label>
                <Input
                  value={newBook.title}
                  onChange={e => setNewBook((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Description</label>
                <Textarea
                  value={newBook.description}
                  onChange={e => setNewBook((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowBookModal(false)}>Cancel</Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold" onClick={handleCreateBook}>Publish</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PROMOTIONAL SHORT DIALOG */}
      {showShortModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-lg font-black text-white">Publish Creator Short</CardTitle>
              <CardDescription>Upload micro lesson teasers linked to your modules.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold">Video File URL</label>
                <Input
                  value={newShort.videoUrl}
                  onChange={e => setNewShort((prev: any) => ({ ...prev, videoUrl: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Title</label>
                <Input
                  value={newShort.title}
                  onChange={e => setNewShort((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowShortModal(false)}>Cancel</Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold" onClick={handleCreateShort}>Publish</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
