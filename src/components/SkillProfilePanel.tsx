import { useState, type FormEvent } from 'react';
import { AlertCircle, Database, Globe, Plus, Sparkles, X } from 'lucide-react';
import type { JobDataSource } from '../types';

interface SkillProfilePanelProps {
  skills: string[];
  onAddSkill: (newSkill: string) => { ok: boolean; error?: string };
  onRemoveSkill: (skillToRemove: string) => void;
  dataSource: JobDataSource;
  onChangeDataSource: (source: JobDataSource) => void;
}

export function SkillProfilePanel({
  skills,
  onAddSkill,
  onRemoveSkill,
  dataSource,
  onChangeDataSource,
}: SkillProfilePanelProps) {
  const [skillInput, setSkillInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onAddSkill(skillInput);
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Gagal menambahkan skill.');
      return;
    }
    setSkillInput('');
    setErrorMsg(null);
  };

  return (
    <aside className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-6 h-fit">
      {/* Bagian Profil Skill Kapten */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Profil Skill Kapten
          </h2>
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {skills.length} skill
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Digunakan untuk menghitung persentase kecocokan tiap lowongan.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => {
              setSkillInput(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Tambah skill (mis. Docker)..."
            aria-label="Tambah skill Kapten"
            className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </form>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Daftar Tag Skill Kapten */}
        {skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Belum ada skill. Tambahkan minimal 1 skill untuk menghitung Match %.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill)}
                  title={`Hapus skill ${skill}`}
                  aria-label={`Hapus skill ${skill}`}
                  className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* Bagian Toggle Sumber Data Lowongan */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Sumber Data Lowongan
        </h3>

        <div className="flex flex-col gap-2.5">
          <label
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              dataSource === 'remotive'
                ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="jobDataSource"
              value="remotive"
              checked={dataSource === 'remotive'}
              onChange={() => onChangeDataSource('remotive')}
              className="accent-blue-600"
            />
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex flex-col">
              <span>Remotive API (Live)</span>
              <span className="text-[11px] font-normal text-slate-500">
                Data lowongan remote live
              </span>
            </div>
          </label>

          <label
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              dataSource === 'fallback'
                ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="jobDataSource"
              value="fallback"
              checked={dataSource === 'fallback'}
              onChange={() => onChangeDataSource('fallback')}
              className="accent-blue-600"
            />
            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex flex-col">
              <span>Dataset Magang ID (Lokal)</span>
              <span className="text-[11px] font-normal text-slate-500">
                15 lowongan tech Indonesia
              </span>
            </div>
          </label>
        </div>
      </div>
    </aside>
  );
}
