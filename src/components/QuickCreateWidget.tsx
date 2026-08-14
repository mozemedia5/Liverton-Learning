import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  BookOpen,
  CalendarPlus,
  FilePlus2,
  Video,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  path: string;
  iconBg: string;
  iconColor: string;
}

const TEACHER_ACTIONS: QuickAction[] = [
  {
    icon: BookOpen,
    label: 'Add Module',
    path: '/features/tearn',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  {
    icon: FilePlus2,
    label: 'Add Lesson',
    path: '/features/tearn',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  {
    icon: HelpCircle,
    label: 'Add Quiz',
    path: '/teacher/quizzes/create',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20',
    iconColor: 'text-violet-500 dark:text-violet-400',
  },
  {
    icon: Video,
    label: 'Live Lesson',
    path: '/features/tearn',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
  {
    icon: CalendarPlus,
    label: 'Add Event',
    path: '/events/create',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  {
    icon: Megaphone,
    label: 'Others',
    path: '/dashboard/documents',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/20',
    iconColor: 'text-cyan-500 dark:text-cyan-400',
  },
];

/**
 * QuickCreateWidget - rounded action-grid ("Add" sheet) for the teacher
 * dashboard: add a quiz, course, event, document, live lesson or
 * announcement with a single tap. Mirrors the quick-action sheets used
 * by mainstream mobile apps.
 */
export function QuickCreateWidget() {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Quick Create
        </h2>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Tap to add
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {TEACHER_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${action.iconBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
              >
                <Icon className={`w-6 h-6 ${action.iconColor}`} />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickCreateWidget;
