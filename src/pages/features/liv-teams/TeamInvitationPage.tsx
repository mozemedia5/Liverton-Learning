import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getTeamInvitation, respondToInvitation } from '@/services/livTeamsCoreService';
import type { TeamInvitation } from '@/types/livTeams';

export default function TeamInvitationPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, initialLoadComplete } = useAuth();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  useEffect(() => { if (!inviteId) return; getTeamInvitation(inviteId).then(setInvitation).catch(() => toast.error('Could not load this invitation')).finally(() => setLoading(false)); }, [inviteId]);
  const handleJoin = async () => { if (!invitation || !currentUser) return; setJoining(true); try { await respondToInvitation(invitation.id, true, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton member', currentUser.email || ''); toast.success('You joined the team successfully'); navigate(`/features/liv-teams/workspace/${invitation.teamId}`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not join this team'); } finally { setJoining(false); } };
  if (loading || !initialLoadComplete) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!invitation) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Invitation unavailable</CardTitle><CardDescription>This invitation may have expired, been revoked, or reached its use limit.</CardDescription></CardHeader></Card></div>;
  const expired = invitation.expiresAt?.toDate ? invitation.expiresAt.toDate().getTime() < Date.now() : false;
  const unavailable = invitation.status !== 'pending' || expired || ((invitation.useCount || 0) >= (invitation.maxUses || 1000));
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6"><Card className="max-w-md w-full rounded-2xl shadow-xl"><CardHeader className="text-center space-y-3"><div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center"><Users className="w-7 h-7 text-emerald-600" /></div><CardTitle className="text-2xl">Join {invitation.teamName}</CardTitle><CardDescription>{invitation.inviteType === 'link' ? 'You were invited with a secure Liv Teams link.' : 'You were invited to collaborate in this Liv Team.'}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-sm"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Role: <span className="font-semibold capitalize">{invitation.role.replace('_', ' ')}</span></div>{unavailable ? <p className="text-sm text-amber-600 text-center">This invitation is no longer active.</p> : currentUser ? <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleJoin} disabled={joining}>{joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept and join team'}</Button> : <div className="space-y-2"><p className="text-sm text-center text-slate-500">Sign in or create a Liverton account to accept this invitation.</p><Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"><Link to="/login">Sign in to join</Link></Button><Button asChild variant="outline" className="w-full"><Link to="/register">Create an account</Link></Button></div>}</CardContent></Card></div>;
}
