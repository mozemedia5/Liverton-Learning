/**
 * Quiz Service - Real-time Firebase Quiz Management
 * Handles quiz creation, submission, and analytics
 */

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ==========================================
// QUIZ INTERFACES
// ==========================================

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  questions: Question[];
  timeLimitPerQuestion: number;
  createdAt: Timestamp;
  status: 'published' | 'draft' | 'archived';
  questionCount: number;
  totalAttempts?: number;
  averageScore?: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answers: number[]; // Index of selected option for each question
  score: number; // Percentage score
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number; // In seconds
  attemptedAt: Timestamp;
  completedAt: Timestamp;
  status: 'completed' | 'abandoned';
}

export interface QuizAnalytics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  abandonedAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSpent: number; // In seconds
  questionAnalytics: QuestionAnalytic[];
  studentAttempts: QuizAttempt[];
}

export interface QuestionAnalytic {
  questionIndex: number;
  questionText: string;
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  correctPercentage: number;
  mostSelectedOption: number;
  optionDistribution: number[]; // Count for each option
}

// ==========================================
// QUIZ MANAGEMENT FUNCTIONS
// ==========================================

/**
 * Subscribe to all quizzes created by a teacher (real-time)
 */
export function subscribeToTeacherQuizzes(
  teacherId: string,
  callback: (quizzes: Quiz[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'quizzes'),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const quizzes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        totalAttempts: data.totalAttempts || 0,
        averageScore: data.averageScore || 0,
      } as Quiz;
    });
    callback(quizzes);
  }, (error) => {
    console.error("Error subscribing to teacher quizzes:", error);
    // Fallback without ordering
    const simpleQ = query(collection(db, 'quizzes'), where('teacherId', '==', teacherId));
    onSnapshot(simpleQ, (snapshot) => {
      const quizzes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          totalAttempts: data.totalAttempts || 0,
          averageScore: data.averageScore || 0,
        } as Quiz;
      });
      callback(quizzes);
    });
  });
}

/**
 * Subscribe to all quizzes (for platform admin)
 */
export function subscribeToAllQuizzesAdmin(
  callback: (quizzes: Quiz[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'quizzes'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const quizzes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        totalAttempts: data.totalAttempts || 0,
        averageScore: data.averageScore || 0,
      } as Quiz;
    });
    callback(quizzes);
  }, (error) => {
    console.error("Error subscribing to all quizzes:", error);
    // Fallback without ordering
    const simpleQ = query(collection(db, 'quizzes'));
    onSnapshot(simpleQ, (snapshot) => {
      const quizzes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          totalAttempts: data.totalAttempts || 0,
          averageScore: data.averageScore || 0,
        } as Quiz;
      });
      callback(quizzes);
    });
  });
}

/**
 * Get a single quiz by ID
 */
export async function getQuizById(quizId: string): Promise<Quiz | null> {
  try {
    const docSnap = await getDocs(query(collection(db, 'quizzes'), where('id', '==', quizId)));
    
    if (docSnap.empty) return null;
    
    const data = docSnap.docs[0].data();
    return {
      id: docSnap.docs[0].id,
      ...data,
      totalAttempts: data.totalAttempts || 0,
      averageScore: data.averageScore || 0,
    } as Quiz;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return null;
  }
}

/**
 * Submit a quiz attempt
 */
