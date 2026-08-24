import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BookOpen, FileText, LogOut, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import type { HannaPersonalizationSettings } from '@/types';

const DEFAULT_HANNA_PERSONALIZATION: HannaPersonalizationSettings = {
  profile: true,
  learning: true,
  documents: false,
  teams: false,
  projects: false,
  funds: false,
  marketplace: false,
  chats: false,
  autoAnalyze: false,
};

const HANNA_SCOPES: Array<[keyof HannaPersonalizationSettings, string, string]> = [
  ['profile', 'Profile and role', 'Use your name, role, school, subjects, and education level.'],
  ['learning', 'Modules and progress', 'Use enrolled modules, lessons, quizzes, exams, and progress signals.'],
  ['documents', 'Document library', 'Read authorized document titles and excerpts to summarize or analyze them.'],
  ['teams', 'Liv Teams', 'Use teams you belong to and member-safe team resources.'],
  ['projects', 'Projects and tasks', 'Use authorized team projects, task status, and task summaries.'],
  ['funds', 'LivFund campaigns', 'Use campaigns you own or are authorized to manage.'],
  ['marketplace', 'LivMart listings', 'Use authorized team listings and project resources.'],
  ['chats', 'Hanna conversation index', 'Use your Hanna conversation titles and counts for continuity.'],
  ['autoAnalyze', 'Analyze enabled content automatically', 'Let Hanna use selected context proactively when it is relevant.'],
];

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userData, logout, updateUserProfile } = useAuth();
  const [hannaPersonalization, setHannaPersonalization] = useState<HannaPersonalizationSettings>({ ...DEFAULT_HANNA_PERSONALIZATION, ...userData?.hannaPersonalization });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData?.hannaPersonalization) setHannaPersonalization({ ...DEFAULT_HANNA_PERSONALIZATION, ...userData.hannaPersonalization });
  }, [userData?.hannaPersonalization]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({ hannaPersonalization });
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Could not save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); toast.success('You are signed out'); navigate('/login'); }
    catch { toast.error('Could not sign out'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white"><BookOpen className="h-5 w-5 text-white dark:text-black" /></div><span className="font-semibold">Settings</span></div></div>
          <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
        <Card className="border-blue-200/70 dark:border-blue-900/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" /> Hanna personalization</CardTitle><p className="text-sm text-muted-foreground">Choose the information Hanna may use for personalized answers. You can change these permissions at any time.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:bg-blue-950/30 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between"><span>Hanna only receives scopes you enable. Backend permissions still apply, and private records remain protected.</span><Button type="button" size="sm" variant="outline" className="shrink-0 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-transparent dark:text-blue-200" onClick={() => setHannaPersonalization(prev => ({ ...prev, profile: true, learning: true, documents: true, teams: true, projects: true, funds: true, marketplace: true }))}>Enable recommended context</Button></div>
            {HANNA_SCOPES.map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{description}</p></div><Switch checked={hannaPersonalization[key]} onCheckedChange={checked => setHannaPersonalization(prev => ({ ...prev, [key]: checked }))} aria-label={`Allow Hanna to use ${label}`} /></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><div><p className="font-medium">Dark mode</p><p className="text-sm text-muted-foreground">Use a darker workspace theme.</p></div><Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} /></div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Legal and privacy</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2"><Button variant="outline" className="justify-start rounded-xl" onClick={() => navigate('/privacy-policy')}><ShieldCheck className="mr-2 h-4 w-4" /> Privacy policy</Button><Button variant="outline" className="justify-start rounded-xl" onClick={() => navigate('/terms')}><FileText className="mr-2 h-4 w-4" /> Terms of service</Button></CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader><CardTitle>Account</CardTitle><p className="text-sm text-muted-foreground">Manage your profile or sign out of Liverton.</p></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row"><Button variant="outline" className="rounded-xl" onClick={() => navigate('/profile')}><User className="mr-2 h-4 w-4" /> Edit profile</Button><Button variant="outline" className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" onClick={() => setShowLogoutConfirm(true)}><LogOut className="mr-2 h-4 w-4" /> Log out</Button></CardContent>
        </Card>
      </main>
      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
    </div>
  );
}
