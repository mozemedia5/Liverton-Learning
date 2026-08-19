import { ArrowRight, BookOpen, Heart, Package, Search, ShoppingBag, Star, Store, Tag, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const products = [
  { name: 'Creative science project kit', seller: 'Maya’s Classroom', price: '$24', rating: '4.9', category: 'Project kits', color: '#c9f36b' },
  { name: 'The young learner reading set', seller: 'Liverton Books', price: '$18', rating: '4.8', category: 'Books', color: '#bca7ff' },
  { name: 'Design thinking lesson pack', seller: 'Community educator', price: '$12', rating: '5.0', category: 'Lesson packs', color: '#8de5dc' },
  { name: 'School essentials bundle', seller: 'Northside Learning Hub', price: '$32', rating: '4.7', category: 'School items', color: '#ffbf8a' },
];

export default function LiveMart() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');
  const categories = ['All', 'Project kits', 'Books', 'Lesson packs', 'School items'];
  const visibleProducts = category === 'All' ? products : products.filter((product) => product.category === category);
  return <AuthenticatedLayout><div className="lm-page"><header className="lm-header"><div><span className="lp-overline">Share & sell</span><h1>LivMart</h1><p>Where completed projects become the next person’s starting point.</p></div><button className="lm-primary" onClick={() => navigate('/features/liv-mart/sell')}><Store size={16} /> Sell something</button></header><section className="lm-hero"><div><span className="lm-kicker"><ShoppingBag size={14} /> The learning marketplace</span><h2>Find tools for<br /><em>what’s next.</em></h2><p>Shop trusted resources from educators, schools, and organizations—or give your own work a second life.</p><div className="lm-search"><Search size={17} /><input placeholder="Search books, kits, lesson packs..." aria-label="Search marketplace" /></div></div><div className="lm-hero-card"><Package size={24} /><strong>2.4k</strong><span>resources shared by the community</span><div className="lm-stack"><i /><i /><i /></div></div></section><div className="lm-trust"><div><Users size={17} /><span>Made by educators</span></div><div><Tag size={17} /><span>Fair creator pricing</span></div><div><BookOpen size={17} /><span>Learning-first products</span></div></div><section className="lm-list"><div className="lm-list-heading"><div><span className="lp-overline">Browse the shelf</span><h2>Good things to learn with</h2></div><button>View all <ArrowRight size={15} /></button></div><div className="lm-categories">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="lm-grid">{visibleProducts.map((product) => <article className="lm-card" key={product.name}><div className="lm-card-art" style={{ background: `linear-gradient(135deg, ${product.color}, #fff)` }}><span>{product.category}</span><Heart size={17} /></div><div className="lm-card-body"><small>{product.seller}</small><h3>{product.name}</h3><div className="lm-rating"><Star size={13} fill="currentColor" /> {product.rating} <span>· instant access</span></div><div className="lm-card-footer"><strong>{product.price}</strong><button>View item <ArrowRight size={14} /></button></div></div></article>)}</div></section></div></AuthenticatedLayout>;
}
