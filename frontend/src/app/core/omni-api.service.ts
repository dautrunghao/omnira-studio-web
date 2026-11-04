import { Injectable, signal } from '@angular/core';
import { DynamicEntity } from './models';

export type ApiErrorCode =
  | 'VALIDATION'
  | 'AUTH'
  | 'LICENSE'
  | 'FEATURE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'QUOTA'
  | 'BUDGET'
  | 'AI'
  | 'EXTERNAL'
  | 'INTERNAL';

export interface ApiErrorPayload {
  code: ApiErrorCode | string;
  message: string;
}

export type ApiResult<T = DynamicEntity> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data?: undefined; error: ApiErrorPayload };

export interface SystemStats {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  appMemoryMb: number;
  uptimeSec: number;
  timestamp: number;
}

export interface ToastItem {
  id: string;
  tone: 'info' | 'success' | 'warn' | 'error';
  title: string;
  message?: string;
}

export type ThemeMode = 'dark' | 'light' | 'halloween' | 'system';

const DEDUPABLE_PREFIXES = [
  'auth.state',
  'license.state',
  'workspaces.list',
  'channels.list',
  'channels.quota',
  'dashboard.summary',
  'dashboard.topChannels',
  'dashboard.daemon',
  'alerts.open',
  'inbox.stats',
  'media.status',
  'cloud.notifications',
];

@Injectable({ providedIn: 'root' })
export class OmniApiService {
  readonly activeWorkspaceId = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('omni.workspaceId') : null,
  );
  readonly theme = signal<ThemeMode>(
    this.readStoredTheme(),
  );
  readonly systemStats = signal<SystemStats>({
    cpuPercent: 14,
    memoryUsedMb: 412,
    memoryTotalMb: 16384,
    appMemoryMb: 186,
    uptimeSec: 3600,
    timestamp: Date.now(),
  });
  readonly toasts = signal<ToastItem[]>([]);
  readonly commandPaletteOpen = signal<boolean>(false);
  readonly buyPlanOpen = signal<boolean>(false);

  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private readonly inflightRequests = new Map<string, Promise<ApiResult<unknown>>>();

  constructor() {
    this.applyTheme(this.theme());
    this.exposeWindowBridge();
    this.startStatsPolling();
  }

  private readStoredTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'dark';
    const raw = localStorage.getItem('omni.theme');
    if (raw === 'dark' || raw === 'light' || raw === 'halloween' || raw === 'system') {
      return raw;
    }
    return 'dark';
  }

  setWorkspaceId(id: string | null): void {
    this.activeWorkspaceId.set(id);
    if (typeof localStorage !== 'undefined') {
      if (id) localStorage.setItem('omni.workspaceId', id);
      else localStorage.removeItem('omni.workspaceId');
    }
  }

  applyTheme(theme: ThemeMode): void {
    this.theme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('omni.theme', theme);
    }
    if (typeof document !== 'undefined') {
      const resolved =
        theme === 'system'
          ? window.matchMedia?.('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.classList.toggle('dark', resolved !== 'light');
    }
  }

  toast(title: string, message?: string, tone: ToastItem['tone'] = 'info'): void {
    const id = Math.random().toString(36).slice(2, 10);
    this.toasts.update((list) => [...list.slice(-4), { id, title, message, tone }]);
    setTimeout(() => {
      this.toasts.update((list) => list.filter((t) => t.id !== id));
    }, 4000);
  }

  dismissToast(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  async invokeRaw<T = DynamicEntity>(endpoint: string, input?: unknown): Promise<ApiResult<T>> {
    const body = JSON.stringify(input ?? {});
    const isDedupable = DEDUPABLE_PREFIXES.includes(endpoint);
    const cacheKey = isDedupable ? `${endpoint}:${body}` : '';

    if (cacheKey) {
      const existing = this.inflightRequests.get(cacheKey);
      if (existing) {
        return (await existing) as ApiResult<T>;
      }
    }

    const requestPromise = this.performFetch<T>(endpoint, body);
    if (cacheKey) {
      this.inflightRequests.set(cacheKey, requestPromise as Promise<ApiResult<unknown>>);
    }

    try {
      return await requestPromise;
    } finally {
      if (cacheKey) {
        this.inflightRequests.delete(cacheKey);
      }
    }
  }

  private async performFetch<T>(endpoint: string, body: string): Promise<ApiResult<T>> {
    const path = `/api/rpc/${encodeURIComponent(endpoint)}`;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    const directUrl = `${protocol}//${host}:3000${path}`;
    const urls = [path, directUrl];

    let lastErr = 'Không kết nối được máy chủ Omnira API';
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.activeWorkspaceId() ? { 'X-Workspace-Id': this.activeWorkspaceId()! } : {}),
          },
          body,
        });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          lastErr = `Máy chủ trả về định dạng không hợp lệ (${res.status})`;
          continue;
        }
        const json = (await res.json()) as { ok?: boolean; data?: T; error?: ApiErrorPayload } | T;
        if (json && typeof json === 'object' && 'ok' in json && typeof json.ok === 'boolean') {
          return json as ApiResult<T>;
        }
        return { ok: true, data: json as T };
      } catch (err: unknown) {
        lastErr = err instanceof Error ? err.message : lastErr;
      }
    }
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: lastErr,
      },
    };
  }

  async invoke<T = DynamicEntity>(endpoint: string, input?: unknown): Promise<T> {
    const res = await this.invokeRaw<T>(endpoint, input);
    if (!res.ok) {
      const errMsg = res.error?.message || 'Lỗi gọi API';
      this.toast('Lỗi thao tác', errMsg, 'error');
      throw new Error(errMsg);
    }
    return res.data;
  }

  private startStatsPolling(): void {
    if (typeof window === 'undefined') return;
    this.statsTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const prev = this.systemStats();
      this.systemStats.set({
        cpuPercent: Math.max(4, Math.min(65, Math.round(prev.cpuPercent + (Math.random() * 8 - 4)))),
        memoryUsedMb: 410 + Math.round(Math.random() * 25),
        memoryTotalMb: 16384,
        appMemoryMb: 180 + Math.round(Math.random() * 14),
        uptimeSec: prev.uptimeSec + 5,
        timestamp: Date.now(),
      });
    }, 5000);
  }

  private exposeWindowBridge(): void {
    if (typeof window === 'undefined') return;
    window.omni = {
      window: {
        minimize: () => {},
        toggleMaximize: () => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
          else document.exitFullscreen?.().catch(() => {});
        },
        close: () => {},
        onStateChanged: (cb) => {
          cb({ isMaximized: false, isFocused: true });
          return () => {};
        },
      },
      app: {
        info: async () => ({
          name: 'Omnira Studio',
          version: '1.2.9',
          platform: 'web',
          electron: 'Web Edition (Angular v22 + NestJS + Firebase)',
        }),
        setTheme: (t) => this.applyTheme(t),
        onNavigate: () => () => {},
        onLicenseChanged: () => () => {},
      },
      system: {
        onStats: (cb) => {
          const timer = setInterval(() => cb(this.systemStats()), 5000);
          cb(this.systemStats());
          return () => clearInterval(timer);
        },
      },
      inbox: {
        onChanged: () => () => {},
      },
      api: {
        invoke: (endpoint: string, input?: unknown) => this.invokeRaw(endpoint, input),
      },
    };
  }
}
