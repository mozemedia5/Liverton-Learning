import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SavingsTransaction, ProjectFundingRequest, MarketplaceItem, TeamPoll, TeamAnnouncement } from '@/types/livTeams';
import { logTeamActivity } from './livTeamsCoreService';

/**
 * Savings Transactions (Contribution/Withdrawals)
 */
export async function createSavingsTransaction(teamId: string, tx: Partial<SavingsTransaction>): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'savings_transactions');
    const finalTx = {
      ...tx,
      teamId,
      status: 'pending',
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(ref, finalTx);
    await logTeamActivity(teamId, tx.userId || '', tx.userName || 'User', `requested a savings ${tx.type} of UGX ${tx.amount}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating savings transaction:', error);
    throw error;
  }
}

export async function getSavingsTransactions(teamId: string): Promise<SavingsTransaction[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'savings_transactions');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsTransaction));
  } catch (error) {
    console.error('Error fetching savings transactions:', error);
    return [];
  }
}

export async function approveSavingsTransaction(teamId: string, txId: string, approvedBy: string, approve: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'savings_transactions', txId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Transaction not found');

    const tx = snap.data() as SavingsTransaction;
    const nextStatus = approve ? 'approved' : 'rejected';

    await updateDoc(docRef, {
      status: nextStatus,
      approvedBy
    });

    if (approve) {
      // Modify actual team wallet balance (In memory simulation attached to dashboard or Firestore team config)
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const currentBalance = teamData.savingsBalance || 0;
        const offset = tx.type === 'contribution' ? tx.amount : -tx.amount;
        await updateDoc(teamRef, {
          savingsBalance: Math.max(0, currentBalance + offset)
        });
      }
    }

    await logTeamActivity(teamId, approvedBy, 'Treasurer', `${approve ? 'approved' : 'rejected'} transaction for UGX ${tx.amount}`);
  } catch (error) {
    console.error('Error approving savings transaction:', error);
    throw error;
  }
}

/**
 * Project Funding Requests
 */
export async function createProjectFundingRequest(teamId: string, req: Partial<ProjectFundingRequest>, userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'funding_requests');
    const finalReq = {
      ...req,
      teamId,
      amountRaised: 0,
      contributors: [],
      status: 'active',
      updates: [],
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(ref, finalReq);
    await logTeamActivity(teamId, userId, userName, `requested funding for project: ${req.projectName}`, `Goal: UGX ${req.goalAmount}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating funding request:', error);
    throw error;
  }
}

export async function getProjectFundingRequests(teamId: string): Promise<ProjectFundingRequest[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'funding_requests');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectFundingRequest));
  } catch (error) {
    console.error('Error fetching funding requests:', error);
    return [];
  }
}

export async function contributeToFundingRequest(
  teamId: string,
  requestId: string,
  userId: string,
  userName: string,
  amount: number
): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'funding_requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as ProjectFundingRequest;
    const contributors = req.contributors || [];
    contributors.push({
      userId,
      userName,
      amount,
      date: new Date()
    });

    const nextAmount = (req.amountRaised || 0) + amount;
    const nextStatus = nextAmount >= req.goalAmount ? 'funded' : 'active';

    await updateDoc(docRef, {
      amountRaised: nextAmount,
      contributors,
      status: nextStatus
    });

    await logTeamActivity(teamId, userId, userName, `contributed UGX ${amount} to project funding: ${req.projectName}`);
  } catch (error) {
    console.error('Error contributing to funding:', error);
    throw error;
  }
}

/**
 * Marketplace Listings CRUD
 */
export async function publishProjectToMarketplace(item: Partial<MarketplaceItem>): Promise<string> {
  try {
    const ref = collection(db, 'marketplace_items');
    const finalItem = {
      ...item,
      ratings: [],
      downloadsCount: 0,
      purchasesCount: 0,
      isVerified: false,
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(ref, finalItem);

    // Set isPublishedToMarketplace in the team project as well
    if (item.teamId && item.projectId) {
      const projRef = doc(db, 'teams', item.teamId, 'projects', item.projectId);
      await updateDoc(projRef, { isPublishedToMarketplace: true });
      await logTeamActivity(item.teamId, 'system', 'Marketplace', `published project "${item.title}" to marketplace`);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error publishing to marketplace:', error);
    throw error;
  }
}

export async function getMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const ref = collection(db, 'marketplace_items');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return [];
  }
}

/**
 * Fetch marketplace listings published by a single team
 */
export async function getTeamMarketplaceItems(teamId: string): Promise<MarketplaceItem[]> {
  try {
    const ref = collection(db, 'marketplace_items');
    const q = query(ref, where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
  } catch (error) {
    console.error('Error fetching team marketplace listings:', error);
    return [];
  }
}

/**
 * Record a download / purchase of a marketplace item
 */
export async function recordMarketplaceDownload(itemId: string, isPurchase: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'marketplace_items', itemId);
    await updateDoc(docRef, {
      downloadsCount: increment(1),
      ...(isPurchase ? { purchasesCount: increment(1) } : {})
    });
  } catch (error) {
    console.error('Error recording marketplace download:', error);
  }
}

export async function addMarketplaceReview(
  itemId: string,
  userId: string,
  userName: string,
  rating: number,
  review: string
): Promise<void> {
  try {
    const docRef = doc(db, 'marketplace_items', itemId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const ratings = data.ratings || [];
    ratings.push({
      userId,
      userName,
      rating,
      review,
      date: new Date()
    });

    await updateDoc(docRef, { ratings });
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
}

/**
 * Interactive Polls CRUD
 */
export async function createTeamPoll(teamId: string, question: string, optionTexts: string[], userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'polls');
    const options = optionTexts.map((text, index) => ({
      id: index.toString(),
      text,
      votes: []
    }));

    const finalPoll = {
      teamId,
      question,
      options,
      isClosed: false,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(ref, finalPoll);
    await logTeamActivity(teamId, userId, userName, `started interactive poll: "${question}"`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating team poll:', error);
    throw error;
  }
}

export async function getTeamPolls(teamId: string): Promise<TeamPoll[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'polls');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamPoll));
  } catch (error) {
    console.error('Error fetching team polls:', error);
    return [];
  }
}

export async function voteInTeamPoll(teamId: string, pollId: string, optionId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'polls', pollId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as TeamPoll;
    const options = data.options.map(opt => {
      // Remove user's vote from any other option first to avoid duplicate votes
      const votes = opt.votes.filter(uid => uid !== userId);
      if (opt.id === optionId) {
        votes.push(userId);
      }
      return { ...opt, votes };
    });

    await updateDoc(docRef, { options });
  } catch (error) {
    console.error('Error voting in poll:', error);
    throw error;
  }
}

/**
 * Announcements CRUD
 */
export async function createTeamAnnouncement(teamId: string, title: string, content: string, senderId: string, senderName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'announcements');
    const finalAnn = {
      teamId,
      title,
      content,
      senderId,
      senderName,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(ref, finalAnn);
    await logTeamActivity(teamId, senderId, senderName, 'posted team announcement', title);
    return docRef.id;
  } catch (error) {
    console.error('Error creating team announcement:', error);
    throw error;
  }
}

export async function getTeamAnnouncements(teamId: string): Promise<TeamAnnouncement[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'announcements');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamAnnouncement));
  } catch (error) {
    console.error('Error fetching team announcements:', error);
    return [];
  }
}
