import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getAllLivMartSubmissions, reviewLivMartListing } from '@/services/livFundMartService';
import type { MarketplaceItem } from '@/types/livTeams';

export default function LivMartModeration() {
  const { currentUser, userRole } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await getAllLivMartSubmissions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load LivMart submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (item: MarketplaceItem, status: 'Listed' | 'Rejected') => {
    if (!currentUser || userRole !== 'platform_admin') return;
    if (status === 'Rejected' && !notes[item.id]?.trim()) {
      toast.error('Add a moderation note when rejecting a listing.');
      return;
    }
    setActionId(item.id);
    try {
      await reviewLivMartListing({ listingId: item.id, status, reviewerId: currentUser.uid, moderationNote: notes[item.id] });
      toast.success(status === 'Listed' ? 'LivMart listing approved and published.' : 'LivMart listing rejected.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the listing.');
    } finally {
      setActionId(null);
    }
  };

  if (userRole !== 'platform_admin') return <div className="p-8 text-center text-red-500">Only Platform Administrators can review LivMart listings.</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">LivMart Listing Review</h1><p className="mt-2 text-gray-600 dark:text-gray-400">Review project submissions before they become publicly purchasable.</p></div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div> : items.length === 0 ? <Card><CardContent className="py-16 text-center text-gray-500">No LivMart submissions found.</CardContent></Card> : <div className="space-y-4">{items.map(item => <Card key={item.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{item.title}</CardTitle><CardDescription>{item.teamName || 'Liverton Team'} · {item.sellerName || 'Seller'}</CardDescription></div><Badge variant={item.status === 'Listed' ? 'default' : item.status === 'Rejected' ? 'destructive' : 'secondary'}>{item.status}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-[1fr_auto]"><div><p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p><p className="mt-2 text-xs text-gray-500">Category: {item.category || 'Uncategorized'} · Price: {item.currency || 'UGX'} {item.priceMinor ?? 0}</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Deliverables: {(item.deliverables || []).join(', ')}</p></div>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">Open source project <ExternalLink className="h-3.5 w-3.5" /></a>}</div>{item.status === 'Marketplace Review' && <><Textarea placeholder="Moderation note (required for rejection)" value={notes[item.id] || ''} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} /><div className="flex flex-wrap gap-2"><Button disabled={actionId === item.id} onClick={() => void review(item, 'Listed')}><CheckCircle2 className="mr-2 h-4 w-4" /> Approve and publish</Button><Button variant="destructive" disabled={actionId === item.id} onClick={() => void review(item, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button></div></>}{item.moderationNote && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400"><strong>Moderation note:</strong> {item.moderationNote}</p>}</CardContent></Card>)}</div>}
    </div>
  );
}
