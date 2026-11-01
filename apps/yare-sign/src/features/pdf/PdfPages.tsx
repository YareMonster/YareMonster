import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PenNibIcon } from '@phosphor-icons/react';
import { personColour } from '../../yare';
import type { Field, FieldType, PageSize } from '../../lib/supabase';
import { loadPdf, renderPage, type PdfDoc } from '../../lib/pdf';
import { fieldLabels } from '../status';
import './pdf.css';

export type ViewerField = Pick<Field, 'id' | 'document_id' | 'participant_id' | 'page' | 'type' | 'x' | 'y' | 'w' | 'h' | 'required' | 'label' | 'value'>;
export interface ViewerPerson { id: string; name: string; colour: number; role: 'signer' | 'viewer' }
export type Box = { x: number; y: number; w: number; h: number };

export interface PdfPagesProps {
  /** The PDF bytes, or null while they load. */
  bytes: ArrayBuffer | null;
  pageSizes: PageSize[];
  /** The fields on this document. */
  fields: ViewerField[];
  people: Map<string, ViewerPerson>;
  /** edit: drag and resize boxes. sign: fill your own. view: show what is there. */
  mode: 'edit' | 'sign' | 'view';
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChangeBox?: (id: string, box: Box) => void;
  /** In edit mode, the type waiting to be placed by a click on a page. */
  placing?: FieldType | null;
  onPlace?: (page: number, x: number, y: number) => void;
  /** In sign mode, the participant whose fields are live, and their values so far. */
  meId?: string;
  values?: Record<string, string>;
  onFieldPress?: (field: ViewerField) => void;
  className?: string;
}

const MAX_W = 820;

/** The pages of one PDF, stacked, with the fields drawn over them. One component for the editor, the preview and the signing page. */
export function PdfPages({ bytes, pageSizes, fields, people, mode, selectedId, onSelect, onChangeBox, placing, onPlace, meId, values, onFieldPress, className }: PdfPagesProps) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [doc, setDoc] = useState<PdfDoc | null>(null);

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(MAX_W, Math.floor(el.clientWidth))));
    ro.observe(el);
    setWidth(Math.min(MAX_W, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let current: PdfDoc | null = null;
    setDoc(null);
    if (bytes) loadPdf(bytes).then((d) => { if (cancelled) void d.loadingTask.destroy(); else { current = d; setDoc(d); } }).catch(() => undefined);
    return () => { cancelled = true; if (current) void current.loadingTask.destroy(); };
  }, [bytes]);

  return (
    <div ref={container} className={['ys-pages', className].filter(Boolean).join(' ')} data-placing={placing ? 'true' : undefined} onClick={() => { if (mode === 'edit' && !placing) onSelect?.(null); }}>
      {pageSizes.map((size, i) => {
        const n = i + 1;
        const h = width ? Math.round((width * size.h) / size.w) : 0;
        return (
          <div
            key={n}
            className="ys-page"
            style={{ width: width || undefined, height: h || undefined }}
            onClick={(e) => {
              if (mode !== 'edit' || !placing || !onPlace) return;
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              onPlace(n, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
            }}
          >
            {width > 0 && <PageCanvas doc={doc} page={n} width={width} />}
            <div className="ys-page__n" aria-hidden="true">{n} / {pageSizes.length}</div>
            {fields.filter((f) => f.page === n).map((f) => (
              <FieldBox
                key={f.id}
                field={f}
                person={people.get(f.participant_id)}
                mode={mode}
                selected={selectedId === f.id}
                mine={meId === f.participant_id}
                value={values?.[f.id] ?? f.value ?? ''}
                onSelect={() => onSelect?.(f.id)}
                onChangeBox={(box) => onChangeBox?.(f.id, box)}
                onPress={() => onFieldPress?.(f)}
                pageW={width}
                pageH={h}
              />
            ))}
          </div>
        );
      })}
      {pageSizes.length === 0 && <div className="ys-empty">No pages.</div>}
    </div>
  );
}

