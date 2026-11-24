import { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, Layers, Scale } from 'lucide-react';
import { JobCatalogSection } from './components/JobCatalogSection';
import { SkillProfilePanel } from './components/SkillProfilePanel';
import type {
  Application,
  JobDataSource,
  JobListing,
  WorkMode,
} from './types';

const SKILLS_STORAGE_KEY = 'aku_mw_magang_kapten_skills';
const APPLICATIONS_STORAGE_KEY = 'aku_mw_magang_applications';

const DEFAULT_KAPTEN_SKILLS: string[] = [
  'React',
  'TypeScript',
  'CSS',
  'Git',
  'REST API',
];

function loadInitialSkills(): string[] {
  try {
    const raw = window.localStorage.getItem(SKILLS_STORAGE_KEY);
    if (!raw) return DEFAULT_KAPTEN_SKILLS;
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((item): item is string => typeof item === 'string')
    ) {
      return parsed;
    }
    return DEFAULT_KAPTEN_SKILLS;
  } catch {
    return DEFAULT_KAPTEN_SKILLS;
  }
}

function loadInitialApplications(): Application[] {
  try {
    const raw = window.localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Application[];
    }
    return [];
  } catch {
    return [];
  }
}

type ActiveTab = 'catalog' | 'pipeline' | 'comparator';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [dataSource, setDataSource] = useState<JobDataSource>('remotive');
  const [kaptenSkills, setKaptenSkills] = useState<string[]>(loadInitialSkills);
  const [applications, setApplications] = useState<Application[]>(
    loadInitialApplications
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simpan perubahan kaptenSkills ke localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SKILLS_STORAGE_KEY,
        JSON.stringify(kaptenSkills)
      );
    } catch {
      // Ignore storage quota error
    }
  }, [kaptenSkills]);

  // Simpan perubahan applications ke localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        APPLICATIONS_STORAGE_KEY,
        JSON.stringify(applications)
      );
    } catch {
      // Ignore storage quota error
    }
  }, [applications]);

  // Auto-hide notifikasi toast setelah 3 detik
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Handler tambah skill Kapten (tolak kosong & tolak duplikat case-insensitive)
  const handleAddSkill = (
    rawSkill: string
  ): { ok: boolean; error?: string } => {
    const trimmed = rawSkill.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Nama skill tidak boleh kosong.' };
    }

    const isDuplicate = kaptenSkills.some(
      (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return {
        ok: false,
        error: `Skill "${trimmed}" sudah ada di Profil Kapten.`,
      };
    }

    setKaptenSkills((prev) => [...prev, trimmed]);
    return { ok: true };
  };

  // Handler hapus skill Kapten
  const handleRemoveSkill = (skillToRemove: string) => {
    setKaptenSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );
  };

  // Handler Simpan ke Wishlist dari Katalog Lowongan (Anti-duplikat company + role)
  const handleSaveToWishlist = (
    job: JobListing,
    inferredWorkMode: WorkMode
  ) => {
    const isDuplicate = applications.some(
      (app) =>
        app.company.trim().toLowerCase() ===
          job.company_name.trim().toLowerCase() &&
        app.role.trim().toLowerCase() === job.title.trim().toLowerCase()
    );

    if (isDuplicate) {
      return;
    }

    const nowIso = new Date().toISOString();
    const newApplication: Application = {
      id: crypto.randomUUID(),
      company: job.company_name.trim(),
      role: job.title.trim(),
      workMode: inferredWorkMode,
      status: 'WISHLIST',
      requiredSkills: [...job.tags],
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: crypto.randomUUID(),
          text: `Sesuaikan CV dengan posisi ${job.title.trim()}`,
          done: false,
        },
        {
          id: crypto.randomUUID(),
          text: `Riset produk & tech stack ${job.company_name.trim()}`,
          done: false,
        },
      ],
      activityLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: nowIso,
          message: 'Disimpan ke Wishlist dari Katalog Lowongan',
        },
      ],
    };

    setApplications((prev) => [newApplication, ...prev]);
    setToastMessage(
      `Lowongan "${job.title}" di ${job.company_name} berhasil disimpan ke Wishlist!`
    );
  };

  const offerCount = applications.filter(
    (app) => app.status === 'OFFER'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Navbar (Sesuai Wireframe Soal) */}
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-xs tracking-wider">
              A13
            </div>
            <span className="font-bold text-base tracking-tight">
              Magang A13
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Eksplorasi Lowongan
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Pipeline Lamaran ({applications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparator')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'comparator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Bandingkan Offer ({offerCount})
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Kiri: Profil Skill Kapten & Sumber Data (4 kolom di layar besar) */}
            <div className="lg:col-span-4 xl:col-span-3">
              <SkillProfilePanel
                skills={kaptenSkills}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                dataSource={dataSource}
                onChangeDataSource={setDataSource}
              />
            </div>

            {/* Area Kanan: Katalog Lowongan, Search Debounce, Filter & Match Badge (8/9 kolom) */}
            <div className="lg:col-span-8 xl:col-span-9">
              <JobCatalogSection
                kaptenSkills={kaptenSkills}
                applications={applications}
                dataSource={dataSource}
                onChangeDataSource={setDataSource}
                onSaveToWishlist={handleSaveToWishlist}
              />
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              War Room Pipeline Lamaran ({applications.length} Tersimpan)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Bagian ini disiapkan untuk diintegrasikan oleh Orang 2 (War Room,
              Form Manual & State Machine) dan Orang 3 (Checklist, Prep Timer &
              Undo Delete).
            </p>

            {applications.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Belum ada lamaran tersimpan. Silakan simpan lowongan dari tab
                Eksplorasi Lowongan.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {app.role}
                      </p>
                      <p className="text-slate-500">
                        {app.company} • {app.workMode}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comparator' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Offer Comparator
            </h2>
            <p className="text-xs text-slate-500">
              Bagian ini disiapkan untuk diintegrasikan oleh Orang 3 (Fitur 7:
              Offer Comparator dengan skor berbobot).
            </p>
          </div>
        )}
      </main>

      {/* Notifikasi Toast saat Simpan ke Wishlist */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
