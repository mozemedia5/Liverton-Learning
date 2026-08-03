import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Lightweight markdown renderer for Hanna AI replies.
 * Supports: code fences (with copy button), inline code, bold, italic,
 * headings, unordered/ordered lists and paragraphs — no dependencies.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on inline code first: `code`
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code key={key} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[0.85em] font-mono text-emerald-700 dark:text-emerald-300">
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    // Bold **text** and italic *text*
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp, j) => {
      const bKey = `${key}-${j}`;
      if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
        nodes.push(<strong key={bKey}>{bp.slice(2, -2)}</strong>);
        return;
      }
      const italicParts = bp.split(/(\*[^*]+\*|_[^_]+_)/g);
      italicParts.forEach((ip, k) => {
        const iKey = `${bKey}-${k}`;
        if ((ip.startsWith('*') && ip.endsWith('*') && ip.length > 2) || (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2)) {
          nodes.push(<em key={iKey}>{ip.slice(1, -1)}</em>);
        } else if (ip) {
          nodes.push(<span key={iKey}>{ip}</span>);
        }
      });
    });
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
    <div className="space-y-2 text-[15px] leading-relaxed">
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
            <ListTag key={`list-${idx}`} className={`${listItems.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
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
            blocks.push(<h4 key={lineIdx} className="font-bold text-base pt-2">{renderInline(trimmed.slice(4), `h4-${lineIdx}`)}</h4>);
          } else if (trimmed.startsWith('## ')) {
            blocks.push(<h3 key={lineIdx} className="font-bold text-lg pt-2">{renderInline(trimmed.slice(3), `h3-${lineIdx}`)}</h3>);
          } else if (trimmed.startsWith('# ')) {
            blocks.push(<h2 key={lineIdx} className="font-bold text-xl pt-2">{renderInline(trimmed.slice(2), `h2-${lineIdx}`)}</h2>);
          } else {
            blocks.push(<p key={lineIdx}>{renderInline(trimmed, `p-${lineIdx}`)}</p>);
          }
        });
        flushList(-1);

        return <div key={segIdx} className="space-y-1.5">{blocks}</div>;
      })}
    </div>
  );
}
