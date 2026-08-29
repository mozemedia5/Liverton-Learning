/**
 * Starter templates for the Documents feature (WPS/Microsoft 365-style
 * template gallery). Each template produces the canonical document content
 * shape consumed by the Enhanced editors.
 */

import type { DocumentContent, PresentationSlide } from '@/types';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'doc' | 'sheet' | 'presentation';
  buildContent: () => DocumentContent;
  buildTitle: () => string;
}

/* ------------------------------- Word (doc) ------------------------------- */

const proposalHtml = `
<h1>Project Proposal</h1>
<p><em>Prepared by: Your Name &nbsp;•&nbsp; Date: ${new Date().toLocaleDateString()}</em></p>
<hr>
<h2>1. Executive Summary</h2>
<p>Write a short, compelling summary of the project here. What problem does it solve, who benefits, and why now?</p>
<h2>2. Objectives</h2>
<ul>
  <li><strong>Objective 1:</strong> Describe the first measurable goal.</li>
  <li><strong>Objective 2:</strong> Describe the second measurable goal.</li>
  <li><strong>Objective 3:</strong> Describe the third measurable goal.</li>
</ul>
<h2>3. Methodology</h2>
<p>Explain the approach, tools and timeline you will use to deliver the work.</p>
<blockquote>Tip: break big milestones into weekly deliverables your team can review.</blockquote>
<h2>4. Budget Overview</h2>
<p>Summarize expected costs and link to your budget spreadsheet for details.</p>
<h2>5. Team &amp; Roles</h2>
<ol>
  <li>Project Lead — name</li>
  <li>Research — name</li>
  <li>Design &amp; Build — name</li>
  <li>Presentation — name</li>
</ol>
<h2>6. Next Steps</h2>
<p>List the immediate actions required to approve and kick off the project.</p>
`.trim();

/* ---------------------------- Spreadsheet (sheet) ---------------------------- */

const budgetCells: Record<string, string> = {
  A1: JSON.stringify({ value: 'Item', format: { bold: true, backgroundColor: '#d1fae5' } }),
  B1: JSON.stringify({ value: 'Category', format: { bold: true, backgroundColor: '#d1fae5' } }),
  C1: JSON.stringify({ value: 'Qty', format: { bold: true, backgroundColor: '#d1fae5' } }),
  D1: JSON.stringify({ value: 'Unit Cost', format: { bold: true, backgroundColor: '#d1fae5' } }),
  E1: JSON.stringify({ value: 'Total', format: { bold: true, backgroundColor: '#d1fae5' } }),

  A2: 'Arduino Starter Kit',
  B2: 'Hardware',
  C2: '2',
  D2: '185000',
  E2: '=C2*D2',

  A3: 'Ultrasonic Sensors',
  B3: 'Hardware',
  C3: '4',
  D3: '15000',
  E3: '=C3*D3',

  A4: 'Robot Chassis',
  B4: 'Hardware',
  C4: '1',
  D4: '95000',
  E4: '=C4*D4',

  A5: 'Workshop Venue',
  B5: 'Logistics',
  C5: '2',
  D5: '50000',
  E5: '=C5*D5',

  A6: 'Printing & Posters',
  B6: 'Marketing',
  C6: '10',
  D6: '5000',
  E6: '=C6*D6',

  A8: JSON.stringify({ value: 'TOTAL BUDGET', format: { bold: true, backgroundColor: '#fef3c7' } }),
  E8: JSON.stringify({ value: '=SUM(E2:E6)', format: { bold: true, backgroundColor: '#fef3c7' } }),

  A9: 'Contingency (10%)',
  E9: '=E8*0.1',

  A10: JSON.stringify({ value: 'GRAND TOTAL', format: { bold: true, backgroundColor: '#fde68a' } }),
  E10: JSON.stringify({ value: '=E8+E9', format: { bold: true, backgroundColor: '#fde68a' } }),

  A12: JSON.stringify({ value: 'Notes:', format: { italic: true } }),
  A13: 'Try editing quantities or costs — totals update automatically (live formulas).',
};

/* --------------------------- Presentation (slides) --------------------------- */

