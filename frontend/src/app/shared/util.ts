/** Tiện ích dùng chung cho các trang (định dạng số, ngày, nền tảng…) – chuẩn TypeScript strict. */
import { DynamicEntity } from '../core/models';

export type Platform = 'facebook' | 'tiktok' | 'instagram' | 'youtube';
export const PLATFORM_ORDER: Platform[] = ['facebook', 'tiktok', 'instagram', 'youtube'];

export const PLATFORM_META: Record<string, { label: string; short: string; color: string; series: string }> = {
  facebook: { label: 'Facebook', short: 'FB', color: 'rgb(var(--c-brand-facebook))', series: 'rgb(var(--c-series-facebook))' },
  tiktok: { label: 'TikTok', short: 'TT', color: 'rgb(var(--c-brand-tiktok-red))', series: 'rgb(var(--c-series-tiktok))' },
  instagram: { label: 'Instagram', short: 'IG', color: 'rgb(225 48 108)', series: 'rgb(var(--c-series-instagram))' },
  youtube: { label: 'YouTube', short: 'YT', color: 'rgb(var(--c-brand-youtube))', series: 'rgb(var(--c-series-youtube))' },
};

/** Chấp nhận mảng trực tiếp hoặc `{ items | rows | list | data | results }`. */
export function asList<T = DynamicEntity>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === 'object') {
    const rec = v as Record<string, unknown>;
    for (const k of ['items', 'rows', 'list', 'data', 'results']) {
      if (Array.isArray(rec[k])) return rec[k] as T[];
    }
  }
  return [];
}

export const fmtInt = (n: number | string | null | undefined): string =>
  n == null || isNaN(+n) ? '–' : Math.round(+n).toLocaleString('vi-VN');

export function fmtCompact(n: number | string | null | undefined): string {
  if (n == null || isNaN(+n)) return '–';
  const v = +n;
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(v));
}

export const fmtPct = (n: number | string | null | undefined, digits = 0): string =>
  n == null || isNaN(+n) ? '–' : `${(+n).toFixed(digits)}%`;

export const fmtSignedPct = (n: number | string | null | undefined): string =>
  n == null || isNaN(+n) ? '–' : `${+n >= 0 ? '+' : ''}${(+n).toFixed(1)}%`;

export const fmtVnd = (n: number | string | null | undefined): string =>
  n == null || isNaN(+n) ? '–' : `${Math.round(+n).toLocaleString('vi-VN')}₫`;

export const fmtUsd = (n: number | string | null | undefined, d = 2): string =>
  n == null || isNaN(+n) ? '–' : `$${(+n).toFixed(d)}`;

export function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    const rec = v as { _seconds?: number; seconds?: number };
    if (typeof rec._seconds === 'number') return new Date(rec._seconds * 1000);
    if (typeof rec.seconds === 'number') return new Date(rec.seconds * 1000);
  }
  if (typeof v === 'number' || typeof v === 'string') {
    const d = new Date(typeof v === 'string' && /^\d+$/.test(v) ? +v : v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function fmtDateTime(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
}

export function fmtDate(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
}

export function fmtTime(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '–';
}

export function fmtRelative(v: unknown): string {
  const d = toDate(v);
  if (!d) return '–';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const fut = diff > 0;
  const m = Math.round(abs / 60000);
  let s: string;
  if (m < 1) return fut ? 'ngay bây giờ' : 'vừa xong';
  if (m < 60) s = `${m} phút`;
  else if (m < 60 * 24) s = `${Math.round(m / 60)} giờ`;
  else if (m < 60 * 24 * 30) s = `${Math.round(m / 1440)} ngày`;
  else s = `${Math.round(m / 43200)} tháng`;
  return fut ? `sau ${s}` : `${s} trước`;
}

/** yyyy-mm-dd theo giờ máy */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Giá trị cho <input type="datetime-local"> */
export function toLocalInput(v: unknown): string {
  const d = toDate(v) ?? new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.replace(/[@#]/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase();
}

export function healthTone(h: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (h === 'ok' || h === 'active' || h === 'valid' || h === 'healthy') return 'success';
  if (h === 'warn' || h === 'warning' || h === 'expiring' || h === 'checkpoint') return 'warning';
  if (h === 'error' || h === 'dead' || h === 'expired' || h === 'banned' || h === 'invalid') return 'danger';
  return 'neutral';
}

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [headers.map((h) => esc(h.label)).join(','), ...rows.map((r) => headers.map((h) => esc(r[h.key])).join(','))].join('\n');
}

/** Đọc file thành dataURL (thay cho hộp thoại chọn file của bản desktop). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export const splitTags = (s: string): string[] =>
  s
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

/** Trích xuất thông điệp lỗi từ kết quả gọi API. */
export const errOf = (r: unknown): string => {
  if (r && typeof r === 'object' && 'error' in r) {
    const err = (r as { error?: { message?: string } }).error;
    if (err?.message) return err.message;
  }
  return 'Lỗi không xác định';
};

/** Helper đọc giá trị từ sự kiện input/change an toàn kiểu. */
export const inputVal = (e: Event): string => (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value ?? '';
export const inputChecked = (e: Event): boolean => Boolean((e.target as HTMLInputElement)?.checked);
export const inputFiles = (e: Event): FileList | null => (e.target as HTMLInputElement)?.files ?? null;
