import React from "react";
import type { CVData } from "../../../types";
import { defaultGreeting, formatLetterDate, letterParagraphs } from "../coverLetter";
import { CustomStylesWrapper } from "./withCustomStyles";

type HeaderStyle = { variant: "band" | "classic" | "accent"; background?: string; color?: string; fontClass: string };

function isDarkColor(hex: string | undefined): boolean {
  const match = /#([0-9a-f]{6})/i.exec(hex || "");
  if (!match) return true;
  const value = parseInt(match[1]!, 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 150;
}

/** The letter borrows the header style and typography of the CV template. */
function headerFor(template: string, settings: CVData["settings"] & Record<string, string | undefined>): HeaderStyle {
  switch (template) {
    case "developer": {
      const bg = settings?.developerBg || "#0f172a";
      return { variant: "band", background: bg, color: isDarkColor(bg) ? "#f8fafc" : "#0f172a", fontClass: "font-sans" };
    }
    case "creative": {
      const gradient = settings?.creativeGradient || "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)";
      return { variant: "band", background: gradient, color: isDarkColor(gradient) ? "#ffffff" : "#0f172a", fontClass: "font-sans" };
    }
    case "executive":
    case "photo-professional":
      return { variant: "band", background: settings?.executiveTop || "#0f172a", color: "#ffffff", fontClass: "font-sans" };
    case "extensa":
    case "extensive":
      return { variant: "band", background: settings?.extensaTop || "#0f172a", color: "#ffffff", fontClass: "font-serif" };
    case "classic":
      return { variant: "classic", fontClass: "font-serif" };
    case "employment":
      return { variant: "classic", fontClass: "font-[Arial,Helvetica,sans-serif]" };
    default:
      return { variant: "accent", fontClass: "font-sans" };
  }
}

export function CoverLetterPreview({ cv }: { cv: CVData }) {
  const letter = cv.coverLetter || {};
  const personal = cv.personal || ({} as CVData["personal"]);
  const name = personal.showFullName === false ? "" : personal.fullName;
  const title = personal.showProfessionalTitle === false ? "" : personal.professionalTitle;
  const email = (personal.emails || []).find((item) => item.isVisible !== false && item.isPrimary)?.value || (personal.emails || []).find((item) => item.isVisible !== false)?.value;
  const phone = (personal.phones || []).find((item) => item.isVisible !== false && item.isPrimary)?.number || (personal.phones || []).find((item) => item.isVisible !== false)?.number;
  const contact = [email, phone, personal.city].filter(Boolean).join(" · ");
  const header = headerFor(cv.template, (cv.settings || {}) as CVData["settings"] & Record<string, string | undefined>);
  const paragraphs = letterParagraphs(letter.body);
  const recipient = [letter.recipientName, letter.recipientTitle, letter.company, letter.companyAddress].map((line) => line?.trim()).filter(Boolean);

  return (
    <CustomStylesWrapper settings={cv.settings}>
      <article className={`mx-auto max-w-2xl border border-slate-200 bg-white text-slate-900 shadow-sm ${header.fontClass}`} aria-label="Carta de presentación">
        {header.variant === "band" ? (
          <header className="px-10 py-8" style={{ background: header.background, color: header.color }}>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: header.color }}>{name}</h1>
            {title ? <p className="mt-1 text-base opacity-90">{title}</p> : null}
            {contact ? <p className="mt-3 text-sm opacity-80">{contact}</p> : null}
          </header>
        ) : header.variant === "classic" ? (
          <header className="border-b border-slate-300 px-10 pb-6 pt-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{name}</h1>
            {title ? <p className="mt-1 text-base text-slate-600">{title}</p> : null}
            {contact ? <p className="mt-2 text-sm text-slate-500">{contact}</p> : null}
          </header>
        ) : (
          // Fixed colours: the letter is a printed page, independent of the app's dark mode.
          <header className="border-b-4 px-10 pb-6 pt-10" style={{ borderColor: "#047857" }}>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{name}</h1>
            {title ? <p className="mt-1 text-base" style={{ color: "#065f46" }}>{title}</p> : null}
            {contact ? <p className="mt-2 text-sm text-slate-500">{contact}</p> : null}
          </header>
        )}

        <div className="space-y-6 px-10 py-8 text-[15px] leading-7">
          <p className="text-right text-sm text-slate-600">{formatLetterDate(letter.city || personal.city, letter.date)}</p>

          {recipient.length ? (
            <div className="text-sm leading-6">
              {recipient.map((line) => <p key={line}>{line}</p>)}
            </div>
          ) : null}

          {letter.position?.trim() ? (
            <p className="font-semibold">Asunto: postulación al cargo de {letter.position.trim()}</p>
          ) : null}

          <p>{letter.greeting?.trim() || defaultGreeting(letter)}</p>

          {paragraphs.length ? (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line text-justify">
                {paragraph.split(/(\[[^\]]{3,}\])/g).map((part, i) =>
                  /^\[[^\]]{3,}\]$/.test(part) ? <mark key={i} className="cover-letter-placeholder rounded bg-amber-100 px-0.5 text-amber-900">{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>,
                )}
              </p>
            ))
          ) : (
            <p className="text-slate-400">Escribe el cuerpo de tu carta o usa «Generar borrador con mis datos».</p>
          )}

          <div className="pt-2">
            <p>{letter.closing?.trim() || "Cordialmente,"}</p>
            <p className="mt-10 font-semibold">{name}</p>
            {title ? <p className="text-sm text-slate-600">{title}</p> : null}
          </div>
        </div>
      </article>
    </CustomStylesWrapper>
  );
}
