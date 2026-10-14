import puppeteer, { Browser } from 'puppeteer';
import { logger } from './logger';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      logger.warn('Error closing browser', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      browser = null;
    }
  }
}

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

export async function renderToPdf(html: string): Promise<Buffer> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Force predictable print behavior across templates to reduce broken blocks and orphaned headings.
    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 12mm; }
        html, body { width: 100%; }
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
          orphans: 3;
          widows: 3;
        }

        p, li {
          orphans: 3;
          widows: 3;
        }

        .container,
        .section,
        .item,
        section,
        article,
        aside,
        main,
        header,
        footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .container {
          max-width: 100% !important;
        }

        /* Ultra-compact mode for exported PDFs only. */
        body {
          font-size: 12.6px;
          line-height: 1.32;
        }

        .container,
        .main,
        .sidebar {
          gap: 0 !important;
        }

        .section {
          margin-bottom: 12px !important;
        }

        .item {
          margin-bottom: 6px !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        h1 {
          margin: 0 0 3px 0 !important;
          line-height: 1.12 !important;
        }

        h2, h3, h4, h5, h6 {
          margin-top: 0 !important;
          margin-bottom: 5px !important;
          line-height: 1.16 !important;
        }

        p {
          margin-top: 0 !important;
          margin-bottom: 5px !important;
          line-height: 1.34 !important;
        }

        ul, ol {
          margin-top: 0 !important;
          margin-bottom: 6px !important;
          padding-left: 16px !important;
        }

        li {
          margin-bottom: 3px !important;
        }

        .tag {
          padding: 2px 6px !important;
          margin-right: 4px !important;
          margin-bottom: 4px !important;
        }

        .meta,
        .link {
          line-height: 1.26 !important;
        }

        .section-title {
          margin-bottom: 5px !important;
        }
      `,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    });
    return pdfBuffer as Buffer;
  } finally {
    await page.close();
  }
}
