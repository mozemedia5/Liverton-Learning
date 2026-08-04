import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  CloudUpload,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Tag,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { createEvent, type EventCategory, type EventVisibility } from '@/services/eventService';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { SEO } from '@/components/SEO';

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'class', label: 'Class / Lesson' },
  { value: 'exam', label: 'Exam / Test' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' },
];

/**
 * CreateEvent - mobile-app style event creation form:
 * image upload, title, description, date, time, location, category and
 * visibility, finished with a full-width "Create Event" button.
 */
export default function CreateEvent() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name));
      setImageUrl(url);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Event image upload failed:', error);
      toast.error('Image upload failed. You can create the event without it.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser?.uid) {
      toast.error('You must be signed in to create an event');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (!category) {
      toast.error('Please select a category');
      return;
    }

    setSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        date,
        time,
        location: location.trim(),
        category,
        visibility,
        createdBy: currentUser.uid,
        creatorName: userData?.fullName || '',
        creatorRole: userRole || undefined,
        schoolId: (userData as { schoolId?: string } | null)?.schoolId ?? null,
        attendees: [],
      });
      toast.success('Event created successfully');
      navigate('/events');
    } catch (error) {
      console.error('Failed to create event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <SEO title="Create Event" description="Create a new event on Liverton Learning" />
      <div className="max-w-xl mx-auto pb-8">
        {/* Top bar: back, title, cancel */}
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Create Event</h1>
          <button
            onClick={() => navigate('/events')}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Upload Image */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors overflow-hidden relative"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </>
              ) : imageUrl ? (
                <>
                  <img src={imageUrl} alt="Event cover" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold flex items-center gap-1">
                    <CloudUpload className="w-3.5 h-3.5" /> Change
                  </span>
                </>
              ) : (
                <>
                  <span className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                  </span>
                  <span className="text-sm font-semibold">Upload Image</span>
                  <span className="text-xs text-slate-400">Tap to add an event cover photo</span>
                </>
              )}
            </button>
          </div>

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Event Title
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event Title"
              className="h-12 rounded-xl bg-white dark:bg-slate-900"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event..."
              className="min-h-[110px] rounded-xl bg-white dark:bg-slate-900 resize-none"
              maxLength={1000}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-date" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-slate-400" /> Date
              </Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> Time
              </Label>
              <Input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event-location" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" /> Location
            </Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="h-12 rounded-xl bg-white dark:bg-slate-900"
              maxLength={160}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-slate-400" /> Category
            </Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as EventVisibility)}
              className="grid grid-cols-3 gap-2"
            >
              <label
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  visibility === 'public'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                <Globe2 className={`w-5 h-5 ${visibility === 'public' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold ${visibility === 'public' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                  Public
                </span>
              </label>
              <label
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  visibility === 'school'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value="school" className="sr-only" />
                <Users className={`w-5 h-5 ${visibility === 'school' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold ${visibility === 'school' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                  My School
                </span>
              </label>
              <label
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  visibility === 'private'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value="private" className="sr-only" />
                <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold ${visibility === 'private' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                  Private
                </span>
              </label>
            </RadioGroup>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploadingImage}
            className="w-full h-13 py-6 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
