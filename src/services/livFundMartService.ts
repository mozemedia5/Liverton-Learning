import {
  addDoc, collection, doc, getDoc, getDocs, orderBy, query, runTransaction, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logTeamActivity } from './livTeamsCoreService';
import type {
  FinancialTransactionStatus,
  LivFundCampaign,
  LivFundCampaignStatus,
  LivFundContribution,
  LivMartListingStatus,
  LivMartOrder,
  LivMartOrderStatus,
  MarketplaceItem,
  ProjectVerificationRecord,
  ProjectVerificationStatus,
  TeamProject,
} from '@/types/livTeams';

const CAMPAIGNS = 'livfund_campaigns';
const CONTRIBUTIONS = 'livfund_contributions';
const LISTINGS = 'marketplace_items';
const ORDERS = 'livmart_orders';
const VERIFICATIONS = 'project_verifications';
const PLATFORM_FEE_BPS = 500; // 5%; stored explicitly in each ledger record.

function requirePositiveMinor(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer in minor currency units.`);
}

function isTeamManager(project: TeamProject, userId: string) {
  return project.ownerId === userId || project.members.includes(userId);
}

export async function getTeamProjectsForEconomicFeatures(teamId: string): Promise<TeamProject[]> {
  const snap = await getDocs(query(collection(db, 'teams', teamId, 'projects'), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as TeamProject));
}

export async function getLivFundCampaigns(status: LivFundCampaignStatus = 'Active'): Promise<LivFundCampaign[]> {
  const base = collection(db, CAMPAIGNS);
  const snap = await getDocs(query(base, where('status', '==', status), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as LivFundCampaign));
}

export async function getLivFundCampaign(campaignId: string): Promise<LivFundCampaign | null> {
  const snap = await getDoc(doc(db, CAMPAIGNS, campaignId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as LivFundCampaign) : null;
}

export async function createLivFundCampaign(input: {
  project: TeamProject;
  userId: string;
  ownerName: string;
  title: string;
  description: string;
  objective: string;
  purpose: string;
  targetAmountMinor: number;
  currency: string;
  deadline?: string;
  minimumContributionMinor?: number;
}): Promise<string> {
  if (!isTeamManager(input.project, input.userId)) throw new Error('You are not authorized to create a campaign for this project.');
  if (!input.project.objectives?.length || !input.project.budget || !input.project.milestones?.length) {
    throw new Error('The project needs objectives, a budget, and at least one milestone before it can seek funding.');
  }
  requirePositiveMinor(input.targetAmountMinor, 'Funding target');
  const ref = await addDoc(collection(db, CAMPAIGNS), {
    projectId: input.project.id,
    teamId: input.project.teamId,
    title: input.title.trim(),
    description: input.description.trim(),
    objective: input.objective.trim(),
    purpose: input.purpose.trim(),
    targetAmountMinor: input.targetAmountMinor,
    currency: input.currency,
    minimumContributionMinor: input.minimumContributionMinor || 0,
    deadline: input.deadline || null,
    status: 'Draft',
    ownerId: input.userId,
    ownerName: input.ownerName,
    milestoneIds: input.project.milestones,
    evidenceFileIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await logTeamActivity(input.project.teamId, input.userId, input.ownerName, 'created a LivFund campaign', input.title.trim());
  return ref.id;
}

export async function updateLivFundCampaignStatus(campaignId: string, nextStatus: LivFundCampaignStatus, actorId: string): Promise<void> {
  const campaignRef = doc(db, CAMPAIGNS, campaignId);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(campaignRef);
    if (!snap.exists()) throw new Error('Campaign not found.');
    const campaign = snap.data() as LivFundCampaign;
    const allowed: Record<LivFundCampaignStatus, LivFundCampaignStatus[]> = {
      Draft: ['Submitted', 'Cancelled'], Submitted: ['Under Review', 'Cancelled'], 'Under Review': ['Approved', 'Draft', 'Cancelled'], Approved: ['Active', 'Cancelled'], Active: ['Paused', 'Funded', 'Expired', 'Cancelled'], Paused: ['Active', 'Cancelled'], Funded: ['Completed'], Completed: [], Cancelled: [], Expired: [],
    };
    if (!allowed[campaign.status]?.includes(nextStatus)) throw new Error(`Invalid campaign transition from ${campaign.status} to ${nextStatus}.`);
    if (campaign.ownerId !== actorId && !['Approved', 'Active', 'Paused', 'Funded', 'Completed'].includes(nextStatus)) throw new Error('You are not authorized to make this campaign transition.');
    transaction.update(campaignRef, { status: nextStatus, updatedAt: Timestamp.now() });
  });
}

export async function createPendingLivFundContribution(input: {
  campaignId: string;
  contributorId?: string;
  contributorName?: string;
  amountMinor: number;
  currency: string;
  provider: string;
  providerReference: string;
  idempotencyKey: string;
}): Promise<string> {
  requirePositiveMinor(input.amountMinor, 'Contribution');
  const campaignRef = doc(db, CAMPAIGNS, input.campaignId);
  const contributionRef = doc(db, CONTRIBUTIONS, input.idempotencyKey);
  await runTransaction(db, async transaction => {
    const [campaignSnap, existingSnap] = await Promise.all([transaction.get(campaignRef), transaction.get(contributionRef)]);
    if (!campaignSnap.exists()) throw new Error('Campaign not found.');
    if (existingSnap.exists()) return;
    const campaign = campaignSnap.data() as LivFundCampaign;
    if (campaign.status !== 'Active') throw new Error('This campaign is not accepting contributions.');
    if (campaign.currency !== input.currency) throw new Error('Currency does not match the campaign.');
    transaction.set(contributionRef, {
      campaignId: input.campaignId,
      projectId: campaign.projectId,
      contributorId: input.contributorId || null,
      contributorName: input.contributorName || null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      provider: input.provider,
      providerReference: input.providerReference,
      status: 'pending',
      platformFeeMinor: Math.floor(input.amountMinor * PLATFORM_FEE_BPS / 10000),
      projectAmountMinor: input.amountMinor - Math.floor(input.amountMinor * PLATFORM_FEE_BPS / 10000),
      idempotencyKey: input.idempotencyKey,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
  return contributionRef.id;
}

export async function getLivFundContributions(campaignId: string): Promise<LivFundContribution[]> {
  const snap = await getDocs(query(collection(db, CONTRIBUTIONS), where('campaignId', '==', campaignId), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as LivFundContribution));
}

export function calculateSuccessfulFunding(contributions: LivFundContribution[]) {
  return contributions.filter(item => item.status === 'successful').reduce((sum, item) => sum + item.amountMinor, 0);
}

export async function confirmLivFundContributionServerResult(contributionId: string, status: Extract<FinancialTransactionStatus, 'successful' | 'failed' | 'cancelled' | 'refunded' | 'disputed'>, providerReference: string): Promise<void> {
  if (!providerReference.trim()) throw new Error('A verified provider reference is required.');
  const ref = doc(db, CONTRIBUTIONS, contributionId);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Contribution not found.');
    const current = snap.data() as LivFundContribution;
    if (current.status === status) return;
    if (current.status !== 'pending' && status !== 'refunded' && status !== 'disputed') throw new Error('This contribution is already finalized.');
    transaction.update(ref, { status, providerReference, updatedAt: Timestamp.now() });
  });
}

export async function createProjectVerification(project: TeamProject, actorId: string): Promise<string> {
  if (!isTeamManager(project, actorId)) throw new Error('You are not authorized to submit this project for verification.');
  if (project.status !== 'Completed' && project.status !== 'Listed') {
    throw new Error('Finish the project lifecycle through Completed before submitting it for review.');
  }
  const ref = await addDoc(collection(db, VERIFICATIONS), { projectId: project.id, teamId: project.teamId, status: 'Pending Review', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  // Verification is tracked separately; it must not move the project back into
  // a deprecated workflow stage or make the project disappear from Completed.
  return ref.id;
}

export async function getProjectVerification(projectId: string): Promise<ProjectVerificationRecord | null> {
  const snap = await getDocs(query(collection(db, VERIFICATIONS), where('projectId', '==', projectId), orderBy('createdAt', 'desc')));
  const item = snap.docs[0];
  return item ? ({ id: item.id, ...item.data() } as ProjectVerificationRecord) : null;
}

export async function reviewProjectVerification(recordId: string, status: ProjectVerificationStatus, reviewerId: string, reviewerName: string, reason?: string): Promise<void> {
  await updateDoc(doc(db, VERIFICATIONS, recordId), { status, reviewerId, reviewerName, reason: reason || null, updatedAt: Timestamp.now() });
}

export async function getLivMartListings(status: LivMartListingStatus = 'Listed'): Promise<MarketplaceItem[]> {
  const snap = await getDocs(query(collection(db, LISTINGS), where('status', '==', status), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as MarketplaceItem));
}

export async function createLivMartListing(input: {
  project: TeamProject;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  category: string;
  priceMinor: number;
  currency: string;
  deliverables: string[];
  licensingTerms: string;
  deliveryMethod: 'digital' | 'service' | 'physical';
  supportTerms?: string;
}): Promise<string> {
  if (!isTeamManager(input.project, input.sellerId)) throw new Error('You are not authorized to list this project.');
  if (!['Completed', 'Listed'].includes(input.project.status)) throw new Error('Only completed projects can be submitted to LivMart.');
  if (!input.title.trim() || !input.description.trim() || input.deliverables.filter(Boolean).length === 0) throw new Error('A listing needs a clear description and deliverables.');
  if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 0) throw new Error('Price must be an integer in minor currency units.');
  const ref = await addDoc(collection(db, LISTINGS), {
    teamId: input.project.teamId,
    teamName: 'Liverton Team',
    projectId: input.project.id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    price: input.priceMinor / 100,
    priceMinor: input.priceMinor,
    currency: input.currency,
    deliverables: input.deliverables.filter(Boolean),
    licensingTerms: input.licensingTerms.trim(),
    deliveryMethod: input.deliveryMethod,
    supportTerms: input.supportTerms?.trim() || '',
    status: 'Marketplace Review',
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    sourceProjectStatus: input.project.status,
    ratings: [], downloadsCount: 0, purchasesCount: 0, isVerified: false,
    createdAt: Timestamp.now(),
  });
  await logTeamActivity(input.project.teamId, input.sellerId, input.sellerName, 'submitted a project to LivMart', input.title.trim());
  return ref.id;
}

export async function getAllLivMartSubmissions(): Promise<MarketplaceItem[]> {
  const snap = await getDocs(query(collection(db, LISTINGS), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as MarketplaceItem));
}

export async function reviewLivMartListing(input: {
  listingId: string;
  status: 'Listed' | 'Rejected';
  reviewerId: string;
  moderationNote?: string;
}): Promise<void> {
  await updateDoc(doc(db, LISTINGS, input.listingId), {
    status: input.status,
    isVerified: input.status === 'Listed',
    moderationNote: input.moderationNote?.trim() || null,
    reviewedBy: input.reviewerId,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function createPendingLivMartOrder(input: {
  listingId: string;
  buyerId: string;
  provider: string;
  idempotencyKey: string;
}): Promise<string> {
  const listingRef = doc(db, LISTINGS, input.listingId);
  const orderRef = doc(db, ORDERS, input.idempotencyKey);
  await runTransaction(db, async transaction => {
    const [listingSnap, existingSnap] = await Promise.all([transaction.get(listingRef), transaction.get(orderRef)]);
    if (!listingSnap.exists()) throw new Error('Listing not found.');
    if (existingSnap.exists()) return;
    const listing = listingSnap.data() as MarketplaceItem;
    if (listing.status !== 'Listed') throw new Error('This listing is not available for purchase.');
    const amountMinor = listing.priceMinor ?? Math.round((listing.price || 0) * 100);
    const fee = Math.floor(amountMinor * PLATFORM_FEE_BPS / 10000);
    transaction.set(orderRef, { listingId: input.listingId, projectId: listing.projectId, buyerId: input.buyerId, sellerId: listing.sellerId, amountMinor, platformFeeMinor: fee, sellerAmountMinor: amountMinor - fee, currency: listing.currency || 'UGX', provider: input.provider, status: 'Payment Pending', idempotencyKey: input.idempotencyKey, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  });
  return orderRef.id;
}

export async function getBuyerOrders(buyerId: string): Promise<LivMartOrder[]> {
  const snap = await getDocs(query(collection(db, ORDERS), where('buyerId', '==', buyerId), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as LivMartOrder));
}

export async function updateLivMartOrderStatus(orderId: string, status: LivMartOrderStatus, providerReference?: string) {
  await updateDoc(doc(db, ORDERS, orderId), { status, ...(providerReference ? { providerReference } : {}), updatedAt: Timestamp.now() });
}
