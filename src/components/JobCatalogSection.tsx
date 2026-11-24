import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  Database,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { fetchJobsBySource } from '../services/jobService';
import type {
  Application,
  JobDataSource,
  JobListing,
  MatchBadgeColor,
  SkillMatchResult,
  WorkMode,
} from '../types';

interface JobCatalogSectionProps {
  kaptenSkills: string[];
  applications: Application[];
  dataSource: JobDataSource;
  onChangeDataSource: (source: JobDataSource) => void;
  onSaveToWishlist: (job: JobListing, inferredWorkMode: WorkMode) => void;
}

type CatalogSortOption = 'match-desc' | 'match-asc' | 'company-asc';

/**
 * Menghitung Skill Match Score (%) secara derived state:
 * Rumus: Math.round((jumlahCocok / totalRequired) * 100), case-insensitive.
 * Badge warna: hijau >= 70%, kuning 40-69%, merah < 40%.
 */
export function calculateJobSkillMatch(
  requiredSkills: string[],
  kaptenSkills: string[]
): SkillMatchResult {
  if (requiredSkills.length === 0) {
    return {
      score: 100,
      matchedSkills: [],
      missingSkills: [],
      badgeColor: 'green',
    };
  }

  const normalizedKaptenSkills = new Set(
    kaptenSkills.map((skill) => skill.trim().toLowerCase())
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of requiredSkills) {
    if (normalizedKaptenSkills.has(reqSkill.trim().toLowerCase())) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);
  let badgeColor: MatchBadgeColor = 'red';
  if (score >= 70) {
    badgeColor = 'green';
  } else if (score >= 40) {
    badgeColor = 'yellow';
  }

  return {
    score,
    matchedSkills,
    missingSkills,
    badgeColor,
  };
}

export function inferWorkModeFromLocation(locationText: string): WorkMode {
  const lower = locationText.toLowerCase();
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('onsite') || lower.includes('on-site')) return 'Onsite';
  return 'Remote';
}

