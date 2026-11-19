import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for our own editorial content
 * (academy articles and legal pages). Supports: ## / ### headings, paragraphs,
 * - and 1. lists, > callouts, | tables |, **bold**, *italic* and [links](url).
 * Content is authored in the repo (trusted); output is React elements, never
 * raw HTML, so nothing is injected unescaped.
 */

export type Block =
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; header: string[]; rows: string[][] };

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      const text = heading[2]!.trim();
      blocks.push({ type: "heading", level: heading[1]!.length as 2 | 3, text, id: slugifyHeading(text) });
      i += 1;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) tableLines.push(lines[i++]!);
      const [header, , ...rows] = tableLines;
      blocks.push({ type: "table", header: splitRow(header ?? ""), rows: rows.map(splitRow) });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? "")) parts.push((lines[i++] ?? "").replace(/^>\s?/, ""));
      blocks.push({ type: "callout", text: parts.join(" ") });
      continue;
    }
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2]!);
      const items: string[] = [];
      while (i < lines.length) {
        const item = (lines[i] ?? "").match(/^\s*([-*]|\d+\.)\s+(.*)$/);
        if (!item) break;
        items.push(item[2]!.trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() && !/^(#{2,3}\s|>|\||\s*([-*]|\d+\.)\s)/.test(lines[i] ?? "")) {
      paragraph.push((lines[i++] ?? "").trim());
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

const INLINE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    if (match[2]) nodes.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[4]) nodes.push(<em key={key++}>{match[4]}</em>);
    else if (match[6] && match[7]) {
      const href = match[7];
      const external = /^https?:\/\//.test(href) && !href.includes("prosolutions.page");
      nodes.push(
        <a key={key++} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-medium text-ui-accent underline underline-offset-2">
          {match[6]}
        </a>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function plainText(source: string): string {
  return source
    .replace(/[#>|*]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(source: string): number {
  return plainText(source).split(" ").filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Reading time at ~220 words per minute (Spanish prose). */
export function readingMinutes(source: string): number {
  return Math.max(1, Math.round(wordCount(source) / 220));
}

export function MarkdownContent({ source, afterBlock }: { source: string; afterBlock?: (index: number, block: Block) => ReactNode }) {
  const blocks = parseMarkdown(source);
  return (
    <div className="prose-ps">
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {renderBlock(block)}
          {afterBlock?.(index, block)}
        </Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: Block): ReactNode {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 id={block.id} className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">{renderInline(block.text)}</h2>
      ) : (
        <h3 id={block.id} className="mt-8 scroll-mt-24 text-xl font-semibold">{renderInline(block.text)}</h3>
      );
    case "paragraph":
      return <p className="mt-4 text-[17px] leading-8 text-ui-text">{renderInline(block.text)}</p>;
    case "callout":
      return (
        <aside className="mt-6 rounded-ui-lg border border-ui-border bg-ui-accent-soft p-4 text-[15px] leading-7">
          {renderInline(block.text)}
        </aside>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`mt-4 space-y-2 pl-6 text-[17px] leading-8 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="mt-6 overflow-x-auto rounded-ui-lg border border-ui-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-ui-soft">
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} scope="col" className="px-4 py-3 font-semibold">{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-ui-border">
                  {row.map((cell, index) => (
                    <td key={index} className="px-4 py-3 align-top tabular-nums">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
