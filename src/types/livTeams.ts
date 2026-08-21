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
  | 'Near Completion'
  | 'Completed'
  | 'Submitted for Verification'
  | 'Verified'
  | 'Listed'
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
  ownerId?: string;
  members: string[]; // userIds of assigned members
  memberRoles?: Record<string, string>;
  objectives?: string[];
  deliverables?: string[];
  requiredMaterials?: string[];
  budget: number;
  actualSpend?: number;
  currency?: string;
  timeline: string;
  targetCompletionDate?: string;
  status: ProjectStatus;
  milestones: string[];
  progress: number; // percentage 0-100; derived from task/milestone records when available
  createdAt: Date | any;
  updatedAt: Date | any;
  isPublishedToMarketplace?: boolean;
  submittedForVerificationAt?: Date | any;
  verifiedAt?: Date | any;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export type TeamTaskStatus = 'Todo' | 'In Progress' | 'Blocked' | 'Review' | 'Completed';

export interface TeamTask {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: TeamTaskStatus;
  assignedMembers: string[]; // userIds
  attachments: { name: string; url: string }[];
  checklist: TaskChecklistItem[];
  comments: ProjectComment[];
  progress: number; // 0-100
  isCompleted: boolean;
  createdBy?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface TeamMilestone {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate?: string;
  taskIds: string[];
  responsibleUserIds: string[];
  evidenceFileIds?: string[];
  isCompleted: boolean;
  createdBy: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface TeamTreasuryLedgerEntry {
  id: string;
  teamId: string;
  type: 'credit' | 'debit' | 'refund' | 'hold' | 'release';
  amount: number;
  currency: string;
  source?: string;
  destination?: string;
  actorId: string;
  reference?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  idempotencyKey?: string;
  createdAt: Date | any;
}

export interface TeamAICreditLedgerEntry {
  id: string;
  teamId: string;
  operation: string;
  credits: number;
  type: 'purchased' | 'granted' | 'consumed' | 'refunded' | 'expired';
  actorId: string;
  projectId?: string;
  reference?: string;
  createdAt: Date | any;
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

export type LivFundCampaignStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Active' | 'Paused' | 'Funded' | 'Completed' | 'Cancelled' | 'Expired';
export type FinancialTransactionStatus = 'pending' | 'successful' | 'failed' | 'cancelled' | 'refunded' | 'disputed';
export type LivMartListingStatus = 'Draft' | 'Marketplace Review' | 'Approved' | 'Listed' | 'Archived' | 'Rejected';
export type LivMartOrderStatus = 'Order Created' | 'Payment Pending' | 'Payment Confirmed' | 'Processing' | 'Fulfillment Pending' | 'Fulfilled' | 'Completed' | 'Cancelled' | 'Refunded' | 'Disputed';

export interface LivFundCampaign {
  id: string;
  projectId: string;
  teamId: string;
  title: string;
  description: string;
  objective: string;
  targetAmountMinor: number;
  currency: string;
  minimumContributionMinor?: number;
  deadline?: string;
  purpose: string;
  status: LivFundCampaignStatus;
  ownerId: string;
  ownerName: string;
  milestoneIds: string[];
  evidenceFileIds: string[];
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface LivFundContribution {
  id: string;
  campaignId: string;
  projectId: string;
  contributorId?: string;
  contributorName?: string;
  amountMinor: number;
  currency: string;
  provider: string;
  providerReference: string;
  status: FinancialTransactionStatus;
  platformFeeMinor: number;
  projectAmountMinor: number;
  idempotencyKey: string;
  refundOf?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export type ProjectVerificationStatus = 'Pending Review' | 'Additional Information Required' | 'Approved' | 'Rejected';
export interface ProjectVerificationRecord {
  id: string;
  projectId: string;
  teamId: string;
  status: ProjectVerificationStatus;
  reviewerId?: string;
  reviewerName?: string;
  reason?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface MarketplaceItem {
  id: string;
  teamId: string;
  teamName: string;
  projectId: string;
  title: string;
  description: string;
  price: number; // legacy major-unit display value; new commerce records use priceMinor
  priceMinor?: number;
  currency?: string;
  category?: string;
  deliverables?: string[];
  licensingTerms?: string;
  deliveryMethod?: 'digital' | 'service' | 'physical';
  supportTerms?: string;
  status?: LivMartListingStatus;
  sellerId?: string;
  sellerName?: string;
  sourceProjectStatus?: ProjectStatus;
  ratings: { userId: string; rating: number; review?: string; userName: string; date: Date | any }[];
  downloadsCount: number;
  purchasesCount: number;
  isVerified: boolean;
  verificationId?: string;
  fileUrl?: string;
  coverUrl?: string;
  createdAt: Date | any;
}

export interface LivMartOrder {
  id: string;
  listingId: string;
  projectId: string;
  buyerId: string;
  sellerId: string;
  amountMinor: number;
  platformFeeMinor: number;
  sellerAmountMinor: number;
  currency: string;
  provider: string;
  providerReference?: string;
  status: LivMartOrderStatus;
  idempotencyKey: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}
