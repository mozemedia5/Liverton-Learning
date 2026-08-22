import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShortsArena from './ShortsArena';
import type { EducationalShort } from '@/services/tearnService';

const { getAllShortsMock } = vi.hoisted(() => ({
  getAllShortsMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'student-test-user' },
    userRole: 'student',
  }),
}));

vi.mock('@/services/tearnService', () => ({
  getAllShorts: getAllShortsMock,
  incrementShortViews: vi.fn(() => Promise.resolve()),
  incrementShortLikes: vi.fn(() => Promise.resolve()),
  followTeacher: vi.fn(() => Promise.resolve()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-route">{location.pathname}</output>;
}

function renderViewer(short: EducationalShort): { root: Root; container: HTMLDivElement } {
  getAllShortsMock.mockResolvedValue([short]);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/features/tearn/shorts']}>
        <Routes>
          <Route path="*" element={<><ShortsArena /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return { root, container };
}

async function settleViewer() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe('Student Shorts linked-learning experience', () => {
  let mounted: { root: Root; container: HTMLDivElement } | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    getAllShortsMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      mounted?.root.unmount();
    });
    mounted?.container.remove();
    mounted = null;
  });

  it('routes a module-linked Short to the module curriculum', async () => {
    mounted = renderViewer({
      id: 'short-module-1',
      title: 'Module Short',
      description: 'Follow the module next.',
      videoUrl: 'https://example.com/module.mp4',
      courseId: 'module-123',
      learningLinkType: 'module',
      learningLinkTitle: 'Physics foundations',
      teacherId: 'teacher-1',
      teacherName: 'Teacher One',
      likes: 2,
      views: 10,
      createdAt: new Date(),
    });
    await settleViewer();

    const linkButton = Array.from(mounted.container.querySelectorAll('button')).find((button) => button.textContent?.includes('Follow linked module'));
    expect(linkButton).toBeTruthy();
    await act(async () => {
      linkButton?.click();
    });

    expect(mounted.container.querySelector('[data-testid="current-route"]')?.textContent).toBe('/courses/module-123');
  });

  it('routes a live-lesson-linked Short to the live lesson room', async () => {
    mounted = renderViewer({
      id: 'short-lesson-1',
      title: 'Live Lesson Short',
      description: 'Join the scheduled lesson next.',
      videoUrl: 'https://example.com/live-lesson.mp4',
      lessonId: 'lesson-456',
      learningLinkType: 'liveLesson',
      learningLinkTitle: 'Exam revision live room',
      teacherId: 'teacher-1',
      teacherName: 'Teacher One',
      likes: 3,
      views: 12,
      createdAt: new Date(),
    });
    await settleViewer();

    const linkButton = Array.from(mounted.container.querySelectorAll('button')).find((button) => button.textContent?.includes('Open linked live lesson'));
    expect(linkButton).toBeTruthy();
    await act(async () => {
      linkButton?.click();
    });

    expect(mounted.container.querySelector('[data-testid="current-route"]')?.textContent).toBe('/zoom-lessons/lesson-456');
  });
});
