import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  approveLivTeamPromotion,
  getLivTeamPromotions,
  promotionStatusLabel,
  rejectLivTeamPromotion,
  type LivTeamPromotion,
} from '@/services/livTeamsPromotionService';

export default function LivTeamsPromotionModeration() {
  const { currentUser, userRole } = useAuth();
  const [promotions, setPromotions] = useState<LivTeamPromotion[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setPromotions(await getLivTeamPromotions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load promotion submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (promotion: LivTeamPromotion, status: 'approved' | 'rejected') => {
    if (!currentUser || userRole !== 'platform_admin') return;
    if (status === 'rejected' && !notes[promotion.id]?.trim()) {
      toast.error('Add a moderation note when rejecting a submission.');
      return;
    }
    setActionId(promotion.id);
    try {
      if (status === 'approved') {
        await approveLivTeamPromotion(promotion.id, currentUser.uid, notes[promotion.id] || 'Approved for publication.');
      } else {
        await rejectLivTeamPromotion(promotion.id, currentUser.uid, notes[promotion.id].trim());
      }
      toast.success(status === 'approved' ? 'Promotion approved and published.' : 'Promotion rejected.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update promotion.');
    } finally {
      setActionId(null);
    }
  };

  if (userRole !== 'platform_admin') {
    return <div className="p-8 text-center text-red-500">Only Platform Administrators can review promotions.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Liv Teams Promotion Review</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Approve promotional content before it appears in the public Liv Teams rail.</p>
      </div>
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" /></div> : promotions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-500">No promotion submissions yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion) => (
            <Card key={promotion.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{promotion.title}</CardTitle>
                    <CardDescription>{promotion.teamName} · submitted by {promotion.createdByName}</CardDescription>
                  </div>
                  <Badge variant={promotion.status === 'approved' ? 'default' : promotion.status === 'rejected' ? 'destructive' : 'secondary'}>{promotionStatusLabel(promotion.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  {promotion.imageUrl && <img src={promotion.imageUrl} alt="" className="h-32 w-full rounded-xl object-cover" />}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{promotion.description}</p>
                    <a href={promotion.destinationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">Open destination <ExternalLink className="h-3.5 w-3.5" /></a>
                    {promotion.expiresAt && <p className="text-xs text-gray-500">Expires {promotion.expiresAt.toLocaleDateString()}</p>}
                  </div>
                </div>
                {promotion.status === 'pending' && <>
                  <Textarea placeholder="Moderation note (required for rejection)" value={notes[promotion.id] || ''} onChange={e => setNotes(current => ({ ...current, [promotion.id]: e.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={actionId === promotion.id} onClick={() => void review(promotion, 'approved')}><CheckCircle2 className="mr-2 h-4 w-4" /> Approve and publish</Button>
                    <Button variant="destructive" disabled={actionId === promotion.id} onClick={() => void review(promotion, 'rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                  </div>
                </>}
                {promotion.moderationNote && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400"><strong>Moderation note:</strong> {promotion.moderationNote}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
