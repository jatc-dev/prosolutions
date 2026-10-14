import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600 mb-6">
      <Link
        to="/dashboard"
        aria-label={t("navigation.goToDashboard", "Go to dashboard")}
        title={t("navigation.dashboardLong", "Main Dashboard")}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">{t("navigation.dashboardShort", "Dashboard")}</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}