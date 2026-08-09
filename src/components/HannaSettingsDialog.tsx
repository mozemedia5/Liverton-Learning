/**
 * HannaSettingsDialog Component
 *
 * Implements a modern, glassmorphic settings modal/dialog to view details
 * about Hanna AI ("About Hanna") and configure user-specific Custom System Instructions
 * persisted in localStorage.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Sparkles, BookOpen, GraduationCap, PenTool, ShieldCheck, Heart } from 'lucide-react';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { toast } from 'sonner';

interface HannaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultTab?: 'about' | 'instructions';
}

export function HannaSettingsDialog({ isOpen, onClose, userId, defaultTab }: HannaSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'instructions'>('about');
  const [instructions, setInstructions] = useState('');

  // Sync activeTab when defaultTab or isOpen changes
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Load custom instructions from localStorage
  useEffect(() => {
    if (!isOpen || !userId) return;
    const key = `hanna_instructions_${userId}`;
    const saved = localStorage.getItem(key) || '';
    setInstructions(saved);
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const key = `hanna_instructions_${userId}`;
    localStorage.setItem(key, instructions.trim());
    toast.success('Hanna instructions updated successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-xl bg-white/95 dark:bg-[#0a0a0f]/95 border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center border border-white/5 shadow-md relative">
              <div className="scale-[1.8]">
                <AskHannaIcon size={24} showText={false} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0a0a0f] rounded-full z-30 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                Hanna Assistant Hub
                <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Configure your AI Companion</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full w-8 h-8 hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-slate-100/50 dark:bg-white/[0.01] border-b border-slate-200/40 dark:border-white/5 flex gap-2">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'about'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
            }`}
          >
            About Hanna AI
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'instructions'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
            }`}
          >
            Custom Instructions
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-sm leading-relaxed">
          {activeTab === 'about' ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Hanna is a high-fidelity, lightning-fast virtual learning companion natively integrated into Liverton Learning. Powered by state-of-the-art Generative AI models, Hanna is designed to offer contextual, curriculum-aligned academic assistance.
                </p>
              </div>

              {/* Core Features list */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">How Hanna Helps You Learn:</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-white">Role-Aware Mentoring</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Adapts tone automatically based on whether you are a Student, Teacher, Parent or Admin.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-white">Active Context Sync</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Detects whichever course, lesson, document or book you are reading to answer contextually.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-white">Visual Image Creator</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Automatically draws flowcharts, biology structures, and math graphs on-demand.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-white">Safe Education Sandboxing</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Strict guardrails filter non-educational requests to guarantee child-safe learning.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-600 font-bold">
                <span>Made with</span>
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                <span>for the Liverton Learning Community</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-white">What would you like Hanna to know about you?</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  These instructions will be automatically injected into Hanna's system prompt before each message you send. You can ask Hanna to explain things at a certain age level, focus on specific subjects, use specific learning rules, or format responses in a special way.
                </p>
              </div>

              <div className="space-y-1.5">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. 'I am preparing for UCE exams in Uganda. Please explain complex scientific concepts using simple local analogies and end answers with a quick 1-sentence revision hint.'"
                  rows={6}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] outline-none text-xs leading-relaxed focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/5 transition-all text-slate-800 dark:text-slate-100"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1">
                  Keep instructions constructive and educational. Custom rules remain stored on your device.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-end gap-3.5">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold text-xs h-10 px-5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            Close
          </Button>
          {activeTab === 'instructions' && (
            <Button
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs h-10 px-6 shadow-md shadow-emerald-500/10 transition-all active:scale-95"
            >
              Save Instructions
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
