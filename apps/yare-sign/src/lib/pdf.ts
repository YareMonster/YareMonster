import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageSize } from './supabase';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDoc = pdfjs.PDFDocumentProxy;

/** Opens a PDF from bytes. Throws a readable message for encrypted or broken files. */
export async function loadPdf(data: ArrayBuffer): Promise<PdfDoc> {
  try {
    return await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password and try again.');
    throw new Error('This file could not be read as a PDF.');
  }
}

/** Page count and the size of each page in PDF points, recorded with the document. */
export async function inspectPdf(data: ArrayBuffer): Promise<{ pageCount: number; pageSizes: PageSize[] }> {
  const doc = await loadPdf(data);
  const sizes: PageSize[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const v = page.getViewport({ scale: 1 });
    sizes.push({ w: Math.round(v.width), h: Math.round(v.height) });
  }
  await doc.loadingTask.destroy();
  return { pageCount: doc.numPages, pageSizes: sizes };
}

/** Draws one page into a canvas at the given CSS width, sharp on high-density screens. */
export async function renderPage(doc: PdfDoc, pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = cssWidth / base.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: scale * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
}
