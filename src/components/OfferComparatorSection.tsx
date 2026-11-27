import { useMemo, useState } from 'react';
import { ArrowRight, Scale, Sparkles } from 'lucide-react';
import type { Application } from '../types';
import {
  calculateOfferComparison,
  type OfferEvaluation,
} from '../utils/orang3Helpers';

interface OfferComparatorSectionProps {
  applications: Application[];
  kaptenSkills: string[];
  onNavigateToPipeline?: () => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface OfferEvaluationCardProps {
  label: string;
  evaluation: OfferEvaluation;
  isRecommended: boolean;
  isTie: boolean;
}

function OfferEvaluationCard({
  label,
  evaluation,
  isRecommended,
  isTie,
}: OfferEvaluationCardProps) {
  const { application, salary, skillMatch } = evaluation;
  const totalRequiredSkills =
    skillMatch.matchedSkills.length + skillMatch.missingSkills.length;

  return (
    <article
      className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-5 transition-all ${
        isRecommended
          ? 'border-blue-500 border-t-4 border-t-blue-600 ring-2 ring-blue-100'
          : 'border-slate-200'
      }`}
    >
      <div className="space-y-4">
        {/* Header Kartu Offer & Badge Rekomendasi Terbaik */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
              {application.company}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {application.role}
            </p>
          </div>

          {isRecommended && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              {isTie ? 'Rekomendasi Terbaik (Seri)' : 'Rekomendasi Terbaik'}
            </span>
          )}
        </div>

        {/* Tabel Breakdown 3 Kriteria Bobot */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100 text-xs sm:text-sm">
          {/* Kriteria 1: Uang Saku / Gaji (50%) */}
          <div className="py-3 flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium">
              Uang Saku / Bulan
            </span>
            <span className="font-bold text-slate-900">
              {formatRupiah(salary)}
            </span>
            <span className="font-mono font-bold text-slate-700 shrink-0">
              {evaluation.weightedSalary.toFixed(1)} / 50
            </span>
          </div>

          {/* Kriteria 2: Mode Kerja (25%) */}
          <div className="py-3 flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium">Mode Kerja</span>
            <span className="font-bold text-slate-900">
              {application.workMode} ({evaluation.workModeScore})
            </span>
            <span className="font-mono font-bold text-slate-700 shrink-0">
              {evaluation.weightedWorkMode.toFixed(1)} / 25
            </span>
          </div>

          {/* Kriteria 3: Skill Match % (25%) */}
          <div className="py-3 flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium">Kecocokan Skill</span>
            <span className="font-bold text-slate-900">
              {skillMatch.score}% ({skillMatch.matchedSkills.length} dari{' '}
              {totalRequiredSkills} skill)
            </span>
            <span className="font-mono font-bold text-slate-700 shrink-0">
              {evaluation.weightedSkillMatch.toFixed(1)} / 25
            </span>
          </div>
        </div>

        {/* Ringkasan Tag Skill Cocok vs Missing */}
        {totalRequiredSkills > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skillMatch.matchedSkills.map((skill) => (
              <span
                key={`matched-${skill}`}
                className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
              >
                {skill}
              </span>
            ))}
            {skillMatch.missingSkills.map((skill) => (
              <span
                key={`missing-${skill}`}
                className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-medium text-rose-600"
                title="Skill belum ada di Profil Skill Kapten"
              >
                {skill} (Missing)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kotak Total Skor Berbobot */}
      <div
        className={`rounded-xl px-4 py-3.5 flex items-center justify-between border ${
          isRecommended
            ? 'bg-blue-50/80 border-blue-200 text-blue-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <span
          className={`text-xs font-extrabold uppercase tracking-wider ${
            isRecommended ? 'text-blue-700' : 'text-slate-600'
          }`}
        >
          Total Skor Berbobot
        </span>
        <span
          className={`font-mono text-2xl sm:text-3xl font-extrabold ${
            isRecommended ? 'text-blue-900' : 'text-slate-900'
          }`}
        >
          {evaluation.totalScore.toFixed(1)}
        </span>
      </div>
    </article>
  );
}

export function OfferComparatorSection({
  applications,
  kaptenSkills,
  onNavigateToPipeline,
}: OfferComparatorSectionProps) {
  const offerApplications = useMemo(
    () => applications.filter((app) => app.status === 'OFFER'),
    [applications]
  );

  const [selectedOfferAId, setSelectedOfferAId] = useState<string>('');
  const [selectedOfferBId, setSelectedOfferBId] = useState<string>('');

  // Pesan kosong yang jelas jika jumlah lamaran berstatus OFFER masih < 2
  if (offerApplications.length < 2) {
    const singleOffer = offerApplications[0];
    return (
      <section className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Scale className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Belum Cukup Offer untuk Dibandingkan ({offerApplications.length} / 2
          Offer)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
          Fitur Offer Comparator membutuhkan minimal{' '}
          <strong className="text-slate-800">2 lamaran berstatus OFFER</strong>{' '}
          agar Kapten dapat membandingkan uang saku, mode kerja, dan kecocokan
          skill secara objektif.
        </p>

        {singleOffer && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 font-medium">
            Saat ini baru tersedia 1 offer:{' '}
            <strong>
              {singleOffer.company} — {singleOffer.role}
            </strong>
            . Pindahkan 1 lamaran lagi ke status OFFER di War Room Pipeline.
          </div>
        )}

        {onNavigateToPipeline && (
          <button
            type="button"
            onClick={onNavigateToPipeline}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <span>Buka Pipeline Lamaran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </section>
    );
  }

  // Pastikan Offer A dan Offer B selalu merujuk ke 2 offer berbeda secara valid
  const effectiveOfferA =
    offerApplications.find((app) => app.id === selectedOfferAId) ??
    offerApplications[0];

  const effectiveOfferB =
    offerApplications.find(
      (app) => app.id === selectedOfferBId && app.id !== effectiveOfferA.id
    ) ??
    offerApplications.find((app) => app.id !== effectiveOfferA.id) ??
    offerApplications[1];

  const comparison = calculateOfferComparison(
    effectiveOfferA,
    effectiveOfferB,
    kaptenSkills
  );

  const handleChangeOfferA = (nextId: string) => {
    if (nextId === effectiveOfferB.id) {
      setSelectedOfferBId(effectiveOfferA.id);
    }
    setSelectedOfferAId(nextId);
  };

  const handleChangeOfferB = (nextId: string) => {
    if (nextId === effectiveOfferA.id) {
      setSelectedOfferAId(effectiveOfferB.id);
    }
    setSelectedOfferBId(nextId);
  };

  const isTie = comparison.recommendedWinner === 'TIE';
  const isARecommended =
    comparison.recommendedWinner === 'A' || comparison.recommendedWinner === 'TIE';
  const isBRecommended =
    comparison.recommendedWinner === 'B' || comparison.recommendedWinner === 'TIE';

  return (
    <section className="space-y-5">
      {/* Header & Pemilih Offer A vs Offer B */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Bandingkan Offer Magang
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bobot penilaian: Uang Saku 50% • Mode Kerja 25% (Remote 100, Hybrid
            75, Onsite 50) • Kecocokan Skill 25%
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <label
              htmlFor="select-offer-a"
              className="font-bold text-slate-600 shrink-0"
            >
              Offer A:
            </label>
            <select
              id="select-offer-a"
              value={effectiveOfferA.id}
              onChange={(e) => handleChangeOfferA(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {offerApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company} — {app.role}
                </option>
              ))}
            </select>
          </div>

          <span className="text-center font-extrabold text-slate-400 uppercase">
            vs
          </span>

          <div className="flex items-center gap-2">
            <label
              htmlFor="select-offer-b"
              className="font-bold text-slate-600 shrink-0"
            >
              Offer B:
            </label>
            <select
              id="select-offer-b"
              value={effectiveOfferB.id}
              onChange={(e) => handleChangeOfferB(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {offerApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company} — {app.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dua Kartu Perbandingan Skor Berbobot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <OfferEvaluationCard
          label="Offer A"
          evaluation={comparison.offerA}
          isRecommended={isARecommended}
          isTie={isTie}
        />

        <OfferEvaluationCard
          label="Offer B"
          evaluation={comparison.offerB}
          isRecommended={isBRecommended}
          isTie={isTie}
        />
      </div>
    </section>
  );
}