function getCompanyInitials(companyName: string): string {
  const parts = companyName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function JobCatalogSection({
  kaptenSkills,
  applications,
  dataSource,
  onChangeDataSource,
  onSaveToWishlist,
}: JobCatalogSectionProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const debouncedKeyword = useDebounce(searchKeyword, 400);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<CatalogSortOption>('match-desc');

  // Fetch data lowongan dengan useEffect + fetch() + AbortController
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);

    fetchJobsBySource(dataSource, controller.signal)
      .then((fetchedJobs) => {
        if (!controller.signal.aborted) {
          setJobs(fetchedJobs);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan jaringan saat memuat daftar lowongan.';
        setErrorMessage(message);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [dataSource, retryCounter]);

  // Daftar kategori unik dari data lowongan
  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const job of jobs) {
      if (job.category.trim().length > 0) {
        set.add(job.category.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  // Pastikan selectedCategory tetap valid saat ganti sumber data
  useEffect(() => {
    if (selectedCategory !== 'ALL' && !categories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [categories, selectedCategory]);

  // Cek anti-duplikat lamaran: pasangan company + role (case-insensitive)
  const existingApplicationKeys = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    for (const app of applications) {
      const key = `${app.company.trim().toLowerCase()}:::${app.role.trim().toLowerCase()}`;
      set.add(key);
    }
    return set;
  }, [applications]);

  // Derived state: gabungkan setiap lowongan dengan hasil perhitungan Skill Match, lalu filter & urutkan
  const processedJobs = useMemo(() => {
    const query = debouncedKeyword.trim().toLowerCase();

    const enriched = jobs.map((job) => {
      const match = calculateJobSkillMatch(job.tags, kaptenSkills);
      const appKey = `${job.company_name.trim().toLowerCase()}:::${job.title.trim().toLowerCase()}`;
      const isAlreadyApplied = existingApplicationKeys.has(appKey);
      const inferredWorkMode = inferWorkModeFromLocation(
        job.candidate_required_location
      );

      return {
        job,
        match,
        isAlreadyApplied,
        inferredWorkMode,
      };
    });

    const filtered = enriched.filter(({ job }) => {
      const matchesCategory =
        selectedCategory === 'ALL' || job.category === selectedCategory;
      if (!matchesCategory) return false;

      if (query.length === 0) return true;

      const inTitle = job.title.toLowerCase().includes(query);
      const inCompany = job.company_name.toLowerCase().includes(query);
      const inLocation = job.candidate_required_location
        .toLowerCase()
        .includes(query);
      const inTags = job.tags.some((tag) => tag.toLowerCase().includes(query));

      return inTitle || inCompany || inLocation || inTags;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'match-desc') {
        return b.match.score - a.match.score;
      }
      if (sortBy === 'match-asc') {
        return a.match.score - b.match.score;
      }
      return a.job.company_name.localeCompare(b.job.company_name);
    });
  }, [
    jobs,
    kaptenSkills,
    existingApplicationKeys,
    debouncedKeyword,
    selectedCategory,
    sortBy,
  ]);

  const handleRetry = () => {
    setRetryCounter((prev) => prev + 1);
  };

  const handleSwitchToFallback = () => {
    if (dataSource === 'fallback') {
      handleRetry();
    } else {
      onChangeDataSource('fallback');
    }
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Bar Pencarian Debounce, Filter Kategori, dan Sortir */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari posisi, perusahaan, atau skill (debounce 400ms)..."
            aria-label="Cari posisi atau perusahaan"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchKeyword !== debouncedKeyword && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-blue-600 font-medium">
              Mengetik...
            </span>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter Kategori Lowongan"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative flex items-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CatalogSortOption)}
              aria-label="Urutkan Lowongan"
              className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="match-desc">Match Tertinggi</option>
              <option value="match-asc">Match Terendah</option>
              <option value="company-asc">Nama Perusahaan (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* State 1: Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-sm font-semibold text-slate-800">
            Memuat daftar lowongan magang...
          </div>
          <p className="text-xs text-slate-500">
            Mengambil data dari{' '}
            {dataSource === 'remotive'
              ? 'Remotive Live API'
              : 'Dataset Fallback Lokal (/magang-fallback.json)'}
          </p>
        </div>
      )}

      {/* State 2: Error + Tombol Coba Lagi & Fallback Lokal */}
      {!isLoading && errorMessage && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-red-900">
            Gagal Memuat Data Lowongan
          </h3>
          <p className="text-xs text-red-700 max-w-md">{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi (Retry)
            </button>

            <button
              type="button"
              onClick={handleSwitchToFallback}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Gunakan Fallback Lokal (15 Lowongan ID)
            </button>
          </div>
        </div>
      )}

      {/* State 3: Empty State */}
      {!isLoading && !errorMessage && processedJobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-slate-800">
            Tidak ada lowongan yang cocok dengan pencarian
          </p>
          <p className="text-xs text-slate-500">
            Coba ubah kata kunci pencarian{' '}
            {debouncedKeyword ? `"${debouncedKeyword}"` : ''} atau ganti filter
            kategori.
          </p>
          {(searchKeyword !== '' || selectedCategory !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setSelectedCategory('ALL');
              }}
              className="mt-2 rounded-lg bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      )}

      {/* Daftar Kartu Lowongan */}
      {!isLoading && !errorMessage && processedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedJobs.map(
            ({ job, match, isAlreadyApplied, inferredWorkMode }) => {
              const badgeStyles =
                match.badgeColor === 'green'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : match.badgeColor === 'yellow'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200';

              const dotStyles =
                match.badgeColor === 'green'
                  ? 'bg-emerald-500'
                  : match.badgeColor === 'yellow'
                  ? 'bg-amber-500'
                  : 'bg-red-500';

              return (
                <article
                  key={`${dataSource}-${job.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    {/* Header Kartu: Avatar Perusahaan + Nama + Match Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {getCompanyInitials(job.company_name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-800 truncate">
                            {job.company_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">
                            {job.candidate_required_location} •{' '}
                            <span className="font-medium text-slate-600">
                              {job.category}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Badge Match Score % */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shrink-0 ${badgeStyles}`}
                        title={`${match.matchedSkills.length} dari ${job.tags.length} skill cocok`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${dotStyles}`}
                        />
                        {match.score}% Match
                      </span>
                    </div>

                    {/* Judul Posisi / Role */}
                    <h4 className="text-sm font-bold text-slate-900 mb-3 leading-snug">
                      {job.title}
                    </h4>

                    {/* Daftar Tag Skill: Skill Cocok vs Missing Skills */}
                    <div className="flex flex-wrap gap-1.5">
                      {job.tags.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          Tidak ada syarat skill spesifik
                        </span>
                      ) : (
                        job.tags.map((tag) => {
                          const isMatched = match.matchedSkills.some(
                            (m) => m.toLowerCase() === tag.toLowerCase()
                          );
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                                isMatched
                                  ? 'bg-slate-100 text-slate-800 border-slate-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                              title={
                                isMatched
                                  ? 'Skill sudah dikuasai Kapten'
                                  : 'Missing skill (belum ada di Profil Skill Kapten)'
                              }
                            >
                              {tag}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Footer Kartu: Gaji & Tombol Aksi */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-900 text-sm">
                        {job.salary}
                      </span>{' '}
                      {job.salary.toLowerCase().includes('rp') && '/ bulan'}
                    </div>

                    {isAlreadyApplied ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        Sudah Dilamar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSaveToWishlist(job, inferredWorkMode)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Simpan ke Wishlist
                      </button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
