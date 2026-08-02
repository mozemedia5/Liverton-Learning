import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Folder, FileText, Search, Plus, Trash2, Download,
  BookOpen, FolderClosed, File, ChevronRight, UploadCloud
} from 'lucide-react';
import { uploadTeamFile, getTeamFiles, deleteTeamFile } from '@/services/livTeamsProjectService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import type { TeamFolderFile, TeamRole } from '@/types/livTeams';

interface ResourcesProps {
  teamId: string;
  teamRole: TeamRole;
}

const FOLDERS = [
  'Notes', 'Assignments', 'Research', 'Presentations',
  'Resources', 'Books', 'Reports', 'Previous Papers'
] as const;

export default function TeamWorkspaceResources({ teamId, teamRole }: ResourcesProps) {
  const { currentUser, userData } = useAuth();

  const [files, setFiles] = useState<TeamFolderFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<typeof FOLDERS[number] | 'All'>('Notes');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [teamId]);

  const loadFiles = async () => {
    if (!teamId) return;
    try {
      const allFiles = await getTeamFiles(teamId);
      setFiles(allFiles);
    } catch (error) {
      console.error('Error fetching team files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser || activeFolder === 'All') return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const secureUrl = await uploadToCloudinary(file, 'document');

      await uploadTeamFile(teamId, {
        name: file.name,
        url: secureUrl,
        type: file.type || 'application/octet-stream',
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        folder: activeFolder
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success(`Uploaded ${file.name} to ${activeFolder}`);
      loadFiles();
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!currentUser) return;
    const ok = window.confirm('Delete this resource permanently?');
    if (!ok) return;

    try {
      await deleteTeamFile(teamId, fileId, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('File deleted');
      loadFiles();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const folderMatches = activeFolder === 'All' ? true : f.folder === activeFolder;
      const searchMatches = searchQuery.trim() === '' ? true : f.name.toLowerCase().includes(searchQuery.toLowerCase());
      return folderMatches && searchMatches;
    });
  }, [files, activeFolder, searchQuery]);

  const isGuest = teamRole === 'guest';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Shared Resource Library</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search note packets, previous exams, coding sheets, homework sheets, and presentation slides.
          </p>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-10 pr-4 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Folders navigation list */}
        <div className="space-y-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Folders</span>
          <Button
            variant="outline"
            className={`w-full justify-start rounded-xl text-xs py-2 px-3 border ${activeFolder === 'All' ? 'bg-emerald-500 text-white' : ''}`}
            onClick={() => setActiveFolder('All')}
          >
            <FolderClosed className="w-4 h-4 mr-2" /> All Folders
          </Button>
          {FOLDERS.map(folder => (
            <Button
              key={folder}
              variant="outline"
              className={`w-full justify-start rounded-xl text-xs py-2 px-3 border ${activeFolder === folder ? 'bg-emerald-500 text-white' : ''}`}
              onClick={() => setActiveFolder(folder)}
            >
              <Folder className="w-4 h-4 mr-2 text-amber-500" /> {folder}
            </Button>
          ))}
        </div>

        {/* Files Directory content area */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  Files inside: <span className="text-emerald-500 capitalize">{activeFolder}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {filteredFiles.length} files currently stored in this category.
                </CardDescription>
              </div>

              {!isGuest && activeFolder !== 'All' && (
                <label className="cursor-pointer">
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  <div className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1">
                    <UploadCloud className="w-4 h-4" /> Upload Document
                  </div>
                </label>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  This folder is currently empty. Start uploading relevant assets.
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate max-w-md">{file.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Uploaded by {file.uploadedByName} • {file.size}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <Button size="xs" variant="outline" className="rounded-lg text-xs py-1 px-3">
                            <Download className="w-3.5 h-3.5 mr-1" /> Get Document
                          </Button>
                        </a>
                        {(file.uploadedBy === currentUser?.uid || teamRole === 'owner' || teamRole === 'admin') && (
                          <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg text-red-500" onClick={() => handleDeleteFile(file.id)}>
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
