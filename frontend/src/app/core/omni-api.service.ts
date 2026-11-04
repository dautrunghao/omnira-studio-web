import { Injectable, signal } from '@angular/core';

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

export type ApiResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

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

@Injectable({ providedIn: 'root' })
export class OmniApiService {
  readonly activeWorkspaceId = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('omni.workspaceId') : null
  );
  readonly theme = signal<'dark' | 'light' | 'halloween' | 'system'>(
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('omni.theme') as any)
      : null) || 'dark'
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

  private statsTimer: any;

  constructor() {
    this.applyTheme(this.theme());
    this.exposeWindowBridge();
    this.startStatsPolling();
  }

  setWorkspaceId(id: string | null) {
    this.activeWorkspaceId.set(id);
    if (typeof localStorage !== 'undefined') {
      if (id) localStorage.setItem('omni.workspaceId', id);
      else localStorage.removeItem('omni.workspaceId');
    }
  }

  applyTheme(theme: 'dark' | 'light' | 'halloween' | 'system') {
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

  toast(title: string, message?: string, tone: ToastItem['tone'] = 'info') {
    const id = Math.random().toString(36).slice(2, 10);
    this.toasts.update((list) => [...list, { id, title, message, tone }]);
    setTimeout(() => {
      this.toasts.update((list) => list.filter((t) => t.id !== id));
    }, 4200);
  }

  dismissToast(id: string) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  async invokeRaw<T = any>(endpoint: string, input?: any): Promise<ApiResult<T>> {
    const body = JSON.stringify(input ?? {});
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
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          lastErr = `Máy chủ trả về định dạng không hợp lệ (${res.status})`;
          continue;
        }
        const json = await res.json();
        if (json && typeof json.ok === 'boolean') {
          return json as ApiResult<T>;
        }
        return { ok: true, data: json as T };
      } catch (err: any) {
        lastErr = err?.message || lastErr;
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

  async invoke<T = any>(endpoint: string, input?: any): Promise<T> {
    const res = await this.invokeRaw<T>(endpoint, input);
    if (!res.ok) {
      const errMsg = (res as { ok: false; error: ApiErrorPayload }).error?.message || 'Lỗi gọi API';
      this.toast('Lỗi thao tác', errMsg, 'error');
      throw new Error(errMsg);
    }
    return res.data;
  }

  private startStatsPolling() {
    if (typeof window === 'undefined') return;
    this.statsTimer = setInterval(() => {
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

  private exposeWindowBridge() {
    if (typeof window === 'undefined') return;
    const self = this;
    (window as any).omni = {
      window: {
        minimize: () => {},
        toggleMaximize: () => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
          else document.exitFullscreen?.().catch(() => {});
        },
        close: () => {},
        onStateChanged: (cb: any) => {
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
        setTheme: (t: any) => self.applyTheme(t),
        onNavigate: (_cb: any) => () => {},
        onLicenseChanged: (_cb: any) => () => {},
      },
      system: {
        onStats: (cb: any) => {
          const timer = setInterval(() => cb(self.systemStats()), 5000);
          cb(self.systemStats());
          return () => clearInterval(timer);
        },
      },
      inbox: {
        onChanged: (_cb: any) => () => {},
      },
      api: {
        invoke: (endpoint: string, input?: any) => self.invokeRaw(endpoint, input),
      },
    };
  }
}
