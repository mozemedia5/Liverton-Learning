import { useState, useRef } from 'react';
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
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Profile() {
  const navigate = useNavigate();
  const { userData, userRole, updateUserProfile, changePassword, deleteAccount } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(userData?.profileImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
  
  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    address: userData?.address || '',
    bio: userData?.bio || '',
  });

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
      // Create a unique filename using timestamp and user ID
      const timestamp = Date.now();
      const fileName = `profile-${userData?.uid}-${timestamp}`;
      const storageRef = ref(storage, `profile-images/${fileName}`);

      // Upload file to Firebase Storage
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      
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
      navigate('/login');
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
          <Button 
            variant={isEditing ? 'default' : 'outline'}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              <><Save className="w-4 h-4 mr-2" /> Save</>
            ) : (
              <><Edit2 className="w-4 h-4 mr-2" /> Edit</>
            )}
          </Button>
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
              <Label htmlFor="bio">Bio</Label>
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
  );
}
