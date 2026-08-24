import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  BookOpen, 
  ArrowLeft, 
  Moon, 
  Bell, 
  Mail,
  Shield,
  Volume2,
  User,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import type { HannaPersonalizationSettings } from '@/types';

/**
 * Settings Page Component
 * 
 * Features:
 * - Dark mode toggle with improved dark theme (not too dark)
 * - Notification preferences
 * - Privacy & Security settings
 * - Profile editing: Phone number and Address with Firebase Firestore persistence
 * - Removed Language & Region settings
 * - Real-time Firebase updates
 */
export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userData, logout, updateUserProfile } = useAuth();
  const defaultHannaPersonalization: HannaPersonalizationSettings = { profile: true, learning: true, documents: false, teams: false, projects: false, funds: false, marketplace: false, chats: false, autoAnalyze: false };
  const [hannaPersonalization, setHannaPersonalization] = useState<HannaPersonalizationSettings>(userData?.hannaPersonalization || defaultHannaPersonalization);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  useEffect(() => { if (userData?.hannaPersonalization) setHannaPersonalization({ ...defaultHannaPersonalization, ...userData.hannaPersonalization }); }, [userData?.hannaPersonalization]);

  const handleSave = async () => {
    try { await updateUserProfile({ hannaPersonalization }); toast.success('Settings saved successfully!'); }
    catch { toast.error('Could not save settings. Please try again.'); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); toast.success('You are signed out'); navigate('/login'); }
    catch { toast.error('Could not sign out'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-card border-b border-border transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Settings</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              className="rounded-xl border-border"
            >
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Profile entry point: identity fields live in one canonical editor. */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{userData?.fullName || 'Liverton member'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {userData?.username ? `@${userData.username}` : 'Add a username'}
                  {userData?.email ? ` · ${userData.email}` : ''}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Manage your name, username, phone number, address, bio, and photo from Profile.
                </p>
              </div>
              <Button variant="outline" className="rounded-xl shrink-0" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-1.5" />
                Edit profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hanna personalization */}
        <Card className="border-blue-200/70 dark:border-blue-900/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" /> Hanna personalization</CardTitle><p className="text-sm text-muted-foreground">Choose the information Hanna may use for personalized answers. You can change these permissions at any time.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:bg-blue-950/30 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between"><span>Hanna only receives data from scopes you enable. Backend permissions still apply, and Hanna cannot access another person’s private records.</span><Button type="button" size="sm" variant="outline" className="shrink-0 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-transparent dark:text-blue-200" onClick={() => setHannaPersonalization(prev => ({ ...prev, profile: true, learning: true, documents: true, teams: true, projects: true, funds: true, marketplace: true }))}>Enable recommended context</Button></div>
            {([
              ['profile', 'Profile and role', 'Use your name, role, school, subjects, and education level.'],
              ['learning', 'Modules and progress', 'Use enrolled modules, lessons, quizzes, exams, and progress signals.'],
              ['documents', 'Document library', 'Read authorized document titles and excerpts to summarize or analyze them.'],
              ['teams', 'Liv Teams', 'Use teams you belong to, member-safe summaries, and team resources.'],
              ['projects', 'Projects and tasks', 'Use authorized team projects, task status, and project descriptions.'],
              ['funds', 'LivFund campaigns', 'Use campaigns you own or are authorized to manage; financial actions still require confirmation.'],
              ['marketplace', 'LivMart listings', 'Use authorized team listings and project resources; no purchases are made automatically.'],
              ['chats', 'Hanna conversation index', 'Use your Hanna conversation titles and counts for continuity.'],
              ['autoAnalyze', 'Analyze enabled content automatically', 'When enabled, Hanna may proactively use selected documents and learning context when relevant.'],
            ] as const).map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium">{label}</p><p className="text-sm text-gray-600 dark:text-gray-400">{description}</p></div><Switch checked={hannaPersonalization[key]} onCheckedChange={checked => setHannaPersonalization(prev => ({ ...prev, [key]: checked }))} /></div>)}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Toggle between light and dark theme
                  </p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications about courses and announcements
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive email updates about your account
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Sound Effects</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Play sounds for notifications and actions
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/70 dark:border-red-900/50">
          <CardHeader><CardTitle>Account access</CardTitle></CardHeader>
          <CardContent><Button variant="outline" className="w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => setShowLogoutConfirm(true)}><LogOut className="w-4 h-4 mr-2" /> Log out of Liverton</Button></CardContent>
        </Card>
      </main>
      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
    </div>
  );
}
