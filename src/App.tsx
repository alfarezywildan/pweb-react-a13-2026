import { useEffect, useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, Layers, Scale } from 'lucide-react';
// --- ORANG 1: Komponen Katalog Lowongan & Profil Skill ---
import { JobCatalogSection } from './components/JobCatalogSection';
import { SkillProfilePanel } from './components/SkillProfilePanel';
// --- ORANG 2: Komponen Form Manual, War Room & State Machine/Log ---
import { ManualApplicationForm } from './components/ManualApplicationForm';
import {
  WarRoomSection,
  applySimulatePlus15Days,
} from './components/WarRoomSection';
import {
  ApplicationStatusAndLogPanel,
  appendManualActivityLog,
  applyStatusTransition,
} from './components/ApplicationStatusAndLogPanel';
import { detectInterviewConflicts } from './utils/applicationRules';
import type {
  Application,
  ApplicationStatus,
  JobDataSource,
  JobListing,
  WorkMode,
} from './types';

// --- ORANG 1: Konfigurasi & Loader Awal Skills/Applications ---
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
  // --- ORANG 1: State Utama Katalog, Skill & Lamaran ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [dataSource, setDataSource] = useState<JobDataSource>('remotive');
  const [kaptenSkills, setKaptenSkills] = useState<string[]>(loadInitialSkills);
  const [applications, setApplications] = useState<Application[]>(
    loadInitialApplications
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- ORANG 2: State Form Manual & Lamaran Terpilih di War Room ---
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // --- ORANG 1: Sinkronisasi localStorage & Auto-hide Toast ---
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

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // --- ORANG 1: Handler Profil Skill & Simpan ke Wishlist ---
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

  const handleRemoveSkill = (skillToRemove: string) => {
    setKaptenSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );
  };

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

  // --- ORANG 2: Handler Form Manual, Simulasi +15 Hari, State Machine & Activity Log ---
  const handleAddManualApplication = (newApplication: Application) => {
    setApplications((prev) => [newApplication, ...prev]);
    setShowManualForm(false);
    setSelectedAppId(newApplication.id);
    setToastMessage(
      `Lamaran "${newApplication.role}" di ${newApplication.company} berhasil ditambahkan.`
    );
  };

  const handleSimulatePlus15Days = (appId: string) => {
    setApplications((prev) => applySimulatePlus15Days(prev, appId));
    setToastMessage('Simulasi +15 hari diterapkan (lastUpdatedAt dimundurkan).');
  };

  const handleTransitionStatus = (
    appId: string,
    nextStatus: ApplicationStatus,
    payload: {
      cvVersion?: string;
      appliedDate?: string;
      interviewDateTime?: string;
      salaryOffer?: number;
      workMode?: WorkMode;
    }
  ) => {
    setApplications((prev) =>
      applyStatusTransition(prev, appId, nextStatus, payload)
    );
    setToastMessage(`Status lamaran berhasil diubah menjadi ${nextStatus}.`);
  };

  const handleAddManualNote = (appId: string, noteText: string) => {
    setApplications((prev) => appendManualActivityLog(prev, appId, noteText));
    setToastMessage('Catatan aktivitas berhasil ditambahkan.');
  };

  // --- ORANG 2: Derived State Lamaran Terpilih & Cek Bentrok Jadwal ---
  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === selectedAppId) ?? null,
    [applications, selectedAppId]
  );

  const interviewConflicts = useMemo(
    () => detectInterviewConflicts(applications),
    [applications]
  );

  const offerCount = applications.filter(
    (app) => app.status === 'OFFER'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-xs tracking-wider">
              A13
            </div>
            <span className="font-bold text-base tracking-tight">
              Magang A13
            </span>
          </div>

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

          {/* ORANG 2: Tombol Cepat Buka Form Lamaran Manual */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pipeline');
              setShowManualForm(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white cursor-pointer"
          >
            + Catat Lamaran
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* ORANG 2: Banner Peringatan Bentrok Jadwal di Luar Tab Pipeline */}
        {activeTab !== 'pipeline' && interviewConflicts.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 font-medium"
          >
            Peringatan: Ada {interviewConflicts.length} jadwal interview yang
            bentrok (&lt; 60 menit). Buka tab{' '}
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className="underline font-bold cursor-pointer"
            >
              Pipeline Lamaran
            </button>{' '}
            untuk melihat detailnya.
          </div>
        )}

        {/* ORANG 1: Tab Eksplorasi Lowongan & Profil Skill */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 xl:col-span-3">
              <SkillProfilePanel
                skills={kaptenSkills}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                dataSource={dataSource}
                onChangeDataSource={setDataSource}
              />
            </div>

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

        {/* ORANG 2: Tab War Room Pipeline, Form Manual, State Machine & Activity Log */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  War Room Pipeline Lamaran
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola status lamaran, simulasi rawan ghosting, cek bentrok
                  jadwal, dan riwayat aktivitas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualForm((prev) => !prev)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                {showManualForm ? 'Tutup Form Manual' : '+ Catat Lamaran Manual'}
              </button>
            </div>

            {showManualForm && (
              <ManualApplicationForm
                existingApplications={applications}
                onAddApplication={handleAddManualApplication}
                onClose={() => setShowManualForm(false)}
              />
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div
                className={
                  selectedApplication ? 'xl:col-span-7' : 'xl:col-span-12'
                }
              >
                <WarRoomSection
                  applications={applications}
                  kaptenSkills={kaptenSkills}
                  onSimulatePlus15Days={handleSimulatePlus15Days}
                  onSelectApplication={(appId) => setSelectedAppId(appId)}
                />
              </div>

              {selectedApplication && (
                <div className="xl:col-span-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">
                        {selectedApplication.company} •{' '}
                        {selectedApplication.workMode}
                      </p>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedApplication.role}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAppId(null)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <ApplicationStatusAndLogPanel
                    application={selectedApplication}
                    onTransitionStatus={handleTransitionStatus}
                    onAddManualNote={handleAddManualNote}
                  />

                  {/* ORANG 3 (Placeholder): Nested Checklist & Interview Prep Timer */}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">
                      Bagian Orang 3 (Belum Diintegrasikan):
                    </p>
                    <p>
                      Nested Checklist (X/Y selesai) &amp; Interview Prep Timer
                      (02:00).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORANG 3 (Placeholder): Tab Offer Comparator */}
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

      {/* Notifikasi Toast */}
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