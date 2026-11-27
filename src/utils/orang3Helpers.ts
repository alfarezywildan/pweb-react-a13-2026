import type { Application, SkillMatchResult, WorkMode } from '../types';
import { isAtRiskOfGhosting } from './applicationRules';
import { calculateSkillMatch } from './skillMatch';

// ============================================================================
// 1. Nested Checklist Immutable Updaters (Fitur 4 - Orang 3)
// ============================================================================

export function addChecklistItemImmutable(
  applications: Application[],
  appId: string,
  rawText: string
): Application[] {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return applications;
  }

  return applications.map((app) => {
    if (app.id !== appId) return app;
    return {
      ...app,
      checklist: [
        ...app.checklist,
        {
          id: crypto.randomUUID(),
          text: trimmed,
          done: false,
        },
      ],
    };
  });
}

export function toggleChecklistItemImmutable(
  applications: Application[],
  appId: string,
  itemId: string
): Application[] {
  return applications.map((app) => {
    if (app.id !== appId) return app;
    return {
      ...app,
      checklist: app.checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    };
  });
}

export function deleteChecklistItemImmutable(
  applications: Application[],
  appId: string,
  itemId: string
): Application[] {
  return applications.map((app) => {
    if (app.id !== appId) return app;
    return {
      ...app,
      checklist: app.checklist.filter((item) => item.id !== itemId),
    };
  });
}

// ============================================================================
// 2. Undo Delete Immutable Restore Helper (Fitur 6 - Orang 3)
// ============================================================================

export function restoreDeletedApplicationImmutable(
  applications: Application[],
  restoredApplication: Application,
  originalIndex: number
): Application[] {
  const alreadyExists = applications.some(
    (app) => app.id === restoredApplication.id
  );
  if (alreadyExists) {
    return applications;
  }

  const clampedIndex = Math.min(
    Math.max(0, originalIndex),
    applications.length
  );

  return [
    ...applications.slice(0, clampedIndex),
    restoredApplication,
    ...applications.slice(clampedIndex),
  ];
}

// ============================================================================
// 3. Dashboard 5 Kartu Statistik - Derived State (Fitur 7 - Orang 3)
// ============================================================================

export interface DashboardStats {
  totalApplications: number;
  activePipelineCount: number;
  respondedCount: number;
  responseRate: number;
  interviewCount: number;
  interviewRate: number;
  ghostingRiskCount: number;
  totalOffers: number;
}

export function calculateDashboardStats(
  applications: Application[],
  nowMs: number = Date.now()
): DashboardStats {
  const totalApplications = applications.length;

  const activePipelineCount = applications.filter(
    (app) =>
      app.status === 'WISHLIST' ||
      app.status === 'APPLIED' ||
      app.status === 'SCREENING' ||
      app.status === 'INTERVIEW'
  ).length;

  // Lamaran yang sudah direspons/diproses HRD melewati tahap kirim awal
  const respondedCount = applications.filter(
    (app) =>
      app.status === 'SCREENING' ||
      app.status === 'INTERVIEW' ||
      app.status === 'OFFER' ||
      app.status === 'REJECTED'
  ).length;

  const responseRate =
    totalApplications === 0
      ? 0
      : Math.round((respondedCount / totalApplications) * 100);

  // Lamaran yang berhasil menembus tahap wawancara
  const interviewCount = applications.filter(
    (app) =>
      app.status === 'INTERVIEW' ||
      app.status === 'OFFER' ||
      Boolean(app.interviewDateTime?.trim())
  ).length;

  const interviewRate =
    totalApplications === 0
      ? 0
      : Math.round((interviewCount / totalApplications) * 100);

  const ghostingRiskCount = applications.filter((app) =>
    isAtRiskOfGhosting(app, nowMs)
  ).length;

  const totalOffers = applications.filter(
    (app) => app.status === 'OFFER'
  ).length;

  return {
    totalApplications,
    activePipelineCount,
    respondedCount,
    responseRate,
    interviewCount,
    interviewRate,
    ghostingRiskCount,
    totalOffers,
  };
}

// ============================================================================
// 4. Offer Comparator - Skor Berbobot & Rekomendasi Terbaik (Fitur 7 - Orang 3)
// ============================================================================

const WORK_MODE_SCORES: Record<WorkMode, number> = {
  Remote: 100,
  Hybrid: 75,
  Onsite: 50,
};

export function getWorkModeScore(workMode: WorkMode): number {
  return WORK_MODE_SCORES[workMode];
}

export interface OfferEvaluation {
  application: Application;
  salary: number;
  normalizedSalary: number;
  weightedSalary: number;
  workModeScore: number;
  weightedWorkMode: number;
  skillMatch: SkillMatchResult;
  weightedSkillMatch: number;
  totalScore: number;
}

export interface OfferComparisonResult {
  offerA: OfferEvaluation;
  offerB: OfferEvaluation;
  recommendedWinner: 'A' | 'B' | 'TIE';
}

/**
 * Rumus Skor Offer Comparator sesuai Aturan Main:
 * Total = (Normalisasi Gaji x 50%) + (Skor Mode Kerja x 25%) + (Skill Match % x 25%)
 * Skor Mode: Remote 100, Hybrid 75, Onsite 50.
 */
export function calculateOfferComparison(
  appA: Application,
  appB: Application,
  kaptenSkills: string[]
): OfferComparisonResult {
  const salaryA = Math.max(0, appA.salaryOffer ?? 0);
  const salaryB = Math.max(0, appB.salaryOffer ?? 0);
  const maxSalary = Math.max(salaryA, salaryB);

  const buildEvaluation = (
    application: Application,
    salary: number
  ): OfferEvaluation => {
    const normalizedSalary = maxSalary > 0 ? (salary / maxSalary) * 100 : 0;
    const weightedSalary = normalizedSalary * 0.5;

    const workModeScore = getWorkModeScore(application.workMode);
    const weightedWorkMode = workModeScore * 0.25;

    const skillMatch = calculateSkillMatch(
      kaptenSkills,
      application.requiredSkills
    );
    const weightedSkillMatch = skillMatch.score * 0.25;

    const totalScore = weightedSalary + weightedWorkMode + weightedSkillMatch;

    return {
      application,
      salary,
      normalizedSalary,
      weightedSalary,
      workModeScore,
      weightedWorkMode,
      skillMatch,
      weightedSkillMatch,
      totalScore,
    };
  };

  const offerA = buildEvaluation(appA, salaryA);
  const offerB = buildEvaluation(appB, salaryB);

  const scoreDiff = offerA.totalScore - offerB.totalScore;
  let recommendedWinner: 'A' | 'B' | 'TIE' = 'TIE';
  if (Math.abs(scoreDiff) >= 1e-6) {
    recommendedWinner = scoreDiff > 0 ? 'A' : 'B';
  }

  return {
    offerA,
    offerB,
    recommendedWinner,
  };
}
