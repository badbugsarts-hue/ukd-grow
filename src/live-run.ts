import type { RunClockHealth, RunPackage } from "./types";

export const LIVE_DAY_MILLISECONDS = 86_400_000;
export const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60_000;

export interface LiveClockResult {
  day: number;
  health: RunClockHealth;
  blocked: boolean;
}

/** Der operative Tag ist eine exakte UTC-Dauer seit bestätigter Aussaat. */
export function evaluateLiveClock(
  run: RunPackage,
  now = new Date(),
): LiveClockResult {
  if (run.executionMode !== "live" || !run.liveAnchor) {
    return {
      day: 0,
      health: {
        status: "healthy",
        lastObservedAtUtc: now.toISOString(),
        detail: null,
      },
      blocked: false,
    };
  }
  const nowMs = now.getTime();
  const anchorMs = Date.parse(run.liveAnchor.startedAtUtc);
  const previousMs = run.clockHealth.lastObservedAtUtc
    ? Date.parse(run.clockHealth.lastObservedAtUtc)
    : Number.NaN;
  if (!Number.isFinite(anchorMs) || nowMs < anchorMs) {
    return {
      day: 0,
      health: {
        status: "blocked-before-anchor",
        lastObservedAtUtc: now.toISOString(),
        detail: "Systemzeit liegt vor dem bestätigten Aussaatanker.",
      },
      blocked: true,
    };
  }
  if (
    Number.isFinite(previousMs) &&
    nowMs + CLOCK_ROLLBACK_TOLERANCE_MS < previousMs
  ) {
    return {
      day: Math.max(0, Math.floor((nowMs - anchorMs) / LIVE_DAY_MILLISECONDS)),
      health: {
        status: "blocked-clock-rollback",
        lastObservedAtUtc: run.clockHealth.lastObservedAtUtc,
        detail:
          "Die Systemzeit ist rückwärts gesprungen. Tagesaktionen bleiben bis zur Prüfung gesperrt.",
      },
      blocked: true,
    };
  }
  return {
    day: Math.floor((nowMs - anchorMs) / LIVE_DAY_MILLISECONDS),
    health: {
      status: "healthy",
      lastObservedAtUtc: now.toISOString(),
      detail: null,
    },
    blocked: false,
  };
}

export function currentDayForRun(
  run: RunPackage,
  now = new Date(),
): number | null {
  return run.executionMode === "live" ? evaluateLiveClock(run, now).day : null;
}
