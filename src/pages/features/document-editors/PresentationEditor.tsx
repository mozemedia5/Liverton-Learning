import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Play,
  FileDown,
  Move,
} from 'lucide-react';
import type { DocumentContent, PresentationElement, PresentationSlide } from '@/types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function downloadPdfViaPrint() {
  window.print();
}

export function PresentationEditor(props: {
  content: Extract<DocumentContent, { kind: 'presentation' }>;
  onChange: (next: Extract<DocumentContent, { kind: 'presentation' }>) => void;
  saving: boolean;
}) {
  const [selectedSlideId, setSelectedSlideId] = useState<string>(props.content.slides[0]?.id ?? '');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const slides = props.content.slides;

  const slide = useMemo(() => slides.find((s) => s.id === selectedSlideId) ?? slides[0], [slides, selectedSlideId]);

  const setSlides = (next: PresentationSlide[]) => {
    props.onChange({ kind: 'presentation', slides: next });
  };

  const addSlide = () => {
    const id = crypto.randomUUID();
    const next: PresentationSlide = { id, layout: 'blank', elements: [] };
    setSlides([...slides, next]);
    setSelectedSlideId(id);
    setSelectedElementId(null);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) {
      toast.error('At least one slide is required.');
      return;
    }
    const next = slides.filter((s) => s.id !== selectedSlideId);
    setSlides(next);
    setSelectedSlideId(next[0].id);
    setSelectedElementId(null);
  };

  const updateSlide = (id: string, updater: (s: PresentationSlide) => PresentationSlide) => {
    setSlides(slides.map((s) => (s.id === id ? updater(s) : s)));
  };

  const addText = () => {
    if (!slide) return;
    const el: PresentationElement = {
      id: crypto.randomUUID(),
      type: 'text',
      x: 80,
      y: 80,
      w: 400,
      h: 80,
      text: 'Text',
      fontSize: 28,
      bold: false,
      italic: false,
      align: 'left',
    };
    updateSlide(slide.id, (s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElementId(el.id);
  };

  const addShape = (shape: 'rect' | 'ellipse') => {
    if (!slide) return;
    const el: PresentationElement = {
      id: crypto.randomUUID(),
      type: 'shape',
      x: 120,
      y: 120,
      w: 200,
      h: 120,
      shape,
    };
    updateSlide(slide.id, (s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElementId(el.id);
  };

  const addImage = () => {
    if (!slide) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        const el: PresentationElement = {
          id: crypto.randomUUID(),
          type: 'image',
          x: 120,
          y: 120,
          w: 360,
          h: 220,
          url,
        };
        updateSlide(slide.id, (s) => ({ ...s, elements: [...s.elements, el] }));
        setSelectedElementId(el.id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const deleteElement = () => {
    if (!slide || !selectedElementId) return;
    updateSlide(slide.id, (s) => ({ ...s, elements: s.elements.filter((e) => e.id !== selectedElementId) }));
    setSelectedElementId(null);
  };

  const updateElement = (updater: (e: PresentationElement) => PresentationElement) => {
    if (!slide || !selectedElementId) return;
    updateSlide(slide.id, (s) => ({
      ...s,
      elements: s.elements.map((e) => (e.id === selectedElementId ? updater(e) : e)),
    }));
  };

  const selectedEl = useMemo(
    () => (slide ? slide.elements.find((e) => e.id === selectedElementId) ?? null : null),
    [slide, selectedElementId]
  );

  const onPresent = () => {
    // Simple present mode using a new window
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <html>
        <head>
          <title>Present</title>
          <style>
            body{margin:0;background:#000;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;}
            .slide{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;}
            .frame{width:min(1000px,92vw);height:min(562px,52vw);background:#fff;color:#000;position:relative;box-shadow:0 12px 40px rgba(0,0,0,.35);}
            .el{position:absolute;}
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            const slides = ${JSON.stringify(slides)};
            let idx = 0;
            const root = document.getElementById('root');
            function render(){
              const s = slides[idx];
              root.innerHTML = '';
              const wrap = document.createElement('div');
              wrap.className = 'slide';
              const frame = document.createElement('div');
              frame.className = 'frame';
              for (const el of s.elements){
                const div = document.createElement('div');
                div.className = 'el';
                div.style.left = el.x+'px';
                div.style.top = el.y+'px';
                div.style.width = el.w+'px';
                div.style.height = el.h+'px';
                if (el.type==='text'){
                  div.style.fontSize = (el.fontSize||24)+'px';
                  div.style.fontWeight = el.bold?'700':'400';
                  div.style.fontStyle = el.italic?'italic':'normal';
                  div.style.textAlign = el.align||'left';
                  div.textContent = el.text || '';
                }
                if (el.type==='image'){
                  const img = document.createElement('img');
                  img.src = el.url;
                  img.style.width='100%';
                  img.style.height='100%';
                  img.style.objectFit='cover';
                  div.appendChild(img);
                }
                if (el.type==='shape'){
                  div.style.border='2px solid #111';
                  if (el.shape==='ellipse'){ div.style.borderRadius='999px'; }
                }
                frame.appendChild(div);
              }
              wrap.appendChild(frame);
              root.appendChild(wrap);
            }
            render();
            window.addEventListener('keydown', (e)=>{
              if (e.key==='ArrowRight' || e.key===' '){ idx = Math.min(slides.length-1, idx+1); render(); }
              if (e.key==='ArrowLeft'){ idx = Math.max(0, idx-1); render(); }
              if (e.key==='Escape'){ window.close(); }
            });
          </script>
        </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Ribbon */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Button variant="outline" size="sm" onClick={addSlide}>
            <Plus className="w-4 h-4 mr-2" />
            Slide
          </Button>
          <Button variant="outline" size="sm" onClick={deleteSlide}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete slide
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={addText}>
            <Type className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button variant="outline" size="sm" onClick={addImage}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => addShape('rect')}>
            <Square className="w-4 h-4 mr-2" />
            Rect
          </Button>
          <Button variant="outline" size="sm" onClick={() => addShape('ellipse')}>
            <Circle className="w-4 h-4 mr-2" />
            Ellipse
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={onPresent}>
            <Play className="w-4 h-4 mr-2" />
            Present
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdfViaPrint}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>

          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-medium">
            {props.saving ? 'Saving…' : 'Saved'}
          </div>
        </div>

        {selectedEl && selectedEl.type === 'text' && (
          <div className="px-2 pb-2 flex flex-wrap items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Selected: text</div>
            <Input
              className="h-9 w-64"
              value={selectedEl.text}
              onChange={(e) => updateElement((el) => (el.type === 'text' ? { ...el, text: e.target.value } : el))}
            />
            <Input
              className="h-9 w-24"
              value={String(selectedEl.fontSize ?? 28)}
              onChange={(e) =>
                updateElement((el) =>
                  el.type === 'text' ? { ...el, fontSize: clamp(Number(e.target.value || '28'), 8, 200) } : el
                )
              }
            />
            <Button variant="outline" size="sm" onClick={() => deleteElement()}>
              <Trash2 className="w-4 h-4 mr-2" />
              Element
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Slide list */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium border-b border-gray-200 dark:border-gray-800">Slides</div>
          <div className="p-2 space-y-2 max-h-[70vh] overflow-auto">
            {slides.map((s, idx) => {
              const isActive = s.id === selectedSlideId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSlideId(s.id);
                    setSelectedElementId(null);
                  }}
                  className={cn(
                    'w-full text-left rounded-lg border p-2 transition',
                    isActive
                      ? 'border-black/40 dark:border-white/40 bg-black/5 dark:bg-white/5'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Slide {idx + 1}</div>
                  <div className="mt-2 aspect-[16/9] bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md relative overflow-hidden">
                    {/* very tiny preview */}
                    <div className="absolute inset-0 scale-[0.18] origin-top-left">
                      {s.elements.map((el) => (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: el.x,
                            top: el.y,
                            width: el.w,
                            height: el.h,
                            border: el.type === 'shape' ? '2px solid #111' : undefined,
                            borderRadius: el.type === 'shape' && el.shape === 'ellipse' ? 999 : undefined,
                            background: el.type === 'shape' ? 'transparent' : undefined,
                            overflow: 'hidden',
                          }}
                        >
                          {el.type === 'text' ? (
                            <div style={{ fontSize: 22, fontWeight: el.bold ? 700 : 400 }}>{el.text}</div>
                          ) : el.type === 'image' ? (
                            <img src={el.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-gray-500" />
              Canvas
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Click an element to select it</div>
          </div>

          <div className="p-4 overflow-auto">
            <div className="mx-auto w-[1000px] max-w-full aspect-[16/9] bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg relative">
              {slide?.elements.map((el) => {
                const isSelected = el.id === selectedElementId;

                const common = {
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                } as const;

                if (el.type === 'text') {
                  return (
                    <div
                      key={el.id}
                      style={{ position: 'absolute', ...common, padding: 6 }}
                      className={cn(
                        'cursor-pointer',
                        isSelected ? 'ring-2 ring-black/40 dark:ring-white/40 rounded-md' : ''
                      )}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      <textarea
                        value={el.text}
                        onChange={(e) =>
                          updateElement((cur) =>
                            cur.type === 'text' ? { ...cur, text: e.target.value } : cur
                          )
                        }
                        className="w-full h-full bg-transparent outline-none resize-none"
                        style={{
                          fontSize: el.fontSize ?? 28,
                          fontWeight: el.bold ? 700 : 400,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textAlign: el.align ?? 'left',
                        }}
                      />
                    </div>
                  );
                }

                if (el.type === 'image') {
                  return (
                    <div
                      key={el.id}
                      style={{ position: 'absolute', ...common }}
                      className={cn(
                        'cursor-pointer overflow-hidden rounded-md',
                        isSelected ? 'ring-2 ring-black/40 dark:ring-white/40' : ''
                      )}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      <img src={el.url} className="w-full h-full object-cover" />
                    </div>
                  );
                }

                return (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      ...common,
                      border: '2px solid',
                      borderColor: isSelected ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.3)',
                      borderRadius: el.shape === 'ellipse' ? 999 : 12,
                    }}
                    className={cn('cursor-pointer', isSelected ? 'ring-2 ring-black/30 dark:ring-white/30' : '')}
                    onClick={() => setSelectedElementId(el.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
