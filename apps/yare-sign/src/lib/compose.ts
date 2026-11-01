import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Field, PageSize } from './supabase';

/** Everything the final PDF needs for one document: its bytes, its pages, the filled fields on it. */
export interface ComposeInput {
  bytes: ArrayBuffer;
  pageSizes: PageSize[];
  fields: Array<Pick<Field, 'page' | 'type' | 'x' | 'y' | 'w' | 'h' | 'value'>>;
}

/**
 * Draws the filled fields onto the original PDF and returns the signed copy. Signatures are the
 * PNGs the signers drew or typed; names, dates and text are set in Helvetica. Nothing else changes.
 */
export async function composeSignedPdf({ bytes, fields }: ComposeInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  for (const f of fields) {
    if (!f.value) continue;
    const page = pages[f.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const x = f.x * pw, w = f.w * pw, h = f.h * ph;
    const y = ph - f.y * ph - h; // PDF origin is bottom-left
    if (f.type === 'signature') {
      if (!f.value.startsWith('data:image/png;base64,')) continue;
      const png = await pdf.embedPng(f.value);
      const scale = Math.min(w / png.width, h / png.height);
      const dw = png.width * scale, dh = png.height * scale;
      page.drawImage(png, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
    } else {
      let size = Math.min(12, h * 0.6);
      while (size > 6 && font.widthOfTextAtSize(f.value, size) > w - 6) size -= 0.5;
      page.drawText(f.value, { x: x + 3, y: y + (h - size) / 2 + size * 0.15, size, font, color: rgb(0.08, 0.09, 0.1) });
    }
  }
  return pdf.save();
}

export function downloadBytes(name: string, bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.endsWith('.pdf') ? name : `${name}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
