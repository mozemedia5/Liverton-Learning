import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  BookOpen, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone,
  MapPin,
  GraduationCap,
  School,
  Camera,
  Edit2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  ShieldAlert,
  Check,
  RefreshCw,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sendEmailVerification } from 'firebase/auth';
import { enhanceTextWithHanna } from '@/lib/hannaGemini';
import { Sparkles } from 'lucide-react';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { SEO } from '@/components/SEO';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole, updateUserProfile, changePassword, deleteAccount, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(userData?.profileImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Email verification state
  const isMockUser = currentUser?.email === 'mock@liverton.com';
  const [isEmailVerified, setIsEmailVerified] = useState(currentUser?.emailVerified || false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (verificationCooldown > 0) {
      const timer = setTimeout(() => setVerificationCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [verificationCooldown]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); toast.success('You are signed out'); navigate('/login'); }
    catch { toast.error('Could not sign out'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;
    setIsCheckingVerification(true);
    try {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        setIsEmailVerified(true);
        toast.success('🎉 Your email has been successfully verified!');
      } else {
        toast.error('✉️ Email not verified yet. Please check your inbox or spam folder.');
      }
    } catch (error: any) {
      console.error('Error checking verification status:', error);
      toast.error('Failed to check status: ' + (error.message || 'unknown error'));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;
    if (verificationCooldown > 0) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success('✉️ Verification email sent! Please check your inbox.');
      setVerificationCooldown(60);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to resend: ' + (error.message || 'unknown error'));
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete Account State
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Hanna Custom Instructions State
  const [hannaInstructions, setHannaInstructions] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      const saved = localStorage.getItem(`hanna_instructions_${currentUser.uid}`) || '';
      setHannaInstructions(saved);
    }
  }, [currentUser]);

  const handleSaveHannaInstructions = () => {
    if (currentUser?.uid) {
      localStorage.setItem(`hanna_instructions_${currentUser.uid}`, hannaInstructions.trim());
      toast.success('🎉 Hanna AI custom instructions updated successfully!');
    }
  };
  
  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    address: userData?.address || '',
    bio: userData?.bio || '',
  });

  const [enhancingBio, setEnhancingBio] = useState(false);

  const handleEnhanceBioWithHanna = async () => {
    if (!formData.bio.trim()) {
      toast.info('Please draft a quick bio first!');
      return;
    }
    setEnhancingBio(true);
    try {
      const enhanced = await enhanceTextWithHanna(formData.bio, 'bio');
      setFormData(prev => ({ ...prev, bio: enhanced }));
      toast.success('✨ Bio enhanced with Hanna AI! Please review and save.');
    } catch {
      toast.error('Failed to enhance bio.');
    } finally {
      setEnhancingBio(false);
    }
  };

  /**
   * Handle profile image upload to Firebase Storage
   * Stores image in Firebase Storage and updates user profile with download URL
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Upload file to Cloudinary with 'image' preset
      const downloadUrl = await uploadToCloudinary(file, 'image');
      
      // Update user profile with image URL
      await updateUserProfile({
        profileImageUrl: downloadUrl,
      });

      setProfileImageUrl(downloadUrl);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingImage(false);
    }
  };

  /**
   * Handle saving profile changes to Firebase
   * Updates user data in Firestore with new information
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate required fields
      if (!formData.fullName.trim()) {
        toast.error('Full name is required');
        setIsSaving(false);
        return;
      }

      // Update user profile in Firebase
      await updateUserProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Get user initials for avatar fallback
   */
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  /**
   * Get role display name
   */
  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case 'student': return 'Student';
      case 'teacher': return 'Teacher';
      case 'school_admin': return 'School Administrator';
      case 'parent': return 'Parent';
      case 'platform_admin': return 'Platform Administrator';
      default: return 'User';
    }
  };

  /**
   * Handle password change
   */
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in before changing your password');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * Handle account deletion
   */
  const handleDeleteAccount = async () => {
    // Validation
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion');
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();
      toast.success('Account deleted successfully');
      navigate('/role-selection');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in before deleting your account');
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccount(false);
    }
  };

  return (
    <>
      <SEO title="Profile" description="Your Liverton Learning profile." noIndex />
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Profile</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings')}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            >
              <SettingsIcon className="w-4 h-4 mr-1.5" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(true)} className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"><LogOut className="w-4 h-4 mr-1.5" /> Log out</Button>
            <Button
              size="sm"
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
              className="rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <><Save className="w-4 h-4 mr-1.5" /> Save</>
              ) : (
                <><Edit2 className="w-4 h-4 mr-1.5" /> Edit Profile</>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  {profileImageUrl ? (
                    <AvatarImage src={profileImageUrl} alt={userData?.fullName} />
                  ) : null}
                  <AvatarFallback className="text-2xl">
                    {getInitials(userData?.fullName || 'U')}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-4 h-4 text-white dark:text-black animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white dark:text-black" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload profile picture"
                    />
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold mt-4">{userData?.fullName}</h2>
              <p className="text-gray-600 dark:text-gray-400">{getRoleDisplay(userRole)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Email Verification Banner */}
        {!isEmailVerified && !isMockUser && currentUser && (
          <Card className="border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 overflow-hidden shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-lg flex items-center gap-2">
                    Verify your email address
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    Your email <span className="font-semibold">{currentUser.email}</span> is not verified yet. Please check your inbox (and spam folder) for the verification email to secure your account.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Button
                      onClick={handleCheckVerification}
                      disabled={isCheckingVerification}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 px-4 font-semibold shadow-sm flex items-center gap-1.5 transition-all duration-200"
                    >
                      {isCheckingVerification ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Check Status
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleResendVerification}
                      disabled={isSendingVerification || verificationCooldown > 0}
                      variant="outline"
                      className="border-amber-200 hover:border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 rounded-xl text-xs h-9 px-4 font-semibold transition-all duration-200"
                    >
                      {isSendingVerification ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          Sending...
                        </>
                      ) : verificationCooldown > 0 ? (
                        `Resend in ${verificationCooldown}s`
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    disabled={!isEditing}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled={true}
                    className="pl-9 bg-gray-100 dark:bg-gray-900 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-9"
                    placeholder="Add phone number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    className="pl-9"
                    placeholder="Add address"
                  />
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio</Label>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={enhancingBio || !formData.bio.trim()}
                    onClick={handleEnhanceBioWithHanna}
                    className="h-7 text-[10px] text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 font-bold rounded-md px-2"
                  >
                    {enhancingBio ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                    )}
                    Generate with Hanna
                  </Button>
                )}
              </div>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                placeholder="Tell us about yourself"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Role-Specific Information */}
        {userRole === 'student' && (
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <School className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">School</p>
                    <p className="font-medium">{userData?.schoolName || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Education Level</p>
                    <p className="font-medium">{userData?.levelOfEducation || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userRole === 'teacher' && (
          <Card>
            <CardHeader>
              <CardTitle>Teaching Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <BookOpen className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subjects</p>
                    <p className="font-medium">{userData?.subjects?.join(', ') || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Experience</p>
                    <p className="font-medium">{userData?.experience || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Password Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Change Password</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Update your password to keep your account secure
                  </p>
                </div>
                <Button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  variant="outline"
                  className="border-black dark:border-white"
                >
                  {showChangePassword ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              {/* Change Password Form */}
              {showChangePassword && (
                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-900">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="w-full bg-black dark:bg-white text-white dark:text-black"
                  >
                    {isChangingPassword ? 'Changing Password...' : 'Confirm Change Password'}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4" />

            {/* Hanna AI Custom Instructions Section */}
            <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Hanna AI Personalization</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Provide custom instructions to guide how Hanna AI answers your prompts (e.g. your preparation goals, local Uganda syllabus references, or formatting preferences).
              </p>
              <textarea
                placeholder="e.g. Explain concepts with simple Uganda syllabus analogies and end with a quick 1-sentence hint."
                value={hannaInstructions}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHannaInstructions(e.target.value)}
                className="w-full p-4 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-100 mt-2 focus:border-emerald-500/50 outline-none transition-all"
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveHannaInstructions}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs h-9 px-4"
                >
                  Save Personalization
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4" />

            {/* Delete Account Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  onClick={() => setShowDeleteAccount(true)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <p className="font-semibold">
                Please type <span className="text-red-600 dark:text-red-400">DELETE</span> to confirm account deletion:
              </p>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmation('');
              setShowDeleteAccount(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingAccount ? 'Deleting...' : 'Confirm Deletion'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
