import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

type StrengthLevel = "weak" | "fair" | "good" | "strong" | "none";

const passwordRules = {
  length: (p: string) => p.length >= 8,
  upperLower: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  number: (p: string) => /\d/.test(p),
  special: (p: string) => /[@$!%*?&]/.test(p),
};

export function getPasswordStrength(password: string): { level: StrengthLevel; score: number; rules: Record<string, boolean> } {
  const rules = {
    length: passwordRules.length(password),
    upperLower: passwordRules.upperLower(password),
    number: passwordRules.number(password),
    special: passwordRules.special(password),
  };

  const score = Object.values(rules).filter(Boolean).length;

  let level: StrengthLevel;
  if (score === 0) level = "none";
  else if (score <= 1) level = "weak";
  else if (score <= 2) level = "fair";
  else if (score <= 3) level = "good";
  else level = "strong";

  return { level, score, rules };
}

const strengthColors: Record<StrengthLevel, string> = {
  none: "bg-slate-200 dark:bg-slate-700",
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-blue-500",
  strong: "bg-green-500",
};

const strengthLabels: Record<StrengthLevel, string> = {
  none: "",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const strengthWidth: Record<StrengthLevel, string> = {
  none: "w-0",
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const { level, score, rules } = getPasswordStrength(password || "");

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1 h-2">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-full rounded-full transition-all duration-200 ${
              bar <= score
                ? strengthColors[level]
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className={`font-medium ${
          level === "none" ? "text-slate-400" : "text-slate-700 dark:text-slate-300"
        }`}>
          {t(`passwordStrength.${level}`, strengthLabels[level])}
        </span>
        <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
          {Object.entries(rules).map(([rule, passed]) => (
            <span
              key={rule}
              className={passed ? "text-green-600 dark:text-green-400" : "text-slate-400"}
            >
              {passed ? <Check className="inline h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" /> : <X className="inline h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />} {t(`passwordRule.${rule}`, rule)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
