/**
 * Readable text for the exported PDF.
 *
 * html2pdf turns the page into images, so the PDF had no text at all: an
 * applicant tracking system (ATS) or a recruiter's search found nothing, and
 * the text could not be selected or copied. Like a scanned document after
 * OCR, each page now also carries the same text as an invisible layer placed
 * where it is drawn, in the reading order of the page (the HTML order, so two
 * columns are read one after the other, not mixed line by line).
 */

export interface PdfTextItem {
  /** 1-based PDF page. */
  page: number;
  /** Position and size in PDF units (mm), from the top-left of the page. */
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

/** What the layer needs from html2pdf's page setup. */
export interface PdfPageSetup {
  /** jsPDF scale factor (points per PDF unit). */
  k: number;
  /** Printable height of a page, in PDF units. */
  innerHeight: number;
  /** [top, left, bottom, right] margins, in PDF units. */
  margin: [number, number, number, number];
}

/** Minimal part of jsPDF used to write the layer. */
export interface PdfWriter {
  setPage(page: number): unknown;
  setFont(name: string, style?: string): unknown;
  setFontSize(size: number): unknown;
  getTextWidth(text: string): number;
  getNumberOfPages(): number;
  text(text: string, x: number, y: number, options?: Record<string, unknown>): unknown;
}

// Characters the PDF standard fonts can encode (WinAnsi): Latin-1 plus a few
// typographic ones. Anything else (emoji, other scripts) becomes a space so
// the layer never contains garbage.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
export function toWinAnsi(text: string): string {
  return Array.from(text.normalize("NFC"))
    .map((char) => {
      const code = char.codePointAt(0)!;
      return (code >= 32 && code < 127) || (code >= 160 && code < 256) || WIN_ANSI_EXTRA.has(char) ? char : " ";
    })
    .join("")
    .replace(/\s+/g, " ");
}

/** px (CSS) → PDF units, the same conversion html2pdf uses. */
const toUnits = (px: number, k: number) => (px * 72) / 96 / k;

/** Visible inside the page (html2pdf's own wrapper is transparent on purpose). */
function isRendered(element: Element | null, container: Element): boolean {
  for (let node = element; node && node !== container; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  }
  return true;
}

/**
 * Reads every line of text in the prepared page (after html2pdf inserted its
 * page-break spacers), with the page and position where it is drawn.
 */
export function collectPdfText(container: HTMLElement, setup: PdfPageSetup): PdfTextItem[] {
  const origin = container.getBoundingClientRect();
  const items: PdfTextItem[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.textContent || "";
    if (!value.trim() || !isRendered(node.parentElement, container)) continue;
    // CSS may show it in capitals; the layer keeps what the person wrote.
    let line: { text: string; left: number; top: number; right: number; bottom: number } | null = null;
    const flush = () => {
      if (!line) return;
      const text = toWinAnsi(line.text).trim();
      if (text) {
        const top = toUnits(line.top - origin.top, setup.k);
        const page = Math.floor(top / setup.innerHeight) + 1;
        items.push({
          page,
          x: setup.margin[1] + toUnits(line.left - origin.left, setup.k),
          y: setup.margin[0] + (top - (page - 1) * setup.innerHeight),
          width: toUnits(line.right - line.left, setup.k),
          height: toUnits(line.bottom - line.top, setup.k),
          text,
        });
      }
      line = null;
    };
    // Word by word, so a paragraph wrapped over several lines (or pages)
    // gives one item per drawn line.
    const words = /\S+/g;
    for (let match = words.exec(value); match; match = words.exec(value)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      if (line && Math.abs(rect.top - line.top) < Math.max(2, (line.bottom - line.top) / 2) && rect.left >= line.left) {
        line.text += ` ${match[0]}`;
        line.right = Math.max(line.right, rect.right);
        line.bottom = Math.max(line.bottom, rect.bottom);
      } else {
        flush();
        line = { text: match[0], left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }
    }
    flush();
  }
  return items;
}

const BASELINE_FACTOR = 1.15;

/** Writes the items as invisible text (selectable, searchable, readable by an ATS). */
export function addPdfTextLayer(pdf: PdfWriter, items: PdfTextItem[]): void {
  const pages = pdf.getNumberOfPages();
  pdf.setFont("helvetica", "normal");
  for (const item of items) {
    if (item.page < 1 || item.page > pages || !item.text) continue;
    pdf.setPage(item.page);
    // Font size from the line height (points), then stretched to the drawn
    // width so selecting the text highlights the right area.
    const size = Math.max(4, Math.min(40, item.height * (72 / 25.4) * 0.8));
    pdf.setFontSize(size);
    const natural = pdf.getTextWidth(item.text);
    const horizontalScale = natural > 0 && item.width > 0 ? Math.min(3, Math.max(0.3, item.width / natural)) : 1;
    // Baseline of the drawn line. The browser's box puts it ~0.8 of the way
    // down, and html2canvas draws text a little lower than the browser
    // (measured on exported PDFs), hence the larger factor.
    pdf.text(item.text, item.x, item.y + item.height * BASELINE_FACTOR, { renderingMode: "invisible", horizontalScale });
  }
  pdf.setPage(pages);
}

/** Minimal part of jsPDF used to colour the page around the content. */
export interface PdfPainter {
  setPage(page: number): unknown;
  getNumberOfPages(): number;
  setFillColor(color: string): unknown;
  rect(x: number, y: number, width: number, height: number, style: string): unknown;
}

/**
 * With a page colour, the PDF margins (and the space under the content on
 * the last page) would stay white: fill them with the same colour. Only the
 * areas around the drawn content are painted, never over it.
 */
export function fillPdfPageColor(
  pdf: PdfPainter,
  color: string,
  page: { width: number; height: number; innerWidth: number; innerHeight: number; margin: [number, number, number, number]; lastContentHeight: number },
): void {
  const pages = pdf.getNumberOfPages();
  const [top, left] = page.margin;
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index);
    // jsPDF keeps the fill colour per page: set it on every page.
    pdf.setFillColor(color);
    const contentHeight = index === pages ? page.lastContentHeight : page.innerHeight;
    const bottom = top + contentHeight;
    pdf.rect(0, 0, page.width, top, "F");
    pdf.rect(0, bottom, page.width, Math.max(0, page.height - bottom), "F");
    pdf.rect(0, top, left, contentHeight, "F");
    pdf.rect(left + page.innerWidth, top, Math.max(0, page.width - left - page.innerWidth), contentHeight, "F");
  }
  pdf.setPage(pages);
}
