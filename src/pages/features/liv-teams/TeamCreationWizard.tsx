import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MediaUploadField } from '@/components/MediaUploadField';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Loader2, Check, Users, Image as ImageIcon,
  Globe, Settings2, ClipboardCheck, Pencil
} from 'lucide-react';
import { createTeam, teamCategories } from '@/services/livTeamsCoreService';
import type { TeamVisibility } from '@/types/livTeams';
import { TeamLogo } from './livTeamsUi';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { cn } from '@/lib/utils';

interface TeamCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teamId: string) => void;
}

interface WizardFormState {
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  purpose: string;
  country: string;
  school: string;
  district: string;
  language: string;
  visibility: TeamVisibility;
  maxMembers: number;
  welcomeMessage: string;
  rules: string;
  tagsText: string;
}

const INITIAL_FORM: WizardFormState = {
  name: '',
  category: 'Science',
  description: '',
  logoUrl: '',
  coverUrl: '',
  purpose: '',
  country: 'Uganda',
  school: '',
  district: '',
  language: 'English',
  visibility: 'public',
  maxMembers: 50,
  welcomeMessage: 'Welcome to the Team!',
  rules: '',
  tagsText: '',
};

const STEPS = [
  { id: 'basics', label: 'Basics', icon: Users },
  { id: 'branding', label: 'Branding', icon: ImageIcon },
  { id: 'details', label: 'Details', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
] as const;

const visibilityOptions: { value: TeamVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can discover and join' },
  { value: 'private', label: 'Private', hint: 'Only invited members can see it' },
  { value: 'invite-only', label: 'Invite only', hint: 'Discoverable, join by invitation' },
];

export default function TeamCreationWizard({ open, onOpenChange, onCreated }: TeamCreationWizardProps) {
  const { currentUser, userData, userRole } = useAuth();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [form, setForm] = useState<WizardFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadsInFlight, setUploadsInFlight] = useState(0);
  const [creating, setCreating] = useState(false);

  const set = useCallback(<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }, []);

  const resetWizard = useCallback(() => {
    setStep(0);
    setDirection('forward');
    setForm(INITIAL_FORM);
    setErrors({});
    setUploadsInFlight(0);
    setCreating(false);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (creating) return; // never close mid-creation
    if (!nextOpen) resetWizard();
    onOpenChange(nextOpen);
  }, [creating, onOpenChange, resetWizard]);

  /* ------------------------------ Validation ------------------------------ */

  const validateStep = useCallback((stepIndex: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (form.name.trim().length < 3) {
        stepErrors.name = 'Team name must be at least 3 characters';
      }
      if (!form.category) {
        stepErrors.category = 'Choose a category';
      }
    }

    if (stepIndex === 1 && uploadsInFlight > 0) {
      toast.error('Please wait for your uploads to finish');
      return false;
    }

    if (stepIndex === 3) {
      if (!Number.isFinite(form.maxMembers) || form.maxMembers < 2 || form.maxMembers > 1000) {
        stepErrors.maxMembers = 'Between 2 and 1000 members';
      }
      if (!form.welcomeMessage.trim()) {
        stepErrors.welcomeMessage = 'Welcome message is required';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [form, uploadsInFlight]);

  /* ------------------------------ Navigation ------------------------------ */

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection('forward');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep(s => Math.max(s - 1, 0));
    setErrors({});
  }, []);

  const goToStep = useCallback((target: number) => {
    setDirection(target > step ? 'forward' : 'backward');
    setStep(target);
    setErrors({});
  }, [step]);

  const handleStepFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) goNext();
  }, [step, goNext]);

  /* ------------------------------ Submit ------------------------------ */

  const parsedTags = useMemo(
    () => form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
    [form.tagsText]
  );

  const handleCreate = async () => {
    if (!currentUser || !userData || creating) return;
    if (!validateStep(0)) {
      goToStep(0);
      return;
    }
    if (uploadsInFlight > 0) {
      toast.error('Please wait for your uploads to finish');
      return;
    }

    setCreating(true);
    try {
      const teamId = await createTeam({
        name: form.name.trim(),
        logoUrl: form.logoUrl,
        coverUrl: form.coverUrl,
        description: form.description.trim(),
        category: form.category,
        purpose: form.purpose.trim(),
        country: form.country.trim() || 'Global',
        school: form.school.trim(),
        district: form.district.trim(),
        language: form.language.trim() || 'English',
        visibility: form.visibility,
        maxMembers: Math.max(2, form.maxMembers || 50),
        rules: form.rules.trim(),
        welcomeMessage: form.welcomeMessage.trim() || 'Welcome to the Team!',
        tags: parsedTags
      }, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '', userRole || undefined);

      toast.success('Team created successfully! Your workspace is ready.');
      onOpenChange(false);
      resetWizard();
      onCreated(teamId);
    } catch (error) {
      console.error('Team creation failed:', error);
      toast.error('Failed to create team. Please try again.');
      setCreating(false);
    }
  };

  /* ------------------------------ Render helpers ------------------------------ */

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 sm:gap-2" role="list" aria-label="Creation progress">
      {STEPS.map((s, i) => {
        const isComplete = i < step;
        const isCurrent = i === step;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-none" role="listitem">
            <button
              type="button"
              onClick={() => i < step && goToStep(i)}
              disabled={i > step || creating}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-1.5 py-1 transition-colors',
                i < step ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
                  isComplete && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500',
                  !isComplete && !isCurrent && 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                )}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </span>
              <span
                className={cn(
                  'text-xs font-medium hidden md:block',
                  isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden min-w-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: i < step ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const inputClass = 'rounded-xl';
  const errorText = (key: string) =>
    errors[key] ? <p className="text-xs text-red-500" role="alert">{errors[key]}</p> : null;

  const reviewRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );

  const reviewSection = (title: string, stepIndex: number, children: React.ReactNode) => (
    <div className="rounded-xl border border-gray-100 dark:border-white/5 p-3.5 space-y-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <button
          type="button"
          onClick={() => goToStep(stepIndex)}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 hover:underline"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      {children}
    </div>
  );

  /* ------------------------------ Render ------------------------------ */

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[92dvh] rounded-2xl flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/5 space-y-3">
          <div>
            <DialogTitle className="text-lg font-bold">Create a Liv Team</DialogTitle>
            <DialogDescription className="text-sm">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </DialogDescription>
          </div>
          {renderStepIndicator()}
        </DialogHeader>

        <form onSubmit={handleStepFormSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          <div key={step} className={direction === 'forward' ? 'wizard-step-forward' : 'wizard-step-backward'}>

            {/* STEP 1: Basics */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wz-name">Team Name *</Label>
                  <Input
                    id="wz-name"
                    autoFocus
                    className={inputClass}
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Science Project Team"
                    maxLength={60}
                  />
                  {errorText('name')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wz-category">Category *</Label>
                  <Select value={form.category} onValueChange={v => set('category', v)}>
                    <SelectTrigger id="wz-category" className={inputClass}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errorText('category')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wz-desc">Description</Label>
                  <Textarea
                    id="wz-desc"
                    className={inputClass}
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="What is this team about? Who is it for?"
                    maxLength={300}
                  />
                  <p className="text-[11px] text-slate-400 text-right">{form.description.length}/300</p>
                </div>
              </div>
            )}

            {/* STEP 2: Branding */}
            {step === 1 && (
              <div className="space-y-5">
                <MediaUploadField
                  label="Team Logo"
                  description="Square image works best — shown on cards and the workspace header."
                  value={form.logoUrl}
                  onChange={url => set('logoUrl', url)}
                  onUploadingChange={u => setUploadsInFlight(c => u ? c + 1 : Math.max(0, c - 1))}
                  previewAspect="2/1"
                  maxSizeMB={5}
                />
                <MediaUploadField
                  label="Cover Image"
                  description="Wide banner shown at the top of your workspace."
                  value={form.coverUrl}
                  onChange={url => set('coverUrl', url)}
                  onUploadingChange={u => setUploadsInFlight(c => u ? c + 1 : Math.max(0, c - 1))}
                  previewAspect="3/1"
                  maxSizeMB={10}
                />
                <p className="text-xs text-slate-400">
                  Both are optional — you can skip this step and your team gets a beautiful default look.
                </p>
              </div>
            )}

            {/* STEP 3: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wz-purpose">Team Purpose / Goal</Label>
                  <Input
                    id="wz-purpose"
                    autoFocus
                    className={inputClass}
                    value={form.purpose}
                    onChange={e => set('purpose', e.target.value)}
                    placeholder="e.g. Preparing for the Physics National Olympiad"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wz-country">Country</Label>
                    <Input id="wz-country" className={inputClass} value={form.country} onChange={e => set('country', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wz-school">School (optional)</Label>
                    <Input id="wz-school" className={inputClass} value={form.school} onChange={e => set('school', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wz-district">District (optional)</Label>
                    <Input id="wz-district" className={inputClass} value={form.district} onChange={e => set('district', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wz-language">Primary Language</Label>
                    <Input id="wz-language" className={inputClass} value={form.language} onChange={e => set('language', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wz-tags">Tags (comma separated)</Label>
                    <Input id="wz-tags" className={inputClass} value={form.tagsText} onChange={e => set('tagsText', e.target.value)} placeholder="science, physics, revision" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Settings */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {visibilityOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('visibility', opt.value)}
                        aria-pressed={form.visibility === opt.value}
                        className={cn(
                          'rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
                          form.visibility === opt.value
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : 'border-gray-200 dark:border-white/10 hover:border-emerald-500/50'
                        )}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wz-max">Max Members</Label>
                    <Input
                      id="wz-max"
                      type="number"
                      min={2}
                      max={1000}
                      className={inputClass}
                      value={form.maxMembers}
                      onChange={e => set('maxMembers', Number(e.target.value))}
                    />
                    {errorText('maxMembers')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wz-welcome">Welcome Message *</Label>
                    <Input
                      id="wz-welcome"
                      className={inputClass}
                      value={form.welcomeMessage}
                      onChange={e => set('welcomeMessage', e.target.value)}
                    />
                    {errorText('welcomeMessage')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wz-rules">Team Rules / Code of Conduct</Label>
                  <Textarea
                    id="wz-rules"
                    className={inputClass}
                    rows={3}
                    value={form.rules}
                    onChange={e => set('rules', e.target.value)}
                    placeholder="Be respectful, submit work on time, help others..."
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {step === 4 && (
              <div className="space-y-4">
                {(form.coverUrl || form.logoUrl) && (
                  <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/5">
                    <CloudinaryImage
                      src={form.coverUrl}
                      alt="Team cover preview"
                      aspect="3/1"
                      eager
                      fallback={<div className="w-full h-full bg-gradient-to-r from-emerald-500/15 to-teal-500/10" />}
                    />
                    <div className="flex items-center gap-3 p-3">
                      <TeamLogo name={form.name || 'T'} logoUrl={form.logoUrl} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{form.name}</p>
                        <p className="text-xs text-slate-400 truncate">{form.purpose || form.category}</p>
                      </div>
                    </div>
                  </div>
                )}

                {reviewSection('Basics', 0, (
                  <>
                    {reviewRow('Name', form.name)}
                    {reviewRow('Category', form.category)}
                    {reviewRow('Description', form.description || <span className="text-slate-400">—</span>)}
                  </>
                ))}

                {reviewSection('Details', 2, (
                  <>
                    {reviewRow('Purpose', form.purpose || <span className="text-slate-400">—</span>)}
                    {reviewRow('Location', [form.district, form.school, form.country].filter(Boolean).join(', ') || 'Global')}
                    {reviewRow('Language', form.language)}
                    {parsedTags.length > 0 && reviewRow('Tags', (
                      <span className="inline-flex flex-wrap gap-1 justify-end">
                        {parsedTags.map(t => <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5">#{t}</Badge>)}
                      </span>
                    ))}
                  </>
                ))}

                {reviewSection('Settings', 3, (
                  <>
                    {reviewRow('Visibility', <span className="capitalize">{form.visibility}</span>)}
                    {reviewRow('Max members', form.maxMembers)}
                    {reviewRow('Welcome', form.welcomeMessage)}
                    {form.rules && reviewRow('Rules', <span className="line-clamp-2">{form.rules}</span>)}
                  </>
                ))}

                <p className="text-xs text-slate-400 text-center pt-1">
                  Your workspace — dashboard, chat, files, projects, calendar, savings wallet and analytics — is generated instantly.
                </p>
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="flex items-center justify-between gap-3 pt-6 pb-1">
            <div>
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={goBack} disabled={creating} className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <Button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  disabled={uploadsInFlight > 0}
                >
                  Next <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || uploadsInFlight > 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating workspace...</>
                  ) : (
                    <>Create Team <Check className="w-4 h-4 ml-1.5" /></>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
