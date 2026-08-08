import { useState } from 'react';
import { Check, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';

/**
 * Lightweight markdown renderer for Hanna AI replies.
 * Supports: code fences (with copy button), inline code, bold, italic,
 * headings, unordered/ordered lists, markdown images, markdown links and paragraphs — no dependencies.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  // Let's iterate over inline segments, checking for images, links, code, bold, italic.
  // To keep it simple, robust, and fast, we first tokenise on markdown images and markdown links.
  const inlineTokens: { type: 'text' | 'image' | 'link'; content: string; alt?: string; url?: string }[] = [];

  const complexRegex = /(!\[[^\]]*?\]\(https?:\/\/[^\s)]+\)|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts = text.split(complexRegex);

  parts.forEach((part) => {
    if (part.startsWith('![') && part.includes('](')) {
      const alt = part.slice(2, part.indexOf(']'));
      const url = part.slice(part.indexOf('](') + 2, -1);
      inlineTokens.push({ type: 'image', content: part, alt, url });
    } else if (part.startsWith('[') && part.includes('](')) {
      const label = part.slice(1, part.indexOf(']'));
      const url = part.slice(part.indexOf('](') + 2, -1);
      inlineTokens.push({ type: 'link', content: label, url });
    } else if (part) {
      inlineTokens.push({ type: 'text', content: part });
    }
  });

  inlineTokens.forEach((token, tIdx) => {
    const key = `${keyPrefix}-token-${tIdx}`;
    if (token.type === 'image' && token.url) {
      nodes.push(
        <span key={key} className="block my-4 max-w-full overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 p-2 backdrop-blur-md shadow-xl transition-all hover:scale-[1.01]">
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/30 dark:border-white/5 mb-2">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Hanna Visual Illustration: {token.alt || 'Diagram'}</span>
          </span>
          <img
            src={token.url}
            alt={token.alt || 'Hanna AI Generated Visual'}
            className="block w-full max-h-[420px] object-cover rounded-2xl"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </span>
      );
    } else if (token.type === 'link' && token.url) {
      nodes.push(
        <a
          key={key}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline hover:text-emerald-500 transition-colors"
        >
          {token.content}
          <ExternalLink className="w-3 h-3 stroke-[2.5]" />
        </a>
      );
    } else {
      // Split on inline code: `code`
      const codeParts = token.content.split(/(`[^`]+`)/g);
      codeParts.forEach((cPart, i) => {
        const cKey = `${key}-${i}`;
        if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length > 2) {
          nodes.push(
            <code key={cKey} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[0.85em] font-mono text-emerald-700 dark:text-emerald-300">
              {cPart.slice(1, -1)}
            </code>
          );
          return;
        }
        // Bold **text** and italic *text*
        const boldParts = cPart.split(/(\*\*[^*]+\*\*)/g);
        boldParts.forEach((bp, j) => {
          const bKey = `${cKey}-${j}`;
          if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
            nodes.push(<strong key={bKey} className="font-extrabold text-slate-900 dark:text-white">{bp.slice(2, -2)}</strong>);
            return;
          }
          const italicParts = bp.split(/(\*[^*]+\*|_[^_]+_)/g);
          italicParts.forEach((ip, k) => {
            const iKey = `${bKey}-${k}`;
            if ((ip.startsWith('*') && ip.endsWith('*') && ip.length > 2) || (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2)) {
              nodes.push(<em key={iKey} className="italic text-slate-700 dark:text-slate-300">{ip.slice(1, -1)}</em>);
            } else if (ip) {
              nodes.push(<span key={iKey}>{ip}</span>);
            }
          });
        });
      });
    }
  });

  return nodes;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-white/10">
        <span className="text-[11px] text-slate-400 font-mono">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed text-slate-100 font-mono whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

export function HannaMarkdown({ text }: { text: string }) {
  // Split into code fences vs regular content
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-[15px] leading-relaxed break-words">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```')) {
          const inner = segment.slice(3, -3);
          const firstLineBreak = inner.indexOf('\n');
          const lang = firstLineBreak > 0 ? inner.slice(0, firstLineBreak).trim() : '';
          const code = firstLineBreak > 0 ? inner.slice(firstLineBreak + 1) : inner;
          return <CodeBlock key={segIdx} code={code} lang={lang} />;
        }

        const lines = segment.split('\n');
        const blocks: React.ReactNode[] = [];
        let listItems: { ordered: boolean; items: string[] } | null = null;

        const flushList = (idx: number) => {
          if (!listItems || listItems.items.length === 0) return;
          const ListTag = listItems.ordered ? 'ol' : 'ul';
          blocks.push(
            <ListTag key={`list-${idx}`} className={`${listItems.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 my-1.5`}>
              {listItems.items.map((item, i) => (
                <li key={i}>{renderInline(item, `li-${idx}-${i}`)}</li>
              ))}
            </ListTag>
          );
          listItems = null;
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();
          const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
          const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);

          if (bullet || numbered) {
            const ordered = !!numbered;
            const content = (bullet?.[1] || numbered?.[1]) ?? '';
            if (!listItems || listItems.ordered !== ordered) {
              flushList(lineIdx);
              listItems = { ordered, items: [] };
            }
            listItems!.items.push(content);
            return;
          }

          flushList(lineIdx);

          if (!trimmed) {
            return;
          }
          if (trimmed.startsWith('### ')) {
            blocks.push(<h4 key={lineIdx} className="font-bold text-base pt-2 text-slate-800 dark:text-white">{renderInline(trimmed.slice(4), `h4-${lineIdx}`)}</h4>);
          } else if (trimmed.startsWith('## ')) {
            blocks.push(<h3 key={lineIdx} className="font-bold text-lg pt-2 text-slate-800 dark:text-white">{renderInline(trimmed.slice(3), `h3-${lineIdx}`)}</h3>);
          } else if (trimmed.startsWith('# ')) {
            blocks.push(<h2 key={lineIdx} className="font-bold text-xl pt-2 text-slate-800 dark:text-white">{renderInline(trimmed.slice(2), `h2-${lineIdx}`)}</h2>);
          } else {
            blocks.push(<p key={lineIdx} className="leading-relaxed">{renderInline(line, `p-${lineIdx}`)}</p>);
          }
        });
        flushList(-1);

        return <div key={segIdx} className="space-y-1.5">{blocks}</div>;
      })}
    </div>
  );
}
