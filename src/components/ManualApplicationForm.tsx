import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, PlusCircle, X } from 'lucide-react';
import type { Application, WorkMode } from '../types';

type InitialApplicationStatus = 'WISHLIST' | 'APPLIED';

interface ManualApplicationFormProps {
  existingApplications: Application[];
  onAddApplication: (newApplication: Application) => void;
  onClose?: () => void;
}

export function ManualApplicationForm({
  existingApplications,
  onAddApplication,
  onClose,
}: ManualApplicationFormProps) {
  // Controlled form states
  const [company, setCompany] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [workMode, setWorkMode] = useState<WorkMode>('Remote');
  const [initialStatus, setInitialStatus] =
    useState<InitialApplicationStatus>('WISHLIST');
  const [requiredSkillsText, setRequiredSkillsText] = useState<string>('');
  const [cvVersion, setCvVersion] = useState<string>('');
  const [appliedDate, setAppliedDate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs untuk auto-focus ke input pertama yang error
  const companyInputRef = useRef<HTMLInputElement | null>(null);
  const roleInputRef = useRef<HTMLInputElement | null>(null);
  const skillsInputRef = useRef<HTMLInputElement | null>(null);
  const cvVersionInputRef = useRef<HTMLInputElement | null>(null);
  const appliedDateInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    const parsedSkills = Array.from(
      new Set(
        requiredSkillsText
          .split(',')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      )
    );

    // 1. Validasi input kosong (berurutan agar fokus ke field pertama yang error)
    if (!trimmedCompany) {
      setErrorMessage('Nama perusahaan wajib diisi.');
      companyInputRef.current?.focus();
      return;
    }

    if (!trimmedRole) {
      setErrorMessage('Posisi / role magang wajib diisi.');
      roleInputRef.current?.focus();
      return;
    }

    if (parsedSkills.length === 0) {
      setErrorMessage(
        'Minimal isi 1 required skill (pisahkan dengan koma, misal: React, TypeScript).'
      );
      skillsInputRef.current?.focus();
      return;
    }

    if (initialStatus === 'APPLIED') {
      if (!cvVersion.trim()) {
        setErrorMessage('Versi CV wajib diisi untuk status awal APPLIED.');
        cvVersionInputRef.current?.focus();
        return;
      }

      if (!appliedDate.trim()) {
        setErrorMessage('Tanggal melamar wajib diisi untuk status awal APPLIED.');
        appliedDateInputRef.current?.focus();
        return;
      }
    }

    // 2. Validasi anti-duplikat pasangan company + role (case-insensitive)
    const isDuplicate = existingApplications.some(
      (app) =>
        app.company.trim().toLowerCase() === trimmedCompany.toLowerCase() &&
        app.role.trim().toLowerCase() === trimmedRole.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMessage(
        `Lamaran untuk "${trimmedRole}" di "${trimmedCompany}" sudah ada di daftar.`
      );
      companyInputRef.current?.focus();
      return;
    }

    // 3. Susun objek Application baru & catat activity log awal
    const nowIso = new Date().toISOString();
    const initialLogMessage =
      initialStatus === 'APPLIED'
        ? `Lamaran ditambahkan langsung sebagai APPLIED (CV: ${cvVersion.trim()}, Tanggal: ${appliedDate.trim()})`
        : 'Lamaran ditambahkan secara manual ke WISHLIST';

    const newApplication: Application = {
      id: crypto.randomUUID(),
      company: trimmedCompany,
      role: trimmedRole,
      workMode,
      status: initialStatus,
      requiredSkills: parsedSkills,
      ...(initialStatus === 'APPLIED'
        ? {
            cvVersion: cvVersion.trim(),
            appliedDate: appliedDate.trim(),
          }
        : {}),
      lastUpdatedAt: nowIso,
      checklist: [
        {
          id: crypto.randomUUID(),
          text: `Sesuaikan CV dengan posisi ${trimmedRole}`,
          done: false,
        },
        {
          id: crypto.randomUUID(),
          text: `Riset produk & tim ${trimmedCompany}`,
          done: false,
        },
      ],
      activityLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: nowIso,
          message: initialLogMessage,
        },
      ],
    };

    onAddApplication(newApplication);

    // Reset form & error
    setCompany('');
    setRole('');
    setWorkMode('Remote');
    setInitialStatus('WISHLIST');
    setRequiredSkillsText('');
    setCvVersion('');
    setAppliedDate('');
    setErrorMessage(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            + Catat Lamaran Manual
          </h3>
          <p className="text-xs text-slate-500">
            Tambahkan lowongan di luar katalog ke dalam pipeline lamaran Kapten.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form lamaran manual"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="manual-company"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Perusahaan <span className="text-red-500">*</span>
          </label>
          <input
            ref={companyInputRef}
            id="manual-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Contoh: Garuda FinTech"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="manual-role"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Posisi / Role <span className="text-red-500">*</span>
          </label>
          <input
            ref={roleInputRef}
            id="manual-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Contoh: Frontend Developer Intern"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="manual-work-mode"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Mode Kerja
          </label>
          <select
            id="manual-work-mode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">Onsite</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="manual-initial-status"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Status Awal
          </label>
          <select
            id="manual-initial-status"
            value={initialStatus}
            onChange={(e) =>
              setInitialStatus(e.target.value as InitialApplicationStatus)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="WISHLIST">WISHLIST</option>
            <option value="APPLIED">APPLIED</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="manual-required-skills"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Required Skills (pisahkan dengan koma){' '}
          <span className="text-red-500">*</span>
        </label>
        <input
          ref={skillsInputRef}
          id="manual-required-skills"
          type="text"
          value={requiredSkillsText}
          onChange={(e) => setRequiredSkillsText(e.target.value)}
          placeholder="Contoh: React, TypeScript, Tailwind CSS, Git"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
        />
      </div>

      {initialStatus === 'APPLIED' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3.5">
          <div>
            <label
              htmlFor="manual-cv-version"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Versi CV <span className="text-red-500">*</span>
            </label>
            <input
              ref={cvVersionInputRef}
              id="manual-cv-version"
              type="text"
              value={cvVersion}
              onChange={(e) => setCvVersion(e.target.value)}
              placeholder="Contoh: Kapten-CV-v2.pdf"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="manual-applied-date"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Tanggal Melamar <span className="text-red-500">*</span>
            </label>
            <input
              ref={appliedDateInputRef}
              id="manual-applied-date"
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Simpan Lamaran
        </button>
      </div>
    </form>
  );
}