import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  History,
  MessageSquarePlus,
} from 'lucide-react';
import type { Application, ApplicationStatus, WorkMode } from '../types';
import {
  getAllowedNextStatuses,
  validateTransitionPayload,
} from '../utils/stateMachine';

interface ApplicationStatusAndLogPanelProps {
  application: Application;
  onTransitionStatus: (
    appId: string,
    nextStatus: ApplicationStatus,
    payload: {
      cvVersion?: string;
      appliedDate?: string;
      interviewDateTime?: string;
      salaryOffer?: number;
      workMode?: WorkMode;
    }
  ) => void;
  onAddManualNote: (appId: string, noteText: string) => void;
}

function formatLogTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ApplicationStatusAndLogPanel({
  application,
  onTransitionStatus,
  onAddManualNote,
}: ApplicationStatusAndLogPanelProps) {
  const allowedNextStatuses = getAllowedNextStatuses(application.status);

  const [selectedNextStatus, setSelectedNextStatus] =
    useState<ApplicationStatus | ''>('');
  const [cvVersion, setCvVersion] = useState<string>(
    application.cvVersion ?? ''
  );
  const [appliedDate, setAppliedDate] = useState<string>(
    application.appliedDate ?? ''
  );
  const [interviewDateTime, setInterviewDateTime] = useState<string>(
    application.interviewDateTime ?? ''
  );
  const [salaryOfferInput, setSalaryOfferInput] = useState<string>(
    application.salaryOffer ? String(application.salaryOffer) : ''
  );
  const [workMode, setWorkMode] = useState<WorkMode>(application.workMode);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // State catatan manual di Activity Log
  const [manualNote, setManualNote] = useState<string>('');
  const [noteError, setNoteError] = useState<string | null>(null);

  // Sinkronkan pilihan status tujuan setiap kali lamaran atau status lamaran berubah
  useEffect(() => {
    setSelectedNextStatus(allowedNextStatuses[0] ?? '');
    setCvVersion(application.cvVersion ?? '');
    setAppliedDate(application.appliedDate ?? '');
    setInterviewDateTime(application.interviewDateTime ?? '');
    setSalaryOfferInput(
      application.salaryOffer ? String(application.salaryOffer) : ''
    );
    setWorkMode(application.workMode);
    setTransitionError(null);
    setSuccessNotice(null);
  }, [
    application.id,
    application.status,
    application.cvVersion,
    application.appliedDate,
    application.interviewDateTime,
    application.salaryOffer,
    application.workMode,
  ]);

  const handleTransitionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessNotice(null);

    if (!selectedNextStatus) {
      setTransitionError('Tidak ada status tujuan yang tersedia.');
      return;
    }

    const parsedSalary =
      salaryOfferInput.trim() === '' ? undefined : Number(salaryOfferInput);

    const payload = {
      cvVersion: cvVersion.trim() || undefined,
      appliedDate: appliedDate.trim() || undefined,
      interviewDateTime: interviewDateTime.trim() || undefined,
      salaryOffer: parsedSalary,
      workMode,
    };

    const validation = validateTransitionPayload(selectedNextStatus, payload);
    if (!validation.valid) {
      setTransitionError(validation.error ?? 'Data transisi belum lengkap.');
      return;
    }

    setTransitionError(null);
    onTransitionStatus(application.id, selectedNextStatus, payload);
    setSuccessNotice(`Status berhasil dipindahkan ke ${selectedNextStatus}.`);
  };

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualNote.trim();
    if (!trimmed) {
      setNoteError('Catatan tidak boleh kosong.');
      return;
    }

    setNoteError(null);
    onAddManualNote(application.id, trimmed);
    setManualNote('');
  };

  return (
    <div className="space-y-5">
      {/* Bagian Transisi Status (State Machine) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Transisi Status (State Machine)
            </h3>
            <p className="text-xs text-slate-500">
              Status saat ini:{' '}
              <span className="font-bold text-blue-700">
                {application.status}
              </span>
            </p>
          </div>
        </div>

        {allowedNextStatuses.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            Status <strong className="text-slate-900">{application.status}</strong>{' '}
            bersifat final dan tidak dapat dipindahkan lagi.
          </div>
        ) : (
          <form onSubmit={handleTransitionSubmit} className="space-y-3.5">
            {transitionError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{transitionError}</span>
              </div>
            )}

            {successNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Pilihan Status Tujuan Sah */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Status Tujuan Sah
              </span>
              <div className="flex flex-wrap gap-2">
                {allowedNextStatuses.map((target) => {
                  const isSelected = selectedNextStatus === target;
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        setSelectedNextStatus(target);
                        setTransitionError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {target}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Kondisional ke APPLIED */}
            {selectedNextStatus === 'APPLIED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <div>
                  <label
                    htmlFor="transition-cv"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Versi CV (cvVersion) *
                  </label>
                  <input
                    id="transition-cv"
                    type="text"
                    value={cvVersion}
                    onChange={(e) => setCvVersion(e.target.value)}
                    placeholder="Contoh: Kapten-CV-v2.pdf"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="transition-applied-date"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tanggal Melamar (appliedDate) *
                  </label>
                  <input
                    id="transition-applied-date"
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Input Kondisional ke INTERVIEW */}
            {selectedNextStatus === 'INTERVIEW' && (
              <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3">
                <label
                  htmlFor="transition-interview-dt"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Jadwal Interview (YYYY-MM-DDTHH:mm) *
                </label>
                <input
                  id="transition-interview-dt"
                  type="datetime-local"
                  value={interviewDateTime}
                  onChange={(e) => setInterviewDateTime(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            )}

            {/* Input Kondisional ke OFFER */}
            {selectedNextStatus === 'OFFER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <div>
                  <label
                    htmlFor="transition-salary"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nominal Gaji / Uang Saku (Rp &gt; 0) *
                  </label>
                  <input
                    id="transition-salary"
                    type="number"
                    min={1}
                    value={salaryOfferInput}
                    onChange={(e) => setSalaryOfferInput(e.target.value)}
                    placeholder="Contoh: 5500000"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="transition-work-mode"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Mode Kerja (workMode) *
                  </label>
                  <select
                    id="transition-work-mode"
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>Konfirmasi Pindah ke {selectedNextStatus}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Bagian Riwayat Aktivitas (Activity Log + Catatan Manual) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Aktivitas ({application.activityLogs.length})
          </h3>
        </div>

        <form onSubmit={handleNoteSubmit} className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Tambah catatan manual (misal: Sudah konfirmasi jadwal ke HRD)..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Catat
            </button>
          </div>
          {noteError && (
            <p className="text-xs text-red-600 font-medium">{noteError}</p>
          )}
        </form>

        {application.activityLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Belum ada riwayat aktivitas.
          </p>
        ) : (
          <ul className="space-y-2 border-t border-slate-100 pt-3">
            {[...application.activityLogs].reverse().map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-3 text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
              >
                <span className="text-slate-800 font-medium">
                  {log.message}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {formatLogTimestamp(log.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Helper immutable untuk diterapkan pada state applications di parent
export function applyStatusTransition(
  applications: Application[],
  appId: string,
  nextStatus: ApplicationStatus,
  payload: {
    cvVersion?: string;
    appliedDate?: string;
    interviewDateTime?: string;
    salaryOffer?: number;
    workMode?: WorkMode;
  }
): Application[] {
  return applications.map((app) => {
    if (app.id !== appId) return app;
    const nowIso = new Date().toISOString();

    let detailNote = '';
    if (nextStatus === 'APPLIED') {
      detailNote = ` (CV: ${payload.cvVersion}, Tanggal: ${payload.appliedDate})`;
    } else if (nextStatus === 'INTERVIEW') {
      detailNote = ` (Jadwal: ${payload.interviewDateTime})`;
    } else if (nextStatus === 'OFFER') {
      detailNote = ` (Gaji: Rp ${(payload.salaryOffer ?? 0).toLocaleString('id-ID')}, Mode: ${payload.workMode ?? app.workMode})`;
    }

    return {
      ...app,
      status: nextStatus,
      workMode: payload.workMode ?? app.workMode,
      cvVersion: payload.cvVersion ?? app.cvVersion,
      appliedDate: payload.appliedDate ?? app.appliedDate,
      interviewDateTime: payload.interviewDateTime ?? app.interviewDateTime,
      salaryOffer: payload.salaryOffer ?? app.salaryOffer,
      lastUpdatedAt: nowIso,
      activityLogs: [
        ...app.activityLogs,
        {
          id: crypto.randomUUID(),
          timestamp: nowIso,
          message: `Pindah status dari ${app.status} ke ${nextStatus}${detailNote}`,
        },
      ],
    };
  });
}

export function appendManualActivityLog(
  applications: Application[],
  appId: string,
  noteText: string
): Application[] {
  return applications.map((app) => {
    if (app.id !== appId) return app;
    const nowIso = new Date().toISOString();
    return {
      ...app,
      lastUpdatedAt: nowIso,
      activityLogs: [
        ...app.activityLogs,
        {
          id: crypto.randomUUID(),
          timestamp: nowIso,
          message: `Catatan: ${noteText}`,
        },
      ],
    };
  });
}