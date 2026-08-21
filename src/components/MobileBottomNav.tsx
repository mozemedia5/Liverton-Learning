import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, MessageSquare, Briefcase, MoreHorizontal, FileText, Calendar, Bell, Settings, X, Sparkles } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const mainNavItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Modules', path: '/dashboard/courses', icon: BookOpen },
    { name: 'Ask Hanna', path: '/features/hanna-ai', icon: Sparkles, isPrimary: true },
    { name: 'Work Hub', path: '/features/tearn', icon: Briefcase },
    { name: 'More', path: '#more', icon: MoreHorizontal, onClick: () => setShowMore(true) },
  ];

  const secondaryNavItems = [
    { name: 'Documents', path: '/dashboard/documents', icon: FileText },
    { name: 'Messages', path: '/chat', icon: MessageSquare },
    { name: 'Announcements', path: '/announcements', icon: Bell },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-full shadow-lg shadow-slate-900/10 px-3 py-2 transition-all">
        <div className="flex items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (item.isPrimary) {
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className="relative -top-5 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
                  aria-label={item.name}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            }

            return (
              <button
                key={item.name}
                onClick={() => (item.onClick ? item.onClick() : navigate(item.path))}
                className={`flex flex-col items-center justify-center w-12 py-1 text-xs font-medium transition-colors ${
                  active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end animate-in fade-in duration-200" onClick={() => setShowMore(false)}>
          <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Quick Actions & Menu</h3>
              <button onClick={() => setShowMore(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 py-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setShowMore(false);
                      navigate(item.path);
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                      active ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-center">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
