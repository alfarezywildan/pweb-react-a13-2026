import type { ApplicationStatus, WorkMode } from '../types';

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  WISHLIST: ['APPLIED', 'REJECTED'],
  APPLIED: ['SCREENING', 'GHOSTED', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'GHOSTED', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  GHOSTED: ['SCREENING', 'REJECTED'],
  OFFER: [],
  REJECTED: [],
};

export interface TransitionPayload {
  cvVersion?: string;
  appliedDate?: string;
  interviewDateTime?: string;
  salaryOffer?: number; 
  workMode?: WorkMode;
}

export function getAllowedNextStatuses(
  currentStatus: ApplicationStatus
): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

export function canTransitionStatus(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function validateTransitionPayload(
  nextStatus: ApplicationStatus,
  payload: TransitionPayload
): { valid: boolean; error?: string } {
  if (nextStatus === 'APPLIED') {
    if (!payload.cvVersion?.trim()) {
      return { valid: false, error: 'Versi CV wajib diisi saat pindah ke APPLIED.' };
    }
    if (!payload.appliedDate?.trim()) {
      return { valid: false, error: 'Tanggal lamaran wajib diisi saat pindah ke APPLIED.' };
    }
  }

  if (nextStatus === 'INTERVIEW') {
    if (!payload.interviewDateTime?.trim()) {
      return {
        valid: false,
        error: 'Jadwal interview wajib diisi saat pindah ke INTERVIEW.',
      };
    }
  }

  if (nextStatus === 'OFFER') {
    if (
      typeof payload.salaryOffer !== 'number' ||
      Number.isNaN(payload.salaryOffer) ||
      payload.salaryOffer <= 0
    ) {
      return {
        valid: false,
        error: 'Nominal gaji/uang saku wajib lebih besar dari 0 saat pindah ke OFFER.',
      };
    }
    if (!payload.workMode) {
      return {
        valid: false,
        error: 'Mode kerja wajib dipilih saat pindah ke OFFER.',
      };
    }
  }

  return { valid: true };
}