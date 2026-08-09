import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus, CalendarDays, DollarSign, Trash2,
  CheckCircle2, Circle, ListTodo, FolderKanban, Loader2
} from 'lucide-react';
import {
  createTeamProject,
  getTeamProjects,
  deleteTeamProject,
  updateTeamProject,
  createTeamTask,
  getTeamTasks,
  updateTeamTask
} from '@/services/livTeamsProjectService';
import type { TeamProject, TeamTask, TeamRole, TeamMember, ProjectStatus } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader } from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';

interface ProjectsProps {
  teamId: string;
  teamRole: TeamRole;
  members: TeamMember[];
}

const projectStatuses: ProjectStatus[] = ['Idea', 'Planning', 'Active', 'Testing', 'Review', 'Completed', 'Archived'];

const statusStyles: Record<ProjectStatus, string> = {
  Idea: 'bg-slate-500/10 text-slate-500 border-0',
  Planning: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0',
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0',
  Testing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0',
  Review: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0',
  Completed: 'bg-emerald-500 text-white border-0',
  Archived: 'bg-slate-500/10 text-slate-400 border-0',
};

export default function TeamWorkspaceProjects({ teamId, teamRole, members }: ProjectsProps) {
  const { currentUser, userData } = useAuth();

  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [activeProject, setActiveProject] = useState<TeamProject | null>(null);
  const [loading, setLoading] = useState(true);

  const [projectModalOpen, setProjectOpen] = useState(false);
  const [taskModalOpen, setTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Project form state
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projBudget, setProjBudget] = useState(0);
  const [projTimeline, setProjTimeline] = useState('');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);

  // Checklist input
  const [checkText, setCheckText] = useState('');

  useEffect(() => {
    loadProjectsAndTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadProjectsAndTasks = async () => {
    if (!teamId) return;
    try {
      const [projs, tks] = await Promise.all([getTeamProjects(teamId), getTeamTasks(teamId)]);
      setProjects(projs);
      setTasks(tks);
      setActiveProject(prev => {
        if (prev) return projs.find(p => p.id === prev.id) || projs[0] || null;
        return projs[0] || null;
      });
    } catch (error) {
      console.error('Error loading projects/tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !projName.trim()) return;
    setSaving(true);
    try {
      await createTeamProject(teamId, {
        name: projName.trim(),
        description: projDesc.trim(),
        category: 'General',
        budget: projBudget || 0,
        timeline: projTimeline.trim(),
        status: 'Planning',
        progress: 0,
        members: []
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success('Project created');
      setProjectOpen(false);
      setProjName('');
      setProjDesc('');
      setProjBudget(0);
      setProjTimeline('');
      loadProjectsAndTasks();
    } catch {
      toast.error('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser) return;
    const ok = window.confirm('Delete this project? Its tasks will remain in the archive but the project board is removed.');
    if (!ok) return;
    try {
      await deleteTeamProject(teamId, projectId, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Project deleted');
      if (activeProject?.id === projectId) setActiveProject(null);
      loadProjectsAndTasks();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, nextStatus: ProjectStatus) => {
    if (!currentUser) return;
    try {
      await updateTeamProject(teamId, projectId, { status: nextStatus }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success(`Project moved to ${nextStatus}`);
      loadProjectsAndTasks();
    } catch {
      toast.error('Failed to change status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeProject || !taskTitle.trim()) return;
    setSaving(true);
    try {
      await createTeamTask(teamId, activeProject.id, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        deadline: taskDeadline,
        priority: taskPriority,
        assignedMembers: taskAssignees,
        checklist: [],
        comments: [],
        progress: 0,
        isCompleted: false
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      if (taskAssignees.length > 0) {
        toast.success(`Task assigned to ${taskAssignees.length} member${taskAssignees.length > 1 ? 's' : ''}`);
      } else {
        toast.success('Task created');
      }
      setTaskOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDeadline('');
      setTaskPriority('medium');
      setTaskAssignees([]);
      loadProjectsAndTasks();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTaskCompletion = async (task: TeamTask) => {
    if (!currentUser) return;
    try {
      const isCompleted = !task.isCompleted;
      const progress = isCompleted ? 100 : 0;
      await updateTeamTask(teamId, task.id, { isCompleted, progress }, currentUser.uid, teamRole);
      toast.success(isCompleted ? 'Task completed. Great work!' : 'Task reopened');
      loadProjectsAndTasks();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update task';
      toast.error(msg);
    }
  };

  const handleAddChecklistItem = async (task: TeamTask) => {
    if (!currentUser || !checkText.trim()) return;
    try {
      const items = [...(task.checklist || []), {
        id: Math.random().toString(36).substring(2, 9),
        text: checkText.trim(),
        isCompleted: false
      }];
      await updateTeamTask(teamId, task.id, { checklist: items }, currentUser.uid, teamRole);
      setCheckText('');
      loadProjectsAndTasks();
    } catch {
      toast.error('Failed to add checklist item');
    }
  };

  const handleToggleChecklistItem = async (task: TeamTask, itemId: string) => {
    if (!currentUser) return;
    try {
      const items = task.checklist.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      );
      const completedCount = items.filter(i => i.isCompleted).length;
      const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
      const isCompleted = items.length > 0 && progress === 100;
      await updateTeamTask(teamId, task.id, { checklist: items, progress, isCompleted }, currentUser.uid, teamRole);
      loadProjectsAndTasks();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error updating checklist';
      toast.error(msg);
    }
  };

  const currentProjectTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter(t => t.projectId === activeProject.id);
  }, [tasks, activeProject]);

  const computedProgress = useMemo(() => {
    if (!activeProject) return 0;
    if (currentProjectTasks.length === 0) return activeProject.progress || 0;
    const total = currentProjectTasks.reduce((sum, t) => sum + (t.progress || (t.isCompleted ? 100 : 0)), 0);
    return Math.round(total / currentProjectTasks.length);
  }, [activeProject, currentProjectTasks]);

  const assigneeNames = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => { map[m.userId] = m.fullName; });
    return map;
  }, [members]);

  const isGuest = teamRole === 'guest';
  const isPMOrAbove = ['owner', 'admin', 'project_manager'].includes(teamRole);

  const canModifyTask = (task: TeamTask) => {
    if (isGuest) return false;
    if (isPMOrAbove) return true;
    if (task.assignedMembers && task.assignedMembers.length > 0) {
      return task.assignedMembers.includes(currentUser?.uid || '');
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <LivSectionHeader title="Projects & Tasks" subtitle="Plan work, assign deliverables and track completion.">
        {isPMOrAbove && (
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setProjectOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Project
          </Button>
        )}
      </LivSectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Projects list */}
        <div className="space-y-3 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
            Projects ({projects.length})
          </span>
          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No projects yet.</p>
          ) : (
            <div className="space-y-2">
              {projects.map(proj => (
                <button
                  key={proj.id}
                  onClick={() => setActiveProject(proj)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    activeProject?.id === proj.id
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{proj.name}</p>
                      <p className="text-[11px] text-slate-400">{tasks.filter(t => t.projectId === proj.id).length} tasks</p>
                    </div>
                    <Badge className={`text-[10px] capitalize flex-shrink-0 ${statusStyles[proj.status] || statusStyles.Idea}`}>
                      {proj.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active project detail */}
        <div className="lg:col-span-3">
          {!activeProject ? (
            <LivEmptyState
              icon={<FolderKanban className="w-6 h-6" />}
              title={projects.length === 0 ? 'No projects yet' : 'Select a project'}
              description={projects.length === 0
                ? isPMOrAbove ? 'Create your first project to organize tasks and deliverables.' : 'Projects created by project managers will appear here.'
                : 'Choose a project from the list to review its tasks.'}
            >
              {projects.length === 0 && isPMOrAbove && (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setProjectOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Create Project
                </Button>
              )}
            </LivEmptyState>
          ) : (
            <Card>
              <CardHeader className="border-b border-gray-100 dark:border-white/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold truncate">{activeProject.name}</CardTitle>
                    <Badge className={`capitalize ${statusStyles[activeProject.status] || statusStyles.Idea}`}>
                      {activeProject.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm mt-1">{activeProject.description || 'No description provided.'}</CardDescription>
                </div>
                {isPMOrAbove && (
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Select value={activeProject.status} onValueChange={(val) => handleUpdateProjectStatus(activeProject.id, val as ProjectStatus)}>
                      <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projectStatuses.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setTaskOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteProject(activeProject.id)} aria-label="Delete project">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 md:p-6 space-y-6">
                {/* Project meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-sm">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget</p>
                    <p className="font-bold">{formatUGX(activeProject.budget || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Timeline</p>
                    <p className="font-bold">{activeProject.timeline || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1"><ListTodo className="w-3 h-3" /> Tasks</p>
                    <p className="font-bold">{currentProjectTasks.filter(t => t.isCompleted).length}/{currentProjectTasks.length} done</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${computedProgress}%` }} />
                      </div>
                      <span className="text-xs font-bold">{computedProgress}%</span>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                    <ListTodo className="w-4 h-4 text-emerald-500" /> Deliverables & Tasks
                  </h4>

                  {currentProjectTasks.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No tasks defined for this project yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentProjectTasks.map(task => (
                        <Card key={task.id} className="flex flex-col justify-between">
                          <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`font-semibold text-sm ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Due: {task.deadline || 'No deadline'}</p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] uppercase flex-shrink-0 ${
                                task.priority === 'critical' ? 'border-red-500 text-red-500' :
                                task.priority === 'high' ? 'border-amber-500 text-amber-500' :
                                task.priority === 'medium' ? 'border-blue-400 text-blue-500' : 'border-slate-300 text-slate-400'
                              }`}>
                                {task.priority}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-3 flex-1 text-sm">
                            {task.description && <p className="text-slate-500 dark:text-slate-400 text-xs">{task.description}</p>}

                            {(task.assignedMembers || []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.assignedMembers.map(uid => (
                                  <Badge key={uid} variant="secondary" className="text-[10px] py-0 px-1.5">
                                    {assigneeNames[uid] || 'Member'}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {(task.checklist || []).length > 0 && (
                              <div className="space-y-1.5">
                                {task.checklist.map(item => {
                                  const canEdit = canModifyTask(task);
                                  return (
                                    <div key={item.id} className="flex items-center gap-2 text-xs">
                                      {canEdit ? (
                                        <button onClick={() => handleToggleChecklistItem(task, item.id)} aria-label={item.isCompleted ? 'Reopen item' : 'Complete item'}>
                                          {item.isCompleted
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                                        </button>
                                      ) : (
                                        <span className="cursor-default">
                                          {item.isCompleted
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                                        </span>
                                      )}
                                      <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>{item.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {task.progress > 0 && task.progress < 100 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${task.progress}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{task.progress}%</span>
                              </div>
                            )}
                          </CardContent>

                          {!isGuest && (
                            <CardFooter className="p-3 border-t border-gray-100 dark:border-white/5 flex flex-col gap-2">
                              {canModifyTask(task) ? (
                                <>
                                  <div className="flex gap-1.5 w-full">
                                    <Input
                                      placeholder="Add checklist item..."
                                      className="h-8 text-xs rounded-lg"
                                      value={checkText}
                                      onChange={e => setCheckText(e.target.value)}
                                    />
                                    <Button size="sm" onClick={() => handleAddChecklistItem(task)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8" disabled={!checkText.trim()}>
                                      Add
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`w-full text-xs font-semibold ${task.isCompleted ? 'text-amber-500' : 'text-emerald-500'}`}
                                    onClick={() => handleToggleTaskCompletion(task)}
                                  >
                                    {task.isCompleted ? 'Reopen Task' : 'Mark as Completed'}
                                  </Button>
                                </>
                              ) : (
                                <div className="text-center py-1 text-slate-400 text-xs w-full">
                                  🔒 Read-only. Assigned members or PMs can fulfill this task.
                                </div>
                              )}
                            </CardFooter>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create project dialog */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Define the goal, budget and timeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="projName">Project Name *</Label>
              <Input id="projName" value={projName} onChange={e => setProjName(e.target.value)} placeholder="e.g. Science Fair Presentation" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projDesc">Description</Label>
              <Textarea id="projDesc" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="What are the deliverables?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projBudget">Budget (UGX)</Label>
                <Input type="number" min={0} id="projBudget" value={projBudget} onChange={e => setProjBudget(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projTimeline">Timeline</Label>
                <Input id="projTimeline" value={projTimeline} onChange={e => setProjTimeline(e.target.value)} placeholder="e.g. 2 weeks" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProjectOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create task dialog */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Assign a deliverable inside {activeProject?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input id="taskTitle" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDesc">Description</Label>
              <Textarea id="taskDesc" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskDeadline">Deadline</Label>
                <Input id="taskDeadline" type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskPriority">Priority</Label>
                <Select value={taskPriority} onValueChange={(val) => setTaskPriority(val as TeamTask['priority'])}>
                  <SelectTrigger id="taskPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to members</Label>
                <div className="max-h-36 overflow-y-auto space-y-2 rounded-xl border border-gray-200 dark:border-white/10 p-3">
                  {members.map(m => (
                    <label key={m.userId} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={taskAssignees.includes(m.userId)}
                        onCheckedChange={(checked) => {
                          setTaskAssignees(prev =>
                            checked ? [...prev, m.userId] : prev.filter(id => id !== m.userId)
                          );
                        }}
                      />
                      <span className="truncate">{m.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
