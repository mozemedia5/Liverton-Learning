import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Heart, Loader2, Package, Search, ShoppingBag, Star, Store, Tag, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getTeamsForUser } from '@/services/livTeamsCoreService';
import { getTeamProjectsForEconomicFeatures, getLivMartListings, createLivMartListing, createPendingLivMartOrder } from '@/services/livFundMartService';
import type { MarketplaceItem, TeamProject } from '@/types/livTeams';

const formatPrice = (item: MarketplaceItem) => `${item.currency || 'UGX'} ${((item.priceMinor ?? Math.round((item.price || 0) * 100)) / 100).toLocaleString()}`;

export default function LiveMart() {
  const { currentUser, userData } = useAuth();
  const [products, setProducts] = useState<MarketplaceItem[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sellOpen, setSellOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', category: 'Educational resource', price: '', deliverables: '', licensingTerms: '', deliveryMethod: 'digital' as 'digital' | 'service' | 'physical', supportTerms: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [listings, teams] = await Promise.all([getLivMartListings(), currentUser ? getTeamsForUser(currentUser.uid) : Promise.resolve([])]);
      const ownedTeams = teams.filter(team => team.members.some(member => member.userId === currentUser?.uid));
      const projectGroups = await Promise.all(ownedTeams.map(team => getTeamProjectsForEconomicFeatures(team.id)));
      setProducts(listings); setProjects(projectGroups.flat());
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load LivMart'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [currentUser?.uid]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(product => product.category).filter(Boolean) as string[]))], [products]);
  const visibleProducts = products.filter(product => (category === 'All' || product.category === category) && `${product.title} ${product.description} ${product.sellerName || ''}`.toLowerCase().includes(search.toLowerCase()));
  const selectedProject = projects.find(project => project.id === form.projectId);


  const sell = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedProject) return;
    setSaving(true);
    try {
      await createLivMartListing({ project: selectedProject, sellerId: currentUser.uid, sellerName: userData?.fullName || currentUser.displayName || 'Seller', title: form.title, description: form.description, category: form.category, priceMinor: Math.round(Number(form.price) * 100), currency: 'UGX', deliverables: form.deliverables.split('\n').map(item => item.trim()).filter(Boolean), licensingTerms: form.licensingTerms, deliveryMethod: form.deliveryMethod, supportTerms: form.supportTerms });
      toast.success('Listing submitted for marketplace review. It is not public until approved.');
      setSellOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not submit listing'); }
    finally { setSaving(false); }
  };

  const buy = async (product: MarketplaceItem) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await createPendingLivMartOrder({ listingId: product.id, buyerId: currentUser.uid, provider: 'pending-provider-setup', idempotencyKey: `${product.id}-${currentUser.uid}-${Date.now()}` });
      toast.success('Order created as Payment Pending. Access is granted only after verified payment and fulfillment.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create order'); }
    finally { setSaving(false); }
  };

  return <AuthenticatedLayout><div className="lm-page"><header className="lm-header"><div><span className="lp-overline">Share & sell</span><h1>LivMart</h1><p>Where verified completed projects become the next person’s starting point.</p></div><Button className="lm-primary" onClick={() => setSellOpen(true)}><Store size={16} /> Submit a project</Button></header><section className="lm-hero"><div><span className="lm-kicker"><ShoppingBag size={14} /> The learning marketplace</span><h2>Find tools for<br /><em>what’s next.</em></h2><p>Every public listing references a source project, defines its deliverables, and remains separate from the project’s completion and verification history.</p><div className="lm-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search approved listings..." aria-label="Search marketplace" /></div></div><div className="lm-hero-card"><Package size={24} /><strong>{products.length}</strong><span>approved listings</span><div className="lm-stack"><i /><i /><i /></div></div></section><div className="lm-trust"><div><Users size={17} /><span>Project-linked sellers</span></div><div><Tag size={17} /><span>Backend pricing</span></div><div><BookOpen size={17} /><span>Controlled fulfillment</span></div></div><section className="lm-list"><div className="lm-list-heading"><div><span className="lp-overline">Browse the shelf</span><h2>Approved deliverables</h2></div></div><div className="lm-categories">{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>{loading ? <div className="flex items-center gap-2 p-8"><Loader2 className="animate-spin" /> Loading approved listings…</div> : <div className="lm-grid">{visibleProducts.length === 0 ? <div className="p-8 text-slate-500">No approved listings match this search. Completed projects can be submitted for marketplace review.</div> : visibleProducts.map(product => <article className="lm-card" key={product.id}><div className="lm-card-art" style={{ background: 'linear-gradient(135deg, #c9f36b, #fff)' }}><span>{product.category || 'Project deliverable'}</span><Heart size={17} /></div><div className="lm-card-body"><small>{product.sellerName || product.teamName}</small><h3>{product.title}</h3><p>{product.description}</p><div className="lm-rating"><Star size={13} fill="currentColor" /> {product.ratings?.length ? (product.ratings.reduce((sum, review) => sum + review.rating, 0) / product.ratings.length).toFixed(1) : 'New'} <span>· {product.deliveryMethod || 'digital'}</span></div><div className="lm-card-footer"><strong>{formatPrice(product)}</strong><Button disabled={saving} onClick={() => void buy(product)}>Start order <ArrowRight size={14} /></Button></div></div></article>)}</div>}</section><Dialog open={sellOpen} onOpenChange={setSellOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Submit a project to LivMart</DialogTitle><DialogDescription>Only Completed projects are eligible. Submission enters Marketplace Review; completion does not automatically publish a listing.</DialogDescription></DialogHeader><form onSubmit={sell} className="space-y-3"><div><Label>Source project</Label><select className="w-full border rounded-md p-2" value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">Select completed project</option>{projects.filter(project => project.status === 'Completed').map(project => <option key={project.id} value={project.id}>{project.name} · Completed</option>)}</select></div><Input placeholder="Listing title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /><Textarea placeholder="What is the buyer receiving?" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required /><Input placeholder="Category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required /><Input type="number" min="0" placeholder="Price in UGX" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} required /><Textarea placeholder="One deliverable per line" value={form.deliverables} onChange={event => setForm({ ...form, deliverables: event.target.value })} required /><Textarea placeholder="Licensing terms" value={form.licensingTerms} onChange={event => setForm({ ...form, licensingTerms: event.target.value })} required /><select className="w-full border rounded-md p-2" value={form.deliveryMethod} onChange={event => setForm({ ...form, deliveryMethod: event.target.value as 'digital' | 'service' | 'physical' })}><option value="digital">Digital</option><option value="service">Service</option><option value="physical">Physical</option></select><Input placeholder="Support terms (optional)" value={form.supportTerms} onChange={event => setForm({ ...form, supportTerms: event.target.value })} /><DialogFooter><Button type="submit" disabled={saving || !selectedProject}>{saving ? <Loader2 className="animate-spin" /> : 'Submit for review'}</Button></DialogFooter></form></DialogContent></Dialog></div></AuthenticatedLayout>;
}
