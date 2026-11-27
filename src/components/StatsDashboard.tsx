import { useMemo } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Application } from '../types';
import { calculateDashboardStats } from '../utils/orang3Helpers';

interface StatsDashboardProps {
  applications: Application[];
}

export function StatsDashboard({ applications }: StatsDashboardProps) {
  // Seluruh 5 kartu statistik wajib dihitung sebagai derived state (tanpa useState terpisah)
  const stats = useMemo(
    () => calculateDashboardStats(applications),
    [applications]
  );

  return (
    <section
      aria-label="Ringkasan Statistik Lamaran"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
    >
      {/* Kartu 1: Total Lamaran */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Total Lamaran</span>
          <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
        <div className="text-2xl font-extrabold text-slate-900">
          {stats.totalApplications}
        </div>
        <p className="text-xs text-slate-500">
          {stats.activePipelineCount} aktif di pipeline
        </p>
      </article>

      {/* Kartu 2: Response Rate % */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Response Rate</span>
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
        </div>
        <div className="text-2xl font-extrabold text-slate-900">
          {stats.responseRate}%
        </div>
        <p className="text-xs text-slate-500">
          {stats.respondedCount} dari {stats.totalApplications} diproses
        </p>
      </article>

      {/* Kartu 3: Interview Rate % */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Interview Rate</span>
          <CalendarClock className="w-4 h-4 text-purple-500 shrink-0" />
        </div>
        <div className="text-2xl font-extrabold text-slate-900">
          {stats.interviewRate}%
        </div>
        <p className="text-xs text-slate-500">
          {stats.interviewCount} masuk wawancara
        </p>
      </article>

      {/* Kartu 4: Rawan Ghosting */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Rawan Ghosting</span>
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              stats.ghostingRiskCount > 0 ? 'text-red-500' : 'text-slate-400'
            }`}
          />
        </div>
        <div
          className={`text-2xl font-extrabold ${
            stats.ghostingRiskCount > 0 ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          {stats.ghostingRiskCount}
        </div>
        <p className="text-xs text-slate-500">&gt; 14 hari tanpa kabar</p>
      </article>

      {/* Kartu 5: Total Offer */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Total Offer</span>
          <Sparkles
            className={`w-4 h-4 shrink-0 ${
              stats.totalOffers > 0 ? 'text-emerald-500' : 'text-slate-400'
            }`}
          />
        </div>
        <div
          className={`text-2xl font-extrabold ${
            stats.totalOffers > 0 ? 'text-emerald-600' : 'text-slate-900'
          }`}
        >
          {stats.totalOffers}
        </div>
        <p className="text-xs text-slate-500">
          {stats.totalOffers >= 2
            ? 'Siap dibandingkan'
            : 'Butuh min. 2 offer untuk komparasi'}
        </p>
      </article>
    </section>
  );
}
