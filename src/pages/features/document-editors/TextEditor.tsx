import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Table,
  FileDown,
} from 'lucide-react';
import type { DocumentContent } from '@/types';

function exec(cmd: string, value?: string) {
  // Deprecated but widely supported and OK for an MVP Office-like editor.
  document.execCommand(cmd, false, value);
}

function getWordCountFromHtml(html: string) {
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').length;
}

export function TextEditor(props: {
  content: Extract<DocumentContent, { kind: 'doc' }>;
  onChange: (next: Extract<DocumentContent, { kind: 'doc' }>) => void;
  saving: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('3'); // execCommand uses 1-7
  const [margin, setMargin] = useState<'normal' | 'wide' | 'narrow'>('normal');

  const wordCount = useMemo(() => getWordCountFromHtml(props.content.html), [props.content.html]);

  useEffect(() => {
    // Keep editor in sync on load
    if (editorRef.current && editorRef.current.innerHTML !== props.content.html) {
      editorRef.current.innerHTML = props.content.html;
    }
  }, [props.content.html]);

  const pushChange = () => {
    const html = editorRef.current?.innerHTML ?? '';
    props.onChange({ kind: 'doc', html });
  };

  const onInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        exec('insertImage', url);
        pushChange();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const onInsertTable = () => {
    const rows = Number(window.prompt('Rows?', '3') || '3');
    const cols = Number(window.prompt('Columns?', '3') || '3');
    if (!rows || !cols) return;

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.setAttribute('border', '1');

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.style.padding = '8px';
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    exec('insertHTML', table.outerHTML);
    pushChange();
  };

  const onExportPdf = () => {
    // True PDF export requires a PDF renderer. For now we provide print-to-PDF.
    window.print();
  };

  const pagePadding =
    margin === 'wide' ? 'px-12 md:px-16' : margin === 'narrow' ? 'px-4 md:px-6' : 'px-8 md:px-12';

  return (
    <div className="space-y-4">
      {/* Ribbon */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => exec('bold')}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('italic')}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('underline')}>
              <Underline className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Input
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                exec('fontName', e.target.value);
              }}
              className="w-36 h-9"
              placeholder="Font"
            />
            <Input
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                exec('fontSize', e.target.value);
              }}
              className="w-20 h-9"
              placeholder="Size"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => exec('justifyLeft')}>
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('justifyCenter')}>
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('justifyRight')}>
              <AlignRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => exec('insertUnorderedList')}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('insertOrderedList')}>
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => exec('formatBlock', 'H1')}>
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('formatBlock', 'H2')}>
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exec('formatBlock', 'H3')}>
              <Heading3 className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onInsertImage}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onInsertTable}>
              <Table className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button
              variant={margin === 'narrow' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMargin('narrow')}
            >
              Narrow
            </Button>
            <Button
              variant={margin === 'normal' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMargin('normal')}
            >
              Normal
            </Button>
            <Button variant={margin === 'wide' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMargin('wide')}>
              Wide
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExportPdf}>
              <FileDown className="w-4 h-4 mr-2" />
              Export (PDF)
            </Button>
          </div>
        </div>

        <div className="px-3 pb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            Words: <span className="font-medium text-gray-700 dark:text-gray-200">{wordCount}</span>
          </div>
          <div className={cn('font-medium', props.saving ? 'text-gray-500' : 'text-gray-500')}>
            {props.saving ? 'Saving…' : 'Saved'}
          </div>
        </div>
      </div>

      {/* Page */}
      <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black', pagePadding)}>
        <div
          ref={editorRef}
          className={cn(
            'min-h-[60vh] py-10 outline-none prose prose-sm md:prose-base dark:prose-invert max-w-none',
            'prose-headings:scroll-mt-24'
          )}
          contentEditable
          suppressContentEditableWarning
          onInput={pushChange}
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Tip: Use <span className="font-mono">Ctrl/Cmd + P</span> to print, and choose “Save as PDF”.
      </div>
    </div>
  );
}
