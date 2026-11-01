import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label, Tabs, TextField } from '@heroui/react';
import { EraserIcon } from '@phosphor-icons/react';

export interface SignaturePadProps {
  /** The signer's name, offered as the typed signature. */
  name?: string;
  /** Called with a PNG data URL (transparent background) whenever the signature changes, or null when cleared. */
  onChange: (dataUrl: string | null) => void;
  className?: string;
}

const INK = '#15161a';
const W = 560;
const H = 180;
const SCRIPT = "'Snell Roundhand', 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive";

/** Draw with a finger or a mouse, or type a name. Produces one PNG either way. */
export function SignaturePad({ name = '', onChange, className }: SignaturePadProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState(name);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = INK;
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext('2d')!;
    const p = point(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d')!;
    const p = point(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    strokes.current += 1;
    onChange(e.currentTarget.toDataURL('image/png'));
  }
  function clear() {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore();
    strokes.current = 0;
    onChange(null);
  }

  function emitTyped(value: string) {
    setTyped(value);
    const text = value.trim();
    if (!text) { onChange(null); return; }
    const dpr = window.devicePixelRatio || 1;
    const c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = INK;
    let size = 64;
    ctx.font = `${size}px ${SCRIPT}`;
    while (ctx.measureText(text).width > W - 48 && size > 18) { size -= 2; ctx.font = `${size}px ${SCRIPT}`; }
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 24, H / 2);
    onChange(c.toDataURL('image/png'));
  }

  function switchMode(next: 'draw' | 'type') {
    setMode(next);
    if (next === 'type') emitTyped(typed); else { clear(); }
  }

  return (
    <div className={['yare-sigpad', className].filter(Boolean).join(' ')}>
      <Tabs variant="secondary" selectedKey={mode} onSelectionChange={(k) => switchMode(k as 'draw' | 'type')}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="How to sign">
            <Tabs.Tab id="draw">Draw<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="type">Type<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className="yare-sigpad__area" hidden={mode !== 'draw'}>
        <canvas ref={canvas} className="yare-sigpad__canvas" style={{ aspectRatio: `${W} / ${H}` }} aria-label="Signature area: draw your signature" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <span className="yare-sigpad__line" aria-hidden="true" />
        <Button variant="ghost" size="sm" className="yare-sigpad__clear" onPress={clear}><EraserIcon /> Clear</Button>
      </div>
      {mode === 'type' && (
        <div className="flex flex-col gap-3">
          <TextField fullWidth value={typed} onChange={emitTyped} maxLength={80}>
            <Label>Your name, as a signature</Label>
            <Input autoFocus />
          </TextField>
          <div className="yare-sigpad__area" aria-hidden="true">
            <div className="yare-sigpad__typed" style={{ fontFamily: SCRIPT }}>{typed.trim() || ' '}</div>
            <span className="yare-sigpad__line" />
          </div>
        </div>
      )}
    </div>
  );
}
