/** Tiện ích dùng chung cho các trang (định dạng số, ngày, nền tảng…). */

export type Platform = 'facebook' | 'tiktok' | 'instagram' | 'youtube';
export const PLATFORM_ORDER: Platform[] = ['facebook', 'tiktok', 'instagram', 'youtube'];

export const PLATFORM_META: Record<string, { label: string; short: string; color: string; series: string }> = {
  facebook: { label: 'Facebook', short: 'FB', color: 'rgb(var(--c-brand-facebook))', series: 'rgb(var(--c-series-facebook))' },
  tiktok: { label: 'TikTok', short: 'TT', color: 'rgb(var(--c-brand-tiktok-red))', series: 'rgb(var(--c-series-tiktok))' },
  instagram: { label: 'Instagram', short: 'IG', color: 'rgb(225 48 108)', series: 'rgb(var(--c-series-instagram))' },
  youtube: { label: 'YouTube', short: 'YT', color: 'rgb(var(--c-brand-youtube))', series: 'rgb(var(--c-series-youtube))' },
};

/** Chấp nhận mảng trực tiếp hoặc `{ items | rows | list | data }`. */
export function asList<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    for (const k of ['items', 'rows', 'list', 'data', 'results']) if (Array.isArray(v[k])) return v[k];
  }
  return [];
}

export const fmtInt = (n: number | null | undefined) =>
  n == null || isNaN(+n) ? '–' : Math.round(+n).toLocaleString('vi-VN');

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(+n)) return '–';
  const v = +n;
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(v));
}

export const fmtPct = (n: number | null | undefined, digits = 0) =>
  n == null || isNaN(+n) ? '–' : `${(+n).toFixed(digits)}%`;

export const fmtSignedPct = (n: number | null | undefined) =>
  n == null || isNaN(+n) ? '–' : `${+n >= 0 ? '+' : ''}${(+n).toFixed(1)}%`;

export const fmtVnd = (n: number | null | undefined) =>
  n == null || isNaN(+n) ? '–' : `${Math.round(+n).toLocaleString('vi-VN')}₫`;

export const fmtUsd = (n: number | null | undefined, d = 2) =>
  n == null || isNaN(+n) ? '–' : `$${(+n).toFixed(d)}`;

export function toDate(v: any): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && typeof v._seconds === 'number') return new Date(v._seconds * 1000);
  if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(typeof v === 'string' && /^\d+$/.test(v) ? +v : v);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDateTime(v: any): string {
  const d = toDate(v);
  return d ? d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
}

export function fmtDate(v: any): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
}

export function fmtTime(v: any): string {
  const d = toDate(v);
  return d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '–';
}

export function fmtRelative(v: any): string {
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
export function toLocalInput(v: any): string {
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

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, any>[], headers: { key: string; label: string }[]): string {
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers.map((h) => esc(h.label)).join(','), ...rows.map((r) => headers.map((h) => esc(r[h.key])).join(','))].join('\n');
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

/** Thông điệp lỗi của ApiResult (tsconfig không strict nên không thu hẹp union được). */
export const errOf = (r: any): string => r?.error?.message ?? 'Lỗi không xác định';