export async function submitQuizAttempt(
  quizId: string,
  studentId: string,
  studentName: string,
  studentEmail: string,
  answers: number[],
  quiz: Quiz,
  timeTaken: number
): Promise<string> {
  try {
    // Calculate score
    let correctAnswers = 0;
    answers.forEach((answer, index) => {
      if (answer === quiz.questions[index].correctOptionIndex) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / quiz.questions.length) * 100;

    // Create attempt record
    const attemptRef = await addDoc(collection(db, 'quizAttempts'), {
      quizId,
      studentId,
      studentName,
      studentEmail,
      answers,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      timeTaken,
      attemptedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      status: 'completed',
    });

    // Update quiz with attempt count and average score
    const quizRef = doc(db, 'quizzes', quizId);
    const currentTotalAttempts = (quiz.totalAttempts || 0);
    const currentAverage = (quiz.averageScore || 0);
    const newTotalAttempts = currentTotalAttempts + 1;
    const newAverage = currentTotalAttempts === 0 
      ? score 
      : (currentAverage * currentTotalAttempts + score) / newTotalAttempts;

    await updateDoc(quizRef, {
      totalAttempts: newTotalAttempts,
      averageScore: newAverage,
    });

    return attemptRef.id;
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw error;
  }
}

/**
 * Subscribe to quiz attempts for a specific quiz (real-time)
 */
export function subscribeToQuizAttempts(
  quizId: string,
  callback: (attempts: QuizAttempt[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'quizAttempts'),
    where('quizId', '==', quizId),
    orderBy('completedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const attempts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as QuizAttempt));
    callback(attempts);
  });
}

/**
 * Get comprehensive quiz analytics
 */
export async function getQuizAnalytics(quizId: string, quiz: Quiz): Promise<QuizAnalytics> {
  try {
    const attemptsSnapshot = await getDocs(
      query(
        collection(db, 'quizAttempts'),
        where('quizId', '==', quizId)
      )
    );

    const attempts = attemptsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as QuizAttempt));

    const completedAttempts = attempts.filter((a) => a.status === 'completed');
    const abandonedAttempts = attempts.filter((a) => a.status === 'abandoned');

    // Calculate basic stats
    const totalAttempts = attempts.length;
    const scores = completedAttempts.map((a) => a.score);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const timeTaken = completedAttempts.map((a) => a.timeTaken);
    const averageTimeSpent = timeTaken.length > 0 ? timeTaken.reduce((a, b) => a + b, 0) / timeTaken.length : 0;

    // Calculate question analytics
    const questionAnalytics: QuestionAnalytic[] = quiz.questions.map((question, index) => {
      const answersForQuestion = completedAttempts.map((a) => a.answers[index]);
      const correctCount = answersForQuestion.filter(
        (answer) => answer === question.correctOptionIndex
      ).length;
      const incorrectCount = answersForQuestion.length - correctCount;
      const correctPercentage = answersForQuestion.length > 0 ? (correctCount / answersForQuestion.length) * 100 : 0;

      // Distribution of answers
      const optionDistribution = new Array(question.options.length).fill(0);
      answersForQuestion.forEach((answer) => {
        if (answer !== undefined && answer !== null) {
          optionDistribution[answer]++;
        }
      });

      const mostSelectedOption = optionDistribution.indexOf(Math.max(...optionDistribution));

      return {
        questionIndex: index,
        questionText: question.text,
        totalAnswered: answersForQuestion.length,
        correctCount,
        incorrectCount,
        correctPercentage,
        mostSelectedOption,
        optionDistribution,
      };
    });

    return {
      quizId,
      quizTitle: quiz.title,
      totalAttempts,
      completedAttempts: completedAttempts.length,
      abandonedAttempts: abandonedAttempts.length,
      averageScore,
      highestScore,
      lowestScore,
      averageTimeSpent,
      questionAnalytics,
      studentAttempts: completedAttempts,
    };
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    throw error;
  }
}

/**
 * Subscribe to quiz analytics in real-time
 */
export function subscribeToQuizAnalytics(
  quizId: string,
  quiz: Quiz,
  callback: (analytics: QuizAnalytics) => void
): Unsubscribe {
  const q = query(
    collection(db, 'quizAttempts'),
    where('quizId', '==', quizId)
  );

  return onSnapshot(q, async (_) => {
    const analytics = await getQuizAnalytics(quizId, quiz);
    callback(analytics);
  });
}

/**
 * Get student's quiz attempts
 */
export async function getStudentQuizAttempts(
  studentId: string,
  quizId?: string
): Promise<QuizAttempt[]> {
  try {
    let q;
    if (quizId) {
      q = query(
        collection(db, 'quizAttempts'),
        where('studentId', '==', studentId),
        where('quizId', '==', quizId),
        orderBy('completedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'quizAttempts'),
        where('studentId', '==', studentId),
        orderBy('completedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as QuizAttempt));
  } catch (error) {
    console.error('Error fetching student quiz attempts:', error);
    return [];
  }
}
