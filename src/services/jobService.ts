import type { JobDataSource, JobListing, RemotiveApiResponse } from '../types';

const REMOTIVE_API_URL =
  'https://remotive.com/api/remote-jobs?category=software-dev&limit=30';
const FALLBACK_LOCAL_URL = '/magang-fallback.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeJobItem(raw: unknown, index: number): JobListing {
  if (!isRecord(raw)) {
    return {
      id: index + 1,
      title: 'Software Engineering Intern',
      company_name: 'Unknown Company',
      category: 'Software Development',
      candidate_required_location: 'Remote',
      salary: 'Kompetitif',
      tags: [],
    };
  }

  const id = typeof raw.id === 'number' ? raw.id : index + 1;
  const title =
    typeof raw.title === 'string' && raw.title.trim().length > 0
      ? raw.title.trim()
      : 'Software Engineering Intern';
  const company_name =
    typeof raw.company_name === 'string' && raw.company_name.trim().length > 0
      ? raw.company_name.trim()
      : 'Unknown Company';
  const category =
    typeof raw.category === 'string' && raw.category.trim().length > 0
      ? raw.category.trim()
      : 'Software Development';
  const candidate_required_location =
    typeof raw.candidate_required_location === 'string' &&
    raw.candidate_required_location.trim().length > 0
      ? raw.candidate_required_location.trim()
      : 'Remote';
  const salary =
    typeof raw.salary === 'string' && raw.salary.trim().length > 0
      ? raw.salary.trim()
      : 'Kompetitif / Tidak dicantumkan';
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];

  return {
    id,
    title,
    company_name,
    category,
    candidate_required_location,
    salary,
    tags,
  };
}

function parseJobsPayload(payload: unknown): JobListing[] {
  if (Array.isArray(payload)) {
    return payload.map((item, idx) => normalizeJobItem(item, idx));
  }

  if (isRecord(payload) && Array.isArray((payload as unknown as RemotiveApiResponse).jobs)) {
    const rawJobs = (payload as unknown as RemotiveApiResponse).jobs;
    return rawJobs.map((item, idx) => normalizeJobItem(item, idx));
  }

  throw new Error('Format data lowongan tidak valid.');
}

/**
 * Mengambil daftar lowongan dari Remotive API (Live) atau Fallback Lokal (/magang-fallback.json)
 * dengan dukungan AbortSignal untuk membatalkan request yang belum selesai saat unmount/ganti sumber.
 */
export async function fetchJobsBySource(
  source: JobDataSource,
  signal?: AbortSignal
): Promise<JobListing[]> {
  const targetUrl = source === 'remotive' ? REMOTIVE_API_URL : FALLBACK_LOCAL_URL;

  const response = await fetch(targetUrl, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Gagal mengambil data lowongan (${response.status} ${response.statusText}).`
    );
  }

  const data: unknown = await response.json();
  return parseJobsPayload(data);
}
