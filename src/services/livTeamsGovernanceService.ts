import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeamAICreditLedgerEntry, TeamTreasuryLedgerEntry } from '@/types/livTeams';
import { getTeamById, logTeamActivity } from './livTeamsCoreService';

const FINANCE_ROLES = new Set(['owner', 'admin', 'treasurer']);
const AI_MANAGER_ROLES = new Set(['owner', 'admin', 'project_manager', 'teacher_mentor']);

async function requireTeamRole(teamId: string, userId: string, roles: Set<string>) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');
  const member = team.members?.find(candidate => candidate.userId === userId);
  if (!member || !roles.has(member.role)) throw new Error('You do not have permission for this team operation');
  return team;
}

export async function getTeamAICreditBalance(teamId: string, userId: string): Promise<number> {
  const team = await getTeamById(teamId);
  if (!team?.members?.some(member => member.userId === userId)) throw new Error('Team membership required');
  const snapshot = await getDocs(query(collection(db, 'team_ai_credit_ledger'), where('teamId', '==', teamId)));
  return snapshot.docs.reduce((balance, entry) => {
    const data = entry.data() as TeamAICreditLedgerEntry;
    if (data.type === 'consumed' || data.type === 'expired') return balance - data.credits;
    return balance + data.credits;
  }, 0);
}

export async function recordTeamAICreditGrant(
  teamId: string,
  actorId: string,
  credits: number,
  operation: string,
  reference?: string,
): Promise<string> {
  if (!Number.isFinite(credits) || credits <= 0) throw new Error('Credits must be a positive number');
  await requireTeamRole(teamId, actorId, AI_MANAGER_ROLES);
  const entry = {
    teamId,
    operation,
    credits,
    type: 'granted' as const,
    actorId,
    reference: reference || '',
    createdAt: Timestamp.now(),
  } satisfies Omit<TeamAICreditLedgerEntry, 'id'>;
  return (await addDoc(collection(db, 'team_ai_credit_ledger'), entry)).id;
}

export async function consumeTeamAICredits(
  teamId: string,
  actorId: string,
  credits: number,
  operation: string,
  projectId?: string,
): Promise<string> {
  if (!Number.isFinite(credits) || credits <= 0) throw new Error('Credits must be a positive number');
  const team = await getTeamById(teamId);
  if (!team?.members?.some(member => member.userId === actorId)) throw new Error('Team membership required');
  const available = await getTeamAICreditBalance(teamId, actorId);
  if (available < credits) throw new Error(`Insufficient AI credits. ${available} credits remaining.`);
  const entry = {
    teamId,
    operation,
    credits,
    type: 'consumed' as const,
    actorId,
    projectId,
    createdAt: Timestamp.now(),
  } satisfies Omit<TeamAICreditLedgerEntry, 'id'>;
  const id = (await addDoc(collection(db, 'team_ai_credit_ledger'), entry)).id;
  await logTeamActivity(teamId, actorId, actorId, `used ${credits} AI credits`, operation);
  return id;
}

export async function createTeamTreasuryLedgerEntry(
  entry: Omit<TeamTreasuryLedgerEntry, 'id' | 'createdAt' | 'status'> & { status?: TeamTreasuryLedgerEntry['status'] },
): Promise<string> {
  await requireTeamRole(entry.teamId, entry.actorId, FINANCE_ROLES);
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) throw new Error('Transaction amount must be positive');
  const ledgerEntry = {
    ...entry,
    status: entry.status || 'pending',
    createdAt: Timestamp.now(),
  } satisfies Omit<TeamTreasuryLedgerEntry, 'id'>;
  return (await addDoc(collection(db, 'team_treasury_ledger'), ledgerEntry)).id;
}

export async function getTeamTreasuryLedger(teamId: string, userId: string): Promise<TeamTreasuryLedgerEntry[]> {
  await requireTeamRole(teamId, userId, FINANCE_ROLES);
  const snapshot = await getDocs(query(collection(db, 'team_treasury_ledger'), where('teamId', '==', teamId)));
  return snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() } as TeamTreasuryLedgerEntry));
}

export function deriveTreasuryBalance(entries: TeamTreasuryLedgerEntry[]): number {
  return entries.reduce((balance, entry) => {
    if (entry.status !== 'completed' && entry.status !== 'approved') return balance;
    if (entry.type === 'credit' || entry.type === 'refund' || entry.type === 'release') return balance + entry.amount;
    return balance - entry.amount;
  }, 0);
}

export function isTeamFinanceRole(role: string): boolean {
  return FINANCE_ROLES.has(role);
}

export function isTeamAIManagerRole(role: string): boolean {
  return AI_MANAGER_ROLES.has(role);
}

export function isValidProjectTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    Idea: ['Planning', 'Archived'],
    Planning: ['Active', 'Archived'],
    Active: ['Testing', 'Near Completion', 'Archived'],
    Testing: ['Review', 'Active'],
    Review: ['Completed', 'Active'],
    'Near Completion': ['Completed', 'Review'],
    Completed: ['Submitted for Verification', 'Archived'],
    'Submitted for Verification': ['Verified', 'Completed'],
    Verified: ['Listed', 'Archived'],
    Listed: ['Archived'],
    Archived: [],
  };
  return from === to || transitions[from]?.includes(to) === true;
}

export function getOverdueTeamTasks(tasks: Array<{ deadline?: string; isCompleted?: boolean }>, now = new Date()): number {
  return tasks.filter(task => Boolean(task.deadline) && !task.isCompleted && new Date(task.deadline as string) < now).length;
}
