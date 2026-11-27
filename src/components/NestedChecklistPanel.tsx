import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { Application } from '../types';

interface NestedChecklistPanelProps {
  application: Application;
  onAddChecklistItem: (appId: string, text: string) => void;
  onToggleChecklistItem: (appId: string, itemId: string) => void;
  onDeleteChecklistItem: (appId: string, itemId: string) => void;
}

export function NestedChecklistPanel({
  application,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: NestedChecklistPanelProps) {
  const [newItemText, setNewItemText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived state untuk progress bar (X/Y selesai)
  const totalItems = application.checklist.length;
  const completedItems = application.checklist.filter(
    (item) => item.done
  ).length;
  const progressPercentage =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newItemText.trim();

    if (!trimmed) {
      setErrorMessage('Item checklist persiapan tidak boleh kosong.');
      return;
    }

    onAddChecklistItem(application.id, trimmed);
    setNewItemText('');
    setErrorMessage(null);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
      {/* Header & Ringkasan Progress */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Daftar Persiapan
          </h3>
        </div>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
          {completedItems} / {totalItems} selesai ({progressPercentage}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-label="Progress checklist persiapan lamaran"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70"
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            progressPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Daftar Item Checklist */}
      {totalItems === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          Belum ada tugas persiapan untuk lamaran ini. Tambahkan item baru di
          bawah.
        </div>
      ) : (
        <ul className="space-y-2">
          {application.checklist.map((item) => (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                item.done
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    onToggleChecklistItem(application.id, item.id)
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer accent-blue-600"
                />
                <span
                  className={`font-medium break-words ${
                    item.done ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {item.text}
                </span>
              </label>

              <button
                type="button"
                onClick={() => onDeleteChecklistItem(application.id, item.id)}
                aria-label={`Hapus item checklist ${item.text}`}
                title="Hapus item checklist"
                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Form Tambah Item Checklist */}
      <form onSubmit={handleSubmit} className="space-y-1.5 pt-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => {
              setNewItemText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Tambah tugas persiapan baru..."
            aria-label="Tambah tugas persiapan baru"
            className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
        </div>

        {errorMessage && (
          <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}
      </form>
    </section>
  );
}