function el(id: string, text: string, x: number, y: number, w: number, h: number, fontSize: number, opts: { bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' } = {}) {
  return { id, type: 'text' as const, x, y, w, h, text, fontSize, ...opts };
}

const pitchSlides: PresentationSlide[] = [
  {
    id: 'slide-1',
    layout: 'title',
    elements: [
      el('t1', 'AgriBot: Smart Farming Assistant', 60, 180, 840, 90, 44, { bold: true, align: 'center' }),
      el('t2', 'A robotics project by the Agri Innovation Team', 60, 290, 840, 50, 22, { italic: true, align: 'center' }),
      el('t3', new Date().toLocaleDateString(), 60, 450, 840, 30, 16, { align: 'center' }),
    ],
  },
  {
    id: 'slide-2',
    layout: 'title_content',
    elements: [
      el('t1', 'The Problem', 40, 30, 880, 60, 32, { bold: true }),
      el('t2', '• Small-scale farmers lose up to 30% of crops to irregular watering\n• Manual monitoring is slow, inaccurate and expensive\n• Existing smart-farm solutions cost millions of shillings', 60, 120, 840, 200, 20),
      el('t3', 'Our goal: an affordable, solar-powered field robot that monitors soil moisture and waters crops automatically.', 60, 340, 840, 120, 20, { italic: true }),
    ],
  },
  {
    id: 'slide-3',
    layout: 'title_content',
    elements: [
      el('t1', 'Our Solution & Progress', 40, 30, 880, 60, 32, { bold: true }),
      el('t2', '• Built a working prototype with 92% watering accuracy\n• Cost per unit: UGX 380,000 (10x cheaper than imports)\n• Tested on 3 school garden plots for 6 weeks\n• Next: pilot with 10 local farmers this season', 60, 120, 840, 240, 20),
    ],
  },
  {
    id: 'slide-4',
    layout: 'title',
    elements: [
      el('t1', 'Thank You!', 60, 200, 840, 90, 48, { bold: true, align: 'center' }),
      el('t2', 'Questions & live demo at our booth', 60, 300, 840, 50, 22, { align: 'center' }),
    ],
  },
];

/* ------------------------------ Template registry ------------------------------ */

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'doc-blank',
    name: 'Blank Document',
    description: 'Start from an empty page',
    type: 'doc',
    buildTitle: () => 'Untitled Document',
    buildContent: () => ({ kind: 'doc', html: '<p>Start writing...</p>' }),
  },
  {
    id: 'doc-proposal',
    name: 'Project Proposal (Demo)',
    description: 'Structured proposal with sections, lists and budget — WPS-style sample',
    type: 'doc',
    buildTitle: () => 'Project Proposal',
    buildContent: () => ({ kind: 'doc', html: proposalHtml }),
  },
  {
    id: 'sheet-blank',
    name: 'Blank Spreadsheet',
    description: 'Empty grid with live formula support',
    type: 'sheet',
    buildTitle: () => 'Untitled Spreadsheet',
    buildContent: () => ({ kind: 'sheet', cells: {} }),
  },
  {
    id: 'sheet-budget',
    name: 'Budget Tracker (Demo)',
    description: 'Live formulas: line totals, SUM, contingency and grand total',
    type: 'sheet',
    buildTitle: () => 'Project Budget Tracker',
    buildContent: () => ({ kind: 'sheet', cells: { ...budgetCells } }),
  },
  {
    id: 'pres-blank',
    name: 'Blank Presentation',
    description: 'Start with a single empty slide',
    type: 'presentation',
    buildTitle: () => 'Untitled Presentation',
    buildContent: () => ({
      kind: 'presentation',
      slides: [{ id: 'slide-1', layout: 'blank', elements: [] }],
    }),
  },
  {
    id: 'pres-pitch',
    name: 'Project Pitch Deck (Demo)',
    description: '4-slide deck: title, problem, solution, thank-you',
    type: 'presentation',
    buildTitle: () => 'Science Fair Pitch',
    buildContent: () => ({ kind: 'presentation', slides: pitchSlides }),
  },
];

export function templatesForType(type: 'doc' | 'sheet' | 'presentation'): DocumentTemplate[] {
  return documentTemplates.filter(t => t.type === type);
}
