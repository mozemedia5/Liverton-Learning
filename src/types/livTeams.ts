export type TeamVisibility = 'public' | 'private' | 'invite-only';

export type TeamRole =
  | 'owner'
  | 'admin'
  | 'moderator'
  | 'project_manager'
  | 'treasurer'
  | 'secretary'
  | 'teacher_mentor'
  | 'student_member'
  | 'guest';

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  role: TeamRole;
  joinedAt: Date | any;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  invitedEmail: string;
  invitedUserId?: string;
  role: TeamRole;
  senderId: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date | any;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  description: string;
  category: string;
  purpose: string;
  country: string;
  school?: string;
  district?: string;
  language: string;
  visibility: TeamVisibility;
  maxMembers: number;
  rules: string;
  welcomeMessage: string;
  tags: string[];
  ownerId: string;
  ownerName: string;
  createdAt: Date | any;
  updatedAt: Date | any;
  members: TeamMember[];
  memberIds?: string[]; // flat list of member userIds (used by security rules & queries)
  savedByUsers?: string[]; // userIds of users who saved this team
  savingsBalance?: number; // team wallet balance in UGX
  status?: 'active' | 'suspended';
  suspensionReason?: string;
  appealText?: string;
  appealStatus?: 'none' | 'pending' | 'under_review' | 'resolved' | 'rejected';
  dismissedMembers?: string[]; // userIds of dismissed/banned members
  dismissedExplanations?: Record<string, string>; // userId -> reason map
  appeals?: { userId: string; fullName: string; email: string; appealText: string; status: 'pending' | 'approved' | 'rejected'; createdAt: any }[];
}

export interface TeamMessageReaction {
  emoji: string;
  userIds: string[];
}

export interface TeamMessageReply {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date | any;
}

export interface TeamMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderTeamRole?: TeamRole;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'zip' | 'code';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  reactions?: TeamMessageReaction[];
  replies?: TeamMessageReply[];
  isPinned?: boolean;
  editedAt?: Date | any;
  createdAt: Date | any;
  readBy?: string[]; // userIds who read this message
}

export type ProjectStatus =
  | 'Idea'
  | 'Planning'
  | 'Active'
  | 'Testing'
  | 'Review'
  | 'Completed'
  | 'Archived';

export interface ProjectComment {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date | any;
}

export interface TeamProject {
  id: string;
  teamId: string;
  name: string;
  description: string;
  coverUrl?: string;
  category: string;
  members: string[]; // userIds of assigned members
  budget: number;
  timeline: string;
  status: ProjectStatus;
  milestones: string[];
  progress: number; // percentage 0-100
  createdAt: Date | any;
  updatedAt: Date | any;
  isPublishedToMarketplace?: boolean;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TeamTask {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedMembers: string[]; // userIds
  attachments: { name: string; url: string }[];
  checklist: TaskChecklistItem[];
  comments: ProjectComment[];
  progress: number; // 0-100
  isCompleted: boolean;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface TeamFolderFile {
  id: string;
  teamId: string;
  name: string;
  url: string;
  type: string;
  size: string;
  folder: 'Notes' | 'Assignments' | 'Research' | 'Presentations' | 'Resources' | 'Books' | 'Reports' | 'Previous Papers';
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date | any;
}

export interface SavingsTransaction {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'contribution' | 'withdrawal';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  notes?: string;
  createdAt: Date | any;
}

export interface TeamSavingsWallet {
  teamId: string;
  balance: number;
  currency: string;
  updatedAt: Date | any;
}

export interface ProjectFundingRequest {
  id: string;
  teamId: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  goalAmount: number;
  amountRaised: number;
  contributors: { userId: string; userName: string; amount: number; date: Date | any }[];
  status: 'active' | 'funded' | 'closed';
  updates: { title: string; body: string; date: Date | any }[];
  createdAt: Date | any;
}

export type TeamEventType = 'meeting' | 'deadline' | 'milestone' | 'revision' | 'event';

export interface TeamMeeting {
  id: string;
  teamId: string;
  title: string;
  agenda: string;
  scheduledAt: string;
  duration: number; // in minutes
  type?: TeamEventType;
  joinUrl?: string;
  notes: string;
  attendance: { userId: string; userName: string; attendedAt: Date | any }[];
  recordingUrlPlaceholder?: string;
  createdAt: Date | any;
}

export interface TeamAnnouncement {
  id: string;
  teamId: string;
  title: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date | any;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userIds
}

export interface TeamPoll {
  id: string;
  teamId: string;
  question: string;
  options: PollOption[];
  isClosed: boolean;
  createdAt: Date | any;
}

export interface TeamActivityFeedItem {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  action: string; // e.g., "created a project", "submitted a contribution"
  targetName?: string;
  createdAt: Date | any;
}

export interface MarketplaceItem {
  id: string;
  teamId: string;
  teamName: string;
  projectId: string;
  title: string;
  description: string;
  price: number; // 0 for free/open-source
  type: 'innovation' | 'resources' | 'research' | 'software' | 'notes' | 'open_source';
  ratings: { userId: string; rating: number; review?: string; userName: string; date: Date | any }[];
  downloadsCount: number;
  purchasesCount: number;
  isVerified: boolean;
  fileUrl?: string;
  coverUrl?: string;
  createdAt: Date | any;
}
