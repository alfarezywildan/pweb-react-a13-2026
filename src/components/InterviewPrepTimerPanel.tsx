import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import type { Application } from '../types';

const INITIAL_TIMER_SECONDS = 120; // 02:00 per soal

interface InterviewQuestion {
  id: number;
  category: string;
  prompt: string;
}

const INTERVIEW_PREP_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    category: 'React & State Management',
    prompt:
      'Ceritakan bagaimana kamu mengelola state bertingkat di proyek React yang pernah kamu buat, dan bagaimana kamu mencegah bug mutasi state langsung?',
  },
  {
    id: 2,
    category: 'React Hooks & Lifecycle',
    prompt:
      'Jelaskan perbedaan utama antara useEffect, useMemo, dan useRef di React, serta berikan contoh kasus nyata kapan masing-masing harus dipakai!',
  },
  {
    id: 3,
    category: 'Debugging & API Handling',
    prompt:
      'Ceritakan pengalamanmu menangani race condition, error jaringan, atau request API yang lambat di aplikasi frontend dan solusi yang kamu terapkan.',
  },
  {
    id: 4,
    category: 'TypeScript & Kualitas Kode',
    prompt:
      'Mengapa mode strict tanpa tipe any penting pada proyek TypeScript tim, dan bagaimana caramu memvalidasi data eksternal dari REST API?',
  },
  {
    id: 5,
    category: 'Motivasi & Fit Perusahaan',
    prompt:
      'Mengapa kamu tertarik melamar posisi magang ini, dan kontribusi teknis apa yang ingin kamu capai dalam 3 bulan pertama?',
  },
  {
    id: 6,
    category: 'Kolaborasi & Manajemen Waktu',
    prompt:
      'Bagaimana caramu membagi prioritas saat deadline proyek magang berdekatan dengan jadwal kuliah atau ujian, serta berkomunikasi dengan mentor?',
  },
];

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface InterviewPrepTimerPanelProps {
  application: Application;
}

export function InterviewPrepTimerPanel({
  application,
}: InterviewPrepTimerPanelProps) {
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(INITIAL_TIMER_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const isTimerActive = isRunning && secondsLeft > 0;

  // Wajib Cleanup: clearInterval saat pause, waktu habis, atau saat panel ditutup (unmount)
  useEffect(() => {
    if (!isTimerActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTimerActive]);

  const handleToggleStartPause = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(INITIAL_TIMER_SECONDS);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(INITIAL_TIMER_SECONDS);
  };

  const handleNextQuestion = () => {
    setIsRunning(false);
    setSecondsLeft(INITIAL_TIMER_SECONDS);
    setQuestionIndex((prev) => (prev + 1) % INTERVIEW_PREP_QUESTIONS.length);
  };

  const currentQuestion = INTERVIEW_PREP_QUESTIONS[questionIndex];
  const isTimeUp = secondsLeft === 0;
  const isLowTime = secondsLeft > 0 && secondsLeft <= 20;

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
      {/* Header Panel */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Latihan Interview
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
          Soal {questionIndex + 1} / {INTERVIEW_PREP_QUESTIONS.length}
        </span>
      </div>

      {/* Konteks Posisi & Kartu Pertanyaan */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-purple-700">
          <span>{currentQuestion.category}</span>
          <span className="text-slate-400 font-normal">
            Target: {application.company}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
          &ldquo;{currentQuestion.prompt}&rdquo;
        </p>
      </div>

      {/* Countdown Timer 02:00 & Tombol Kontrol */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div>
          <div
            aria-live="polite"
            className={`font-mono text-2xl font-extrabold tracking-wider ${
              isTimeUp
                ? 'text-red-600'
                : isLowTime
                  ? 'text-amber-600'
                  : isTimerActive
                    ? 'text-blue-700'
                    : 'text-slate-900'
            }`}
          >
            {formatCountdown(secondsLeft)}
          </div>
          <p className="text-[11px] text-slate-500">
            {isTimeUp
              ? 'Waktu habis! Klik Reset atau Soal Berikutnya.'
              : isTimerActive
                ? 'Timer berjalan (otomatis bersih saat ditutup)'
                : 'Durasi latihan 2 menit per soal'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleStartPause}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer ${
              isTimerActive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isTimerActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Start
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetTimer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            type="button"
            onClick={handleNextQuestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <span>Soal Berikutnya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
