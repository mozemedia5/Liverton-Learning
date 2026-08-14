import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WORK_HUB_ROLE_PERMISSIONS, type WorkHub, type WorkHubMember, type WorkHubPermission, type WorkHubRole } from '@/types/learning';

const hubRef = (ownerId: string) => doc(db, 'workHubs', ownerId);

export async function getOrCreateWorkHub(ownerId: string, owner: Pick<WorkHubMember, 'name' | 'email'>): Promise<WorkHub> {
  const existing = await getDoc(hubRef(ownerId));
  if (existing.exists()) return { id: existing.id, ...existing.data() } as WorkHub;
  const member: WorkHubMember = { userId: ownerId, name: owner.name, email: owner.email, role: 'owner', permissions: WORK_HUB_ROLE_PERMISSIONS.owner, status: 'active' };
  const hub: Omit<WorkHub, 'id'> = { ownerId, name: `${owner.name}'s Work Hub`, members: [member], memberIds: [ownerId], createdAt: new Date(), updatedAt: new Date() };
  await setDoc(hubRef(ownerId), { ...hub, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const created = await getDoc(hubRef(ownerId));
  return created.exists() ? ({ id: created.id, ...created.data() } as WorkHub) : ({ id: ownerId, ...hub } as WorkHub);
}

export async function searchTeachers(searchTerm: string, currentUserId: string): Promise<Array<{ uid: string; fullName: string; email: string }>> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
  const term = searchTerm.trim().toLowerCase();
  return snap.docs.map((item) => ({ uid: item.id, fullName: item.data().fullName || item.data().name || '', email: item.data().email || '' }))
    .filter((teacher) => teacher.uid !== currentUserId && (!term || teacher.fullName.toLowerCase().includes(term) || teacher.email.toLowerCase().includes(term)));
}

export async function inviteTeacher(ownerId: string, teacher: { uid: string; fullName: string; email: string }, role: Exclude<WorkHubRole, 'owner'> = 'co_teacher', permissions = WORK_HUB_ROLE_PERMISSIONS[role]): Promise<string> {
  const hub = await getDoc(hubRef(ownerId));
  if (!hub.exists() || hub.data().ownerId !== ownerId) throw new Error('Only the Work Hub owner can invite teachers.');
  const invitation = await addDoc(collection(db, 'workHubInvitations'), { ownerId, teacherId: teacher.uid, teacherName: teacher.fullName, teacherEmail: teacher.email, role, permissions, status: 'pending', createdAt: serverTimestamp() });
  return invitation.id;
}

export async function updateWorkHubMember(ownerId: string, memberId: string, updates: Partial<Pick<WorkHubMember, 'role' | 'permissions' | 'status'>>): Promise<void> {
  const ref = hubRef(ownerId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().ownerId !== ownerId) throw new Error('Only the Work Hub owner can manage members.');
  const members = (snap.data().members || []) as WorkHubMember[];
  const next = members.map((member) => member.userId === memberId ? { ...member, ...updates } : member);
  await updateDoc(ref, { members: next, updatedAt: serverTimestamp() });
}

export function hasWorkHubPermission(hub: WorkHub, userId: string, permission: WorkHubPermission): boolean {
  const member = hub.members.find((item) => item.userId === userId);
  return Boolean(member?.status === 'active' && member.permissions.includes(permission));
}
