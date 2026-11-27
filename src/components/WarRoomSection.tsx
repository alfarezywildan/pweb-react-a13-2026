import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  Clock,
  Filter,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Application, ApplicationStatus } from '../types';
import {
  detectInterviewConflicts,
  isAtRiskOfGhosting,
} from '../utils/applicationRules';
import { calculateSkillMatch } from '../utils/skillMatch';

type SortOption = 'newest' | 'interview_soonest' | 'highest_offer';

const STATUS_FILTER_OPTIONS: Array<'ALL' | ApplicationStatus> = [
  'ALL',
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'GHOSTED',
];

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

interface WarRoomSectionProps {
  applications: Application[];
  kaptenSkills: string[];
  onSimulatePlus15Days: (appId: string) => void;
  onSelectApplication?: (appId: string) => void;
  onDeleteApplication?: (appId: string) => void;
}

function formatDateTime(isoOrLocal?: string): string {
  if (!isoOrLocal) return '-';
  const ms = Date.parse(isoOrLocal);
  if (Number.isNaN(ms)) return isoOrLocal;
  return new Date(ms).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrencyIdr(amount?: number): string {
  if (!amount || amount <= 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WarRoomSection({
  applications,
  kaptenSkills,
  onSimulatePlus15Days,
  onSelectApplication,
  onDeleteApplication,
}: WarRoomSectionProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>(
    'ALL'
  );
  const [onlyGhostingRisk, setOnlyGhostingRisk] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Bentrok jadwal dicek dari SELURUH data applications, bukan data ter-filter
  const conflicts = useMemo(
    () => detectInterviewConflicts(applications),
    [applications]
  );

  // Filter gabungan + sorting (derived state)
  const visibleApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = applications.filter((app) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        app.company.toLowerCase().includes(normalizedQuery) ||
        app.role.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === 'ALL' || app.status === statusFilter;

      const matchesGhosting =
        !onlyGhostingRisk || isAtRiskOfGhosting(app);

      return matchesQuery && matchesStatus && matchesGhosting;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        const aTime = Date.parse(a.lastUpdatedAt) || 0;
        const bTime = Date.parse(b.lastUpdatedAt) || 0;
        return bTime - aTime;
      }

      if (sortBy === 'interview_soonest') {
        const aTime = a.interviewDateTime
          ? Date.parse(a.interviewDateTime)
          : Number.POSITIVE_INFINITY;
        const bTime = b.interviewDateTime
          ? Date.parse(b.interviewDateTime)
          : Number.POSITIVE_INFINITY;
        const safeA = Number.isNaN(aTime) ? Number.POSITIVE_INFINITY : aTime;
        const safeB = Number.isNaN(bTime) ? Number.POSITIVE_INFINITY : bTime;
        return safeA - safeB;
      }

      // highest_offer
      const aOffer = a.salaryOffer ?? 0;
      const bOffer = b.salaryOffer ?? 0;
      return bOffer - aOffer;
    });

    return sorted;
  }, [applications, searchQuery, statusFilter, onlyGhostingRisk, sortBy]);

  return (
    <section className="space-y-4">
      {/* Banner Bentrok Jadwal Interview (< 60 menit) */}
      {conflicts.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-2xs"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-amber-950">
                Jadwal Interview Bentrok ({conflicts.length} pasangan berselisih
                &lt; 60 menit)
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                {conflicts.map((pair, idx) => (
                  <li key={`${pair.first.id}-${pair.second.id}-${idx}`}>
                    <span className="font-semibold">
                      {pair.first.company} ({pair.first.role})
                    </span>{' '}
                    [{formatDateTime(pair.first.interviewDateTime)}] dan{' '}
                    <span className="font-semibold">
                      {pair.second.company} ({pair.second.role})
                    </span>{' '}
                    [{formatDateTime(pair.second.interviewDateTime)}] berselisih{' '}
                    <span className="font-bold">{pair.diffMinutes} menit</span>.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Panel Filter Gabungan & Sorting */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari perusahaan atau posisi di War Room..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              aria-label="Filter Status Lamaran"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | ApplicationStatus)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'Semua Status' : status}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              aria-label="Urutkan Lamaran"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="interview_soonest">
                Jadwal Interview Terdekat
              </option>
              <option value="highest_offer">Offer Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Toggle Hanya Rawan Ghosting */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
            <input
              type="checkbox"
              checked={onlyGhostingRisk}
              onChange={(e) => setOnlyGhostingRisk(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Hanya Rawan Ghosting (&gt; 14 hari pada APPLIED/SCREENING)</span>
          </label>

          <span className="text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {visibleApplications.length}
            </strong>{' '}
            dari <strong className="text-slate-800">{applications.length}</strong>{' '}
            lamaran
          </span>
        </div>
      </div>

      {/* Daftar Kartu Lamaran */}
      {visibleApplications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Tidak ada lamaran yang cocok dengan filter saat ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleApplications.map((app) => {
            const match = calculateSkillMatch(kaptenSkills, app.requiredSkills);
            const ghostingRisk = isAtRiskOfGhosting(app);
            const completedChecklist = app.checklist.filter(
              (item) => item.done
            ).length;
            const totalChecklist = app.checklist.length;
            const canSimulateGhosting =
              app.status === 'APPLIED' || app.status === 'SCREENING';

            const badgeStyle =
              match.badgeColor === 'green'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : match.badgeColor === 'yellow'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <article
                key={app.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {app.company} • {app.workMode}
                      </p>
                      <h3 className="text-base font-bold text-slate-900">
                        {app.role}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}
                    >
                      {match.score}% Match
                    </span>
                  </div>

                  {/* Status & Badge Rawan Ghosting */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {app.status}
                    </span>
                    {ghostingRisk && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-300">
                        <Clock className="w-3 h-3" />
                        Rawan Ghosting
                      </span>
                    )}
                    {app.cvVersion && (
                      <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        CV: {app.cvVersion}
                      </span>
                    )}
                  </div>

                  {/* Info Tambahan: Checklist, Jadwal Interview, Gaji Offer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                    <div>
                      Checklist:{' '}
                      <strong className="text-slate-800">
                        {completedChecklist}/{totalChecklist}
                      </strong>{' '}
                      selesai
                    </div>
                    {app.interviewDateTime && (
                      <div className="inline-flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(app.interviewDateTime)}</span>
                      </div>
                    )}
                    {typeof app.salaryOffer === 'number' &&
                      app.salaryOffer > 0 && (
                        <div className="inline-flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-semibold text-emerald-700">
                            {formatCurrencyIdr(app.salaryOffer)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  {canSimulateGhosting ? (
                    <button
                      type="button"
                      onClick={() => onSimulatePlus15Days(app.id)}
                      className="px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-xs font-semibold text-orange-800 hover:bg-orange-100 transition-colors cursor-pointer"
                    >
                      Simulasi +15 Hari
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Update: {formatDateTime(app.lastUpdatedAt)}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    {onDeleteApplication && (
                      <button
                        type="button"
                        onClick={() => onDeleteApplication(app.id)}
                        aria-label={`Hapus lamaran ${app.role} di ${app.company}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}

                    {onSelectApplication && (
                      <button
                        type="button"
                        onClick={() => onSelectApplication(app.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Detail &amp; Transisi
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Helper immutable untuk dipakai di parent saat handler onSimulatePlus15Days dipanggil
export function applySimulatePlus15Days(
  applications: Application[],
  appId: string
): Application[] {
  return applications.map((app) => {
    if (app.id !== appId) return app;
    const baseMs = Date.parse(app.lastUpdatedAt);
    const currentMs = Number.isNaN(baseMs) ? Date.now() : baseMs;
    const shiftedIso = new Date(currentMs - FIFTEEN_DAYS_MS).toISOString();

    return {
      ...app,
      lastUpdatedAt: shiftedIso,
      activityLogs: [
        ...app.activityLogs,
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          message:
            'Simulasi +15 Hari: lastUpdatedAt dimundurkan 15 hari untuk uji Rawan Ghosting',
        },
      ],
    };
  });
}