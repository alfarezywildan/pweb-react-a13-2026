import type { Application } from '../types';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export function isAtRiskOfGhosting(
  app: Application,
  nowMs: number = Date.now()
): boolean {
  if (app.status !== 'APPLIED' && app.status !== 'SCREENING') {
    return false;
  }

  const updatedMs = Date.parse(app.lastUpdatedAt);
  if (Number.isNaN(updatedMs)) {
    return false;
  }

  return nowMs - updatedMs > FOURTEEN_DAYS_MS;
}

export interface InterviewConflictPair {
  first: Application;
  second: Application;
  diffMinutes: number;
}

export function detectInterviewConflicts(
  applications: Application[]
): InterviewConflictPair[] {
  const interviewApps = applications
    .filter(
      (app) =>
        app.status === 'INTERVIEW' &&
        typeof app.interviewDateTime === 'string' &&
        app.interviewDateTime.trim().length > 0 &&
        !Number.isNaN(Date.parse(app.interviewDateTime))
    )
    .sort(
      (a, b) =>
        Date.parse(a.interviewDateTime as string) -
        Date.parse(b.interviewDateTime as string)
    );

  const conflicts: InterviewConflictPair[] = [];

  for (let i = 0; i < interviewApps.length; i++) {
    const first = interviewApps[i];
    const firstMs = Date.parse(first.interviewDateTime as string);

    for (let j = i + 1; j < interviewApps.length; j++) {
      const second = interviewApps[j];
      const secondMs = Date.parse(second.interviewDateTime as string);
      const diffMs = Math.abs(secondMs - firstMs);

      if (diffMs < SIXTY_MINUTES_MS) {
        conflicts.push({
          first,
          second,
          diffMinutes: Math.round(diffMs / (60 * 1000)),
        });
      }
    }
  }

  return conflicts;
}