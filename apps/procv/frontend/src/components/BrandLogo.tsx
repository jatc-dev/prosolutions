import React, { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function BrandLogoComponent({
  size = 64,
  variant = "compact",
  hideSubtitle = false,
  className = "",
  to = "/dashboard",
}: {
  size?: number | "small" | "medium" | "large";
  variant?: "compact" | "large" | "small" | "hero" | "platform";
  hideSubtitle?: boolean;
  className?: string;
  to?: string;
}) {
  const { t } = useTranslation();
  const showText = variant === "large" || variant === "hero" || variant === "platform";
  const showSubtitle = showText && !hideSubtitle;

  const sizeMap = {
    small: {
      wrap: "min-h-[42px] min-w-[94px] rounded-xl px-3 py-2",
      title: "text-lg",
      subtitle: "text-[11px]",
    },
    compact: {
      wrap: "min-h-[52px] min-w-[114px] rounded-2xl px-4 py-2.5",
      title: "text-2xl",
      subtitle: "text-xs",
    },
    large: {
      wrap: "min-h-[64px] min-w-[148px] rounded-2xl px-5 py-3",
      title: "text-3xl",
      subtitle: "text-sm",
    },
    platform: {
      wrap: "min-h-[96px] min-w-[240px] rounded-3xl px-8 py-5 md:min-h-[112px] md:min-w-[300px]",
      title: "text-4xl md:text-5xl",
      subtitle: "text-sm md:text-base",
    },
    hero: {
      wrap: "min-h-[128px] min-w-[320px] rounded-3xl px-9 py-6 md:min-h-[148px] md:min-w-[420px] md:px-11 md:py-7",
      title: "text-6xl md:text-8xl",
      subtitle: "text-base md:text-lg",
    },
  };

  const current = sizeMap[variant];

  const pixelSize = typeof size === "number" ? size : { small: 42, medium: 64, large: 128 }[size];

  const dotSize = Math.max(8, Math.round(pixelSize * 0.12));

  return (
    <Link
      to={to}
      aria-label={t("navigation.goToDashboard", "Go to dashboard")}
      title={t("navigation.dashboardLong", "Main Dashboard")}
      className={`inline-flex items-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${className}`}
    >
      <div
        className={`${current.wrap} relative overflow-hidden border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800`}
      >
        <span
          className="absolute right-2 top-2 rounded-full bg-brand-600/70 blur-[1px]"
          style={{ width: dotSize, height: dotSize }}
          aria-hidden="true"
        />

        <div className={`leading-tight font-black tracking-tight ${current.title}`}>
          <span className="text-slate-500 dark:text-slate-300">Pro</span>
          <span className="text-brand-800 dark:text-brand-300">CV</span>
        </div>

        {showSubtitle && (
          <div className={`mt-0.5 font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300 ${current.subtitle}`}>
            Platform
          </div>
        )}
      </div>
    </Link>
  );
}

export const BrandLogo = memo(BrandLogoComponent);
BrandLogo.displayName = "BrandLogo";
