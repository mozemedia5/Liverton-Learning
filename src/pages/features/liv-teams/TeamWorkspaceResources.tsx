import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Folder, FileText, Search, Trash2, Download,
  FolderOpen, UploadCloud, FileImage, FileVideo, FileAudio, FileArchive, File as FileIcon, Loader2
} from 'lucide-react';
import { uploadTeamFile, getTeamFiles, deleteTeamFile } from '@/services/livTeamsProjectService';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import type { TeamFolderFile, TeamRole } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader } from './livTeamsUi';

interface ResourcesProps {
  teamId: string;
  teamRole: TeamRole;
}

const FOLDERS = [
  'Notes', 'Assignments', 'Research', 'Presentations',
  'Resources', 'Books', 'Reports', 'Previous Papers'
] as const;

function fileIconFor(name: string, mime: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/')) return <FileImage className="w-5 h-5" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-5 h-5" />;
  if (mime.startsWith('audio/')) return <FileAudio className="w-5 h-5" />;
  if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-5 h-5" />;
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return <FileText className="w-5 h-5" />;
  return <FileIcon className="w-5 h-5" />;
}

export default function TeamWorkspaceResources({ teamId, teamRole }: ResourcesProps) {
  const { currentUser, userData } = useAuth();

  const [files, setFiles] = useState<TeamFolderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<typeof FOLDERS[number] | 'All'>('All');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadFiles = async () => {
    if (!teamId) return;
    try {
      const allFiles = await getTeamFiles(teamId);
      setFiles(allFiles);
    } catch (error) {
      console.error('Error fetching team files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser || activeFolder === 'All') return;
    const file = e.target.files[0];
    e.target.value = '';
    setUploading(true);
    try {
      // Upload through the correct existing Cloudinary preset for the file type
      const secureUrl = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name));

      await uploadTeamFile(teamId, {
        name: file.name,
        url: secureUrl,
        type: file.type || 'application/octet-stream',
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        folder: activeFolder
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success(`Uploaded ${file.name} to ${activeFolder}`);
      loadFiles();
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!currentUser) return;
    const ok = window.confirm('Delete this file permanently?');
    if (!ok) return;
    try {
      await deleteTeamFile(teamId, fileId, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('File deleted');
      loadFiles();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { All: files.length };
    FOLDERS.forEach(f => { counts[f] = 0; });
    files.forEach(f => { counts[f.folder] = (counts[f.folder] || 0) + 1; });
    return counts;
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const folderMatches = activeFolder === 'All' || f.folder === activeFolder;
      const q = searchQuery.trim().toLowerCase();
      const searchMatches = !q || f.name.toLowerCase().includes(q) || (f.uploadedByName || '').toLowerCase().includes(q);
      return folderMatches && searchMatches;
    });
  }, [files, activeFolder, searchQuery]);

  const isGuest = teamRole === 'guest';
  const canDelete = (file: TeamFolderFile) =>
    file.uploadedBy === currentUser?.uid || ['owner', 'admin', 'moderator'].includes(teamRole);

  return (
    <div className="space-y-6">
      <LivSectionHeader title="Shared Resource Library" subtitle="Notes, past papers, research, slides and books shared by the team.">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="pl-10 rounded-xl"
          />
        </div>
      </LivSectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Folders */}
        <div className="space-y-1.5 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Folders</span>
          {(['All', ...FOLDERS] as const).map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`w-full flex items-center justify-between rounded-xl text-sm py-2 px-3 border transition-colors ${
                activeFolder === folder
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white/60 dark:bg-slate-900/60 border-gray-200 dark:border-white/10 hover:border-emerald-500/50 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {activeFolder === folder
                  ? <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  : <Folder className={`w-4 h-4 flex-shrink-0 ${folder === 'All' ? '' : 'text-amber-500'}`} />}
                <span className="truncate">{folder === 'All' ? 'All Files' : folder}</span>
              </span>
              <span className={`text-xs ${activeFolder === folder ? 'text-white/80' : 'text-slate-400'}`}>
                {folderCounts[folder] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Files list */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5 flex flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold">
                  {activeFolder === 'All' ? 'All Files' : activeFolder}
                </CardTitle>
                <CardDescription className="text-xs">
                  {filteredFiles.length} file{filteredFiles.length === 1 ? '' : 's'} in this view
                </CardDescription>
              </div>

              {!isGuest && activeFolder !== 'All' && (
                <label className={`cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  <div className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </div>
                </label>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-12">Loading files...</p>
              ) : filteredFiles.length === 0 ? (
                <div className="p-6">
                  <LivEmptyState
                    icon={<Folder className="w-6 h-6" />}
                    title={searchQuery ? 'No files match your search' : 'This folder is empty'}
                    description={activeFolder === 'All'
                      ? 'Select a specific folder to upload the first team file.'
                      : !isGuest ? 'Upload the first file to this folder using the button above.' : 'Files uploaded by the team will appear here.'}
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                          {fileIconFor(file.name, file.type || '')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{file.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {file.uploadedByName} • {file.size} • {file.folder}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="rounded-lg">
                            <Download className="w-3.5 h-3.5 mr-1" /> Open
                          </Button>
                        </a>
                        {canDelete(file) && (
                          <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteFile(file.id)} aria-label={`Delete ${file.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
