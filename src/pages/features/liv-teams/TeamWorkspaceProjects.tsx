import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Trophy, Plus, CalendarDays, DollarSign, Users, Trash2,
  CheckSquare, MessageSquare, CheckCircle2, Circle, ListTodo, MoreHorizontal
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
import type { TeamProject, TeamTask, TeamRole, ProjectStatus } from '@/types/livTeams';

interface ProjectsProps {
  teamId: string;
  teamRole: TeamRole;
}

export default function TeamWorkspaceProjects({ teamId, teamRole }: ProjectsProps) {
  const { currentUser, userData } = useAuth();

  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [activeProject, setActiveProject] = useState<TeamProject | null>(null);

  // Creation Modals loaders
  const [projectModalOpen, setProjectOpen] = useState(false);
  const [taskModalOpen, setTaskOpen] = useState(false);

  // Project forms state
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCategory, setProjCategory] = useState('Research');
  const [projBudget, setProjBudget] = useState(0);
  const [projTimeline, setProjTimeline] = useState('');

  // Task forms state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // New Checklist sub-item
  const [checkText, setCheckText] = useState('');

  useEffect(() => {
    loadProjectsAndTasks();
  }, [teamId]);

  const loadProjectsAndTasks = async () => {
    if (!teamId) return;
    try {
      const projs = await getTeamProjects(teamId);
      setProjects(projs);
      if (projs.length > 0 && !activeProject) {
        setActiveProject(projs[0]);
      } else if (activeProject) {
        const currentActive = projs.find(p => p.id === activeProject.id);
        if (currentActive) setActiveProject(currentActive);
      }

      const tks = await getTeamTasks(teamId);
      setTasks(tks);
    } catch (error) {
      console.error('Error loading projects/tasks:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !projName.trim()) return;

    try {
      await createTeamProject(teamId, {
        name: projName,
        description: projDesc,
        category: projCategory,
        budget: projBudget,
        timeline: projTimeline,
        status: 'Idea',
        progress: 0,
        members: []
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success('Project created successfully!');
      setProjectOpen(false);
      resetProjectForm();
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const resetProjectForm = () => {
    setProjName('');
    setProjDesc('');
    setProjCategory('Research');
    setProjBudget(0);
    setProjTimeline('');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser) return;
    const ok = window.confirm('Are you sure you want to delete this project and all its tasks?');
    if (!ok) return;

    try {
      await deleteTeamProject(teamId, projectId, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Project deleted');
      if (activeProject?.id === projectId) setActiveProject(null);
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, nextStatus: ProjectStatus) => {
    if (!currentUser) return;
    try {
      await updateTeamProject(teamId, projectId, { status: nextStatus }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success(`Project moved to ${nextStatus}`);
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeProject || !taskTitle.trim()) return;

    try {
      await createTeamTask(teamId, activeProject.id, {
        title: taskTitle,
        description: taskDesc,
        deadline: taskDeadline,
        priority: taskPriority,
        assignedMembers: [],
        checklist: [],
        comments: [],
        progress: 0,
        isCompleted: false
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success('Task assigned successfully!');
      setTaskOpen(false);
      resetTaskForm();
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskDeadline('');
    setTaskPriority('medium');
  };

  const handleToggleTaskCompletion = async (task: TeamTask) => {
    if (!currentUser) return;
    try {
      const isCompleted = !task.isCompleted;
      const progress = isCompleted ? 100 : 0;
      await updateTeamTask(teamId, task.id, { isCompleted, progress }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success(isCompleted ? 'Task completed! Good work.' : 'Task reopened');
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to update task state');
    }
  };

  const handleAddChecklistItem = async (task: TeamTask) => {
    if (!currentUser || !checkText.trim()) return;
    try {
      const items = task.checklist || [];
      items.push({
        id: Math.random().toString(36).substring(2, 9),
        text: checkText.trim(),
        isCompleted: false
      });

      await updateTeamTask(teamId, task.id, { checklist: items }, currentUser.uid, userData?.fullName || 'Anonymous');
      setCheckText('');
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Failed to add checklist item');
    }
  };

  const handleToggleChecklistItem = async (task: TeamTask, itemId: string) => {
    if (!currentUser) return;
    try {
      const items = task.checklist.map(item => {
        if (item.id === itemId) {
          return { ...item, isCompleted: !item.isCompleted };
        }
        return item;
      });

      const completedCount = items.filter(i => i.isCompleted).length;
      const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
      const isCompleted = progress === 100;

      await updateTeamTask(teamId, task.id, { checklist: items, progress, isCompleted }, currentUser.uid, userData?.fullName || 'Anonymous');
      loadProjectsAndTasks();
    } catch (error) {
      toast.error('Error updating checklist item');
    }
  };

  const currentProjectTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter(t => t.projectId === activeProject.id);
  }, [tasks, activeProject]);

  const isGuest = teamRole === 'guest';
  const isPMOrAbove = ['owner', 'admin', 'project_manager'].includes(teamRole);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

      {/* Left Sidebar: Projects List */}
      <div className="space-y-4 lg:col-span-1">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unlimited Projects</span>
          {!isGuest && (
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg" onClick={() => setProjectOpen(true)}>
              <Plus className="w-4 h-4 text-emerald-500" />
            </Button>
          )}
        </div>

        {projects.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No projects defined yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.map(proj => (
              <Card
                key={proj.id}
                onClick={() => setActiveProject(proj)}
                className={`rounded-xl p-3 border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-colors ${
                  activeProject?.id === proj.id ? 'border-emerald-500 bg-emerald-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{proj.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{proj.category} • {proj.status}</p>
                  </div>
                  {isPMOrAbove && (
                    <Button size="icon" variant="ghost" className="w-6 h-6 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Main Panel: Active Project Details & Task Checklists */}
      <div className="lg:col-span-3 space-y-6">
        {activeProject ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-extrabold">{activeProject.name}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">{activeProject.status}</Badge>
                </div>
                <CardDescription className="text-xs mt-1">{activeProject.description}</CardDescription>
              </div>

              {/* Status workflow adjustments */}
              {isPMOrAbove && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={activeProject.status}
                    onChange={e => handleUpdateProjectStatus(activeProject.id, e.target.value as ProjectStatus)}
                    className="border text-xs rounded-lg p-1.5 dark:bg-slate-900"
                  >
                    <option value="Idea">Idea</option>
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Testing">Testing</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>

                  <Button size="xs" onClick={() => setTaskOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs py-1 h-8">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* Project Metadata Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/10 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget Limit</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">UGX {activeProject.budget.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Project Deadline</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{activeProject.timeline || 'No deadline set'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1"><Trophy className="w-3 h-3" /> Category</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{activeProject.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1">Completion Progress</p>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 dark:bg-slate-800">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${activeProject.progress || 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Tasks Checklist Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-1.5 border-b pb-2">
                  <ListTodo className="w-4 h-4 text-emerald-500" /> Deliverables Checklists
                </h4>

                {currentProjectTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No tasks defined for this project workspace.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentProjectTasks.map(task => (
                      <Card key={task.id} className="rounded-xl border shadow-sm overflow-hidden flex flex-col justify-between">
                        <CardHeader className="p-4 pb-2 border-b bg-slate-50/50 dark:bg-slate-900/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`font-bold text-xs ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Due: {task.deadline || 'No deadline'}</p>
                            </div>
                            <Badge variant="outline" className={`text-[9px] uppercase ${
                              task.priority === 'critical' ? 'border-red-500 text-red-500' :
                              task.priority === 'high' ? 'border-amber-500 text-amber-500' : 'border-slate-300'
                            }`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3 flex-1 text-xs">
                          <p className="text-slate-500 text-[11px]">{task.description}</p>

                          {/* Sub-checklists items */}
                          <div className="space-y-1.5">
                            {task.checklist?.map(item => (
                              <div key={item.id} className="flex items-center gap-2 text-xs">
                                <span className="cursor-pointer" onClick={() => handleToggleChecklistItem(task, item.id)}>
                                  {item.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-current" /> : <Circle className="w-4 h-4 text-slate-300" />}
                                </span>
                                <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>{item.text}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>

                        <CardFooter className="p-3 bg-slate-50/30 border-t flex items-center justify-between gap-2 flex-wrap">
                          {!isGuest && (
                            <div className="flex gap-1.5 w-full">
                              <Input
                                placeholder="Add checklist item..."
                                className="h-7 text-xs rounded-lg"
                                value={checkText}
                                onChange={e => setCheckText(e.target.value)}
                              />
                              <Button size="xs" onClick={() => handleAddChecklistItem(task)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-7">Add</Button>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            className={`w-full text-xs font-bold ${task.isCompleted ? 'text-amber-500' : 'text-emerald-500'}`}
                            onClick={() => handleToggleTaskCompletion(task)}
                          >
                            {task.isCompleted ? 'Reopen Deliverable' : 'Mark Completed'}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-2xl text-slate-400">
            Define or choose a project workspace in the sidebar to review tasks and milestone checklists.
          </div>
        )}
      </div>

      {/* Project Setup Dialog Modal */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Unlimited Project</DialogTitle>
            <DialogDescription>Input targets, budgets, and outlines.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="projName" className="text-xs">Project Name *</Label>
              <Input id="projName" value={projName} onChange={e => setProjName(e.target.value)} placeholder="e.g. Science Fair Presentation" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="projDesc" className="text-xs">Outline / Summary</Label>
              <Textarea id="projDesc" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Describe project deliverables..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="projBudget" className="text-xs">Budget Limit (UGX)</Label>
                <Input type="number" id="projBudget" value={projBudget} onChange={e => setProjBudget(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="projTimeline" className="text-xs">Project Target Timeline</Label>
                <Input id="projTimeline" value={projTimeline} onChange={e => setProjTimeline(e.target.value)} placeholder="e.g. 2 Weeks" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProjectOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Launch Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Creation Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Deliverable Task Checklist</DialogTitle>
            <DialogDescription>Assign priority, descriptions, and milestones target.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="taskTitle" className="text-xs">Task Name *</Label>
              <Input id="taskTitle" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskDesc" className="text-xs">Outlines</Label>
              <Textarea id="taskDesc" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="taskDeadline" className="text-xs">Deadline</Label>
                <Input id="taskDeadline" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} placeholder="e.g. Next Friday" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taskPriority" className="text-xs">Priority</Label>
                <select
                  id="taskPriority"
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as any)}
                  className="w-full border p-2 rounded-lg text-xs dark:bg-slate-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Assign Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
