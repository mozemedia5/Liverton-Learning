import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { User, Mail, Phone, MapPin, Briefcase, Award, Settings, Upload, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  phone: string;
  location: string;
  occupation: string;
  education: string;
  skills: string[];
  achievements: Achievement[];
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string;
}

export default function ProfileSystem() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    phone: '',
    location: '',
    occupation: '',
    education: '',
    skills: '',
    twitter: '',
    linkedin: '',
    github: '',
  });

  useEffect(() => {
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  const loadProfile = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'profiles', currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setFormData({
          displayName: data.displayName || '',
          bio: data.bio || '',
          phone: data.phone || '',
          location: data.location || '',
          occupation: data.occupation || '',
          education: data.education || '',
          skills: data.skills?.join(', ') || '',
          twitter: data.socialLinks?.twitter || '',
          linkedin: data.socialLinks?.linkedin || '',
          github: data.socialLinks?.github || '',
        });
      } else {
        // Create default profile
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          bio: '',
          phone: '',
          location: '',
          occupation: '',
          education: '',
          skills: [],
          achievements: [],
          socialLinks: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!currentUser || !photoFile) return;

    try {
      setUploadingPhoto(true);
      const storageRef = ref(storage, `profiles/${currentUser.uid}/photo`);
      await uploadBytes(storageRef, photoFile);
      const photoURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'profiles', currentUser.uid), {
        photoURL,
        updatedAt: Timestamp.now(),
      });

      setProfile(prev => prev ? { ...prev, photoURL } : null);
      setPhotoFile(null);
      setPhotoPreview('');
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'profiles', currentUser.uid), {
        photoURL: '',
        updatedAt: Timestamp.now(),
      });

      setProfile(prev => prev ? { ...prev, photoURL: '' } : null);
      setDeletePhotoConfirm(false);
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    try {
      const skills = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      await updateDoc(doc(db, 'profiles', currentUser.uid), {
        displayName: formData.displayName,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        occupation: formData.occupation,
        education: formData.education,
        skills,
        socialLinks: {
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          github: formData.github,
        },
        updatedAt: Timestamp.now(),
      });

      setProfile(prev => prev ? {
        ...prev,
        displayName: formData.displayName,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        occupation: formData.occupation,
        education: formData.education,
        skills,
        socialLinks: {
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          github: formData.github,
        },
      } : null);

      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Failed to load profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your profile information and settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Photo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                      />
                    ) : profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Upload Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                    </div>

                    <div className="flex gap-2">
                      {photoFile && (
                        <>
                          <Button
                            onClick={handleUploadPhoto}
                            disabled={uploadingPhoto}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingPhoto ? 'Uploading...' : 'Upload'}
                          </Button>
                          <Button
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview('');
                            }}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      {profile.photoURL && !photoFile && (
                        <Button
                          onClick={() => setDeletePhotoConfirm(true)}
                          variant="destructive"
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Delete Photo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Basic Information</CardTitle>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? 'destructive' : 'outline'}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Display Name</label>
                      <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Bio</label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us about yourself"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Location</label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Occupation</label>
                        <Input
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          placeholder="Your job title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Education</label>
                        <Input
                          value={formData.education}
                          onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                          placeholder="Your education"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Skills (comma-separated)</label>
                      <Input
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        placeholder="e.g., JavaScript, React, Node.js"
                      />
                    </div>

                    <Button onClick={handleSaveProfile} className="w-full gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Display Name</p>
                        <p className="font-semibold">{profile.displayName || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold">{profile.email}</p>
                      </div>
                    </div>

                    {profile.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-semibold">{profile.phone}</p>
                        </div>
                      </div>
                    )}

                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-semibold">{profile.location}</p>
                        </div>
                      </div>
                    )}

                    {profile.occupation && (
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Occupation</p>
                          <p className="font-semibold">{profile.occupation}</p>
                        </div>
                      </div>
                    )}

                    {profile.bio && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Bio</p>
                        <p className="text-gray-700">{profile.bio}</p>
                      </div>
                    )}

                    {profile.skills.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill) => (
                            <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Twitter</label>
                    <Input
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      placeholder="https://twitter.com/username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">LinkedIn</label>
                    <Input
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">GitHub</label>
                    <Input
                      value={formData.github}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="https://github.com/username"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your earned badges and accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                {profile.achievements.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No achievements yet. Keep learning!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.achievements.map((achievement) => (
                      <div key={achievement.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <Award className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold">{achievement.title}</h3>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            <p className="text-xs text-gray-500 mt-2">{achievement.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Account Created</p>
                  <p className="font-semibold">{new Date(profile.createdAt.toMillis()).toLocaleDateString()}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Last Updated</p>
                  <p className="font-semibold">{new Date(profile.updatedAt.toMillis()).toLocaleDateString()}</p>
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <Settings className="w-4 h-4" />
                  More Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Photo Confirmation */}
        <AlertDialog open={deletePhotoConfirm} onOpenChange={setDeletePhotoConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Photo</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your profile photo? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePhoto} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