function PageCanvas({ doc, page, width }: { doc: PdfDoc | null; page: number; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !doc) return;
    let cancelled = false;
    renderPage(doc, page, c, width).catch(() => undefined).then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [doc, page, width]);
  return <canvas ref={ref} className="ys-page__canvas" aria-hidden="true" />;
}

interface FieldBoxProps {
  field: ViewerField;
  person?: ViewerPerson;
  mode: 'edit' | 'sign' | 'view';
  selected: boolean;
  mine: boolean;
  value: string;
  onSelect: () => void;
  onChangeBox: (box: Box) => void;
  onPress: () => void;
  pageW: number;
  pageH: number;
}

function FieldBox({ field, person, mode, selected, mine, value, onSelect, onChangeBox, onPress, pageW, pageH }: FieldBoxProps) {
  const [drag, setDrag] = useState<Box | null>(null);
  const start = useRef<{ px: number; py: number; box: Box; resize: boolean } | null>(null);
  const box = drag ?? { x: field.x, y: field.y, w: field.w, h: field.h };
  const colour = personColour(person?.colour ?? 0);
  const label = field.label || fieldLabels[field.type];

  function down(e: ReactPointerEvent<HTMLElement>, resize: boolean) {
    if (mode !== 'edit') return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, box: { x: field.x, y: field.y, w: field.w, h: field.h }, resize };
  }
  function move(e: ReactPointerEvent<HTMLElement>) {
    const s = start.current;
    if (!s || !pageW || !pageH) return;
    const dx = (e.clientX - s.px) / pageW, dy = (e.clientY - s.py) / pageH;
    if (s.resize) {
      const w = clamp(s.box.w + dx, 0.04, 1 - s.box.x), h = clamp(s.box.h + dy, 0.015, 1 - s.box.y);
      setDrag({ ...s.box, w, h });
    } else {
      const x = clamp(s.box.x + dx, 0, 1 - s.box.w), y = clamp(s.box.y + dy, 0, 1 - s.box.h);
      setDrag({ ...s.box, x, y });
    }
  }
  function up() {
    const s = start.current;
    start.current = null;
    if (s && drag) onChangeBox(drag);
    setDrag(null);
  }

  const style = { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`, '--ys-colour': colour } as React.CSSProperties;
  const filled = value.length > 0;
  const isSig = field.type === 'signature';

  if (mode === 'edit') {
    return (
      <div className="ys-field" data-selected={selected || undefined} style={style} onPointerDown={(e) => down(e, false)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={(e) => e.stopPropagation()} role="button" tabIndex={0} aria-label={`${label} for ${person?.name ?? 'someone'}, page ${field.page}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
        <span className="ys-field__tag">{isSig && <PenNibIcon weight="fill" />}{label} · {person?.name ?? '?'}</span>
        <span className="ys-field__handle" onPointerDown={(e) => down(e, true)} aria-hidden="true" />
      </div>
    );
  }

  if (filled) {
    return (
      <div className="ys-field ys-field--filled" style={style} aria-label={`${label}: ${isSig ? 'signed' : value}`}>
        {isSig ? <img src={value} alt="" className="ys-field__sig" draggable={false} /> : <span className="ys-field__text">{value}</span>}
      </div>
    );
  }

  if (mode === 'sign' && mine) {
    return (
      <button type="button" className="ys-field ys-field--mine" style={style} onClick={onPress}>
        <span className="ys-field__cta">{isSig ? <><PenNibIcon weight="fill" /> Sign here</> : label}{field.required && <span aria-hidden="true"> *</span>}</span>
      </button>
    );
  }

  return (
    <div className="ys-field ys-field--other" style={style} aria-label={`${label} for ${person?.name ?? 'someone'}`}>
      <span className="ys-field__tag">{label} · {person?.name ?? 'someone'}</span>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
