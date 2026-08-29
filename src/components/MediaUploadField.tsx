import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadToCloudinary, mapFileToCloudinaryType, type CloudinaryUploadType } from '@/services/cloudinaryService';
import { ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, AlertCircle } from 'lucide-react';

interface MediaUploadFieldProps {
  /** Field label shown above the widget */
  label: string;
  /** Helper text shown under the label */
  description?: string;
  /** Current uploaded media URL (controlled) */
  value?: string;
  /** Called with the media URL on success, or '' when removed */
  onChange: (url: string) => void;
  /** Force a specific upload classification; default: auto-detect from file */
  uploadType?: CloudinaryUploadType;
  /** Accepted file types (default 'image/*') */
  accept?: string;
  /** Max file size in MB (default 10) */
  maxSizeMB?: number;
  /** Aspect ratio of the preview box, e.g. '1/1', '3/1' */
  previewAspect?: string;
  disabled?: boolean;
  /** Notified when an upload starts/finishes (useful to gate form navigation) */
  onUploadingChange?: (uploading: boolean) => void;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

const MAX_SIZE_DEFAULT_MB = 10;

/**
 * Professional media upload field with instant preview, real upload
 * progress, graceful failure handling and retry. Internal upload
 * details (endpoints, presets, delivery URLs) are never exposed in the UI.
 */
export function MediaUploadField({
  label,
  description,
  value,
  onChange,
  uploadType,
  accept = 'image/*',
  maxSizeMB = MAX_SIZE_DEFAULT_MB,
  previewAspect = '3/1',
  disabled = false,
  onUploadingChange,
}: MediaUploadFieldProps) {
  const [state, setState] = useState<UploadState>(value ? 'done' : 'idle');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>(value || '');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  // Keep the widget in sync if the parent resets the value
  useEffect(() => {
    if (!value && state === 'done') {
      setState('idle');
      setPreviewUrl('');
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startUpload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      setState('error');
      return;
    }

    lastFileRef.current = file;
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setState('uploading');
    setProgress(0);
    setErrorMessage('');
    onUploadingChange?.(true);

    try {
      const type = uploadType || mapFileToCloudinaryType(file, file.name);
      const url = await uploadToCloudinary(file, type, {
        showErrorToast: false,
        onProgress: (percent) => setProgress(percent),
      });
      setPreviewUrl(url);
      setState('done');
      onChange(url);
    } catch (error) {
      console.error('Media upload failed:', error);
      setState('error');
      setErrorMessage('Upload failed. Check your connection and try again.');
    } finally {
      onUploadingChange?.(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    startUpload(file);
  };

  const handleRetry = () => {
    if (lastFileRef.current) {
      startUpload(lastFileRef.current);
    } else {
      setState('idle');
    }
  };

  const handleRemove = () => {
    lastFileRef.current = null;
    setState('idle');
    setProgress(0);
    setErrorMessage('');
    setPreviewUrl('');
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>

      {/* Idle / error: picker trigger */}
      {(state === 'idle' || state === 'error') && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'w-full rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 transition-colors text-center',
              'border-gray-200 dark:border-white/10 hover:border-emerald-500/60 hover:bg-emerald-500/5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tap to choose a file</p>
              <p className="text-xs text-slate-400 mt-0.5">Up to {maxSizeMB}MB — optimized automatically</p>
            </div>
          </button>
          {state === 'error' && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2">
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errorMessage}
              </p>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-red-600 dark:text-red-400" onClick={handleRetry}>
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Uploading: preview + progress */}
      {state === 'uploading' && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="relative w-full bg-slate-100 dark:bg-slate-900" style={{ aspectRatio: previewAspect }}>
            {previewUrl && (
              <img src={previewUrl} alt="Upload preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <p className="text-sm font-semibold text-white">Uploading… {progress}%</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800">
            <div className="h-1.5 bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Done: preview + actions */}
      {state === 'done' && previewUrl && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="relative w-full bg-slate-100 dark:bg-slate-900" style={{ aspectRatio: previewAspect }}>
            <img src={previewUrl} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs rounded-lg bg-white/90 hover:bg-white text-slate-700"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                <UploadCloud className="w-3 h-3 mr-1" /> Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs rounded-lg bg-white/90 hover:bg-white text-red-500"
                onClick={handleRemove}
                disabled={disabled}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
