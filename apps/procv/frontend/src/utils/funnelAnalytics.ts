type LandingEvent =
  | "landing_view"
  | "demo_run"
  | "demo_result"
  | "demo_cta_click"
  | "auth_mode_switch"
  | "auth_submit_attempt"
  | "auth_submit_success"
  | "guest_editor_click"
  | "password_reset_requested"
  | "password_reset_confirmed"
  | "password_reset_success";

interface LandingFunnelStats {
  pageViews: number;
  demoRuns: number;
  demoRunsWithText: number;
  demoResults: number;
  demoCtaClicks: number;
  registerSwitches: number;
  loginAttempts: number;
  registerAttempts: number;
  loginSuccess: number;
  registerSuccess: number;
  conversionFromDemo: number;
  lastUpdatedAt: string | null;
}

const STORAGE_KEY = "procv_landing_funnel";

const EMPTY_STATS: LandingFunnelStats = {
  pageViews: 0,
  demoRuns: 0,
  demoRunsWithText: 0,
  demoResults: 0,
  demoCtaClicks: 0,
  registerSwitches: 0,
  loginAttempts: 0,
  registerAttempts: 0,
  loginSuccess: 0,
  registerSuccess: 0,
  conversionFromDemo: 0,
  lastUpdatedAt: null,
};

function readStats(): LandingFunnelStats {
  if (typeof window === "undefined") {
    return { ...EMPTY_STATS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_STATS };
    }

    return {
      ...EMPTY_STATS,
      ...(JSON.parse(raw) as Partial<LandingFunnelStats>),
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(next: LandingFunnelStats): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors silently.
  }
}

export function trackLandingFunnelEvent(
  event: LandingEvent,
  payload?: { hasJobText?: boolean; mode?: "login" | "register"; fromDemo?: boolean }
): void {
  const stats = readStats();

  switch (event) {
    case "landing_view":
      stats.pageViews += 1;
      break;
    case "demo_run":
      stats.demoRuns += 1;
      if (payload?.hasJobText) {
        stats.demoRunsWithText += 1;
      }
      break;
    case "demo_result":
      stats.demoResults += 1;
      break;
    case "demo_cta_click":
      stats.demoCtaClicks += 1;
      break;
    case "auth_mode_switch":
      if (payload?.mode === "register") {
        stats.registerSwitches += 1;
      }
      break;
    case "auth_submit_attempt":
      if (payload?.mode === "register") {
        stats.registerAttempts += 1;
      } else {
        stats.loginAttempts += 1;
      }
      break;
    case "auth_submit_success":
      if (payload?.mode === "register") {
        stats.registerSuccess += 1;
      } else {
        stats.loginSuccess += 1;
      }
      if (payload?.fromDemo) {
        stats.conversionFromDemo += 1;
      }
      break;
    default:
      break;
  }

  stats.lastUpdatedAt = new Date().toISOString();
  saveStats(stats);
}

export function getLandingFunnelStats(): LandingFunnelStats {
  return readStats();
}
