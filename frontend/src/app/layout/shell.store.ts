import { Injectable, computed, inject, signal } from '@angular/core';
import { DynamicEntity } from '../core/models';
import { OmniApiService } from '../core/omni-api.service';
import { asList, errOf } from '../shared/util';
import { FeatureFlag } from './nav-items';

export interface AuthUser {
  id?: string;
  email: string;
  displayName?: string;
  name?: string;
  referralCode?: string;
  points?: number;
  role?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

export interface LicenseView {
  status: string; // active | trial | expired | no_subscription | locked | revoked | relogin | checking | offline
  usable?: boolean;
  planCode?: string;
  planName?: string;
  expiresAt?: string | number | null;
  trial?: boolean;
  maxChannels?: number | null;
  maxDevices?: number | null;
  features?: string[];
  message?: string | null;
  deviceId?: string;
}

export interface AuthState {
  user: AuthUser | null;
  license?: LicenseView | null;
  hasUsers?: boolean;
  lastEmail?: string | null;
  authUser?: AuthUser | null;
  licenseState?: LicenseView | null;
}

export interface WorkspaceRow {
  id?: string;
  name?: string;
  color?: string;
  icon?: string | null;
  channelCount?: number;
  goldenHours?: { start: string; end: string; weight: number }[];
  description?: string;
  defaultTone?: string;
  defaultLanguage?: string;
  hashtags?: string[];
  brandNotes?: string;
  [k: string]: unknown;
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  message?: string;
  url?: string | null;
  unread?: boolean;
  seen?: boolean;
  createdAt?: string | number | null;
  level?: string;
}

export interface MediaStatusView {
  running?: {
    id?: string;
    topic?: string;
    title?: string;
    stage?: string;
    progress?: number;
  } | null;
  queued?: number;
  encoder?: string;
}

/** Trạng thái dùng chung của khung ứng dụng (thay zustand + react-query cache của bản gốc). */
@Injectable({ providedIn: 'root' })
export class ShellStore {
  private readonly api = inject(OmniApiService);

  readonly auth = signal<AuthState | null>(null);
  readonly authError = signal<string | null>(null);
  readonly authLoading = signal(true);
  readonly license = signal<LicenseView | null>(null);
  readonly workspaces = signal<WorkspaceRow[]>([]);
  readonly quota = signal<{ used: number; limit: number | null; blocked?: number } | null>(null);
  readonly notifications = signal<{ items: NotificationItem[]; unread: number }>({ items: [], unread: 0 });
  readonly badges = signal<Record<string, number>>({});
  readonly media = signal<MediaStatusView | null>(null);
  readonly railCollapsed = signal<boolean>(typeof localStorage !== 'undefined' && localStorage.getItem('omni.rail') === '1');
  readonly mobileNavOpen = signal<boolean>(false);
  readonly buyPlanCode = signal<string | null>(null);

  /** Bộ đếm phiên bản để các trang tự tải lại khi dữ liệu liên quan đổi (≈ invalidateQueries). */
  readonly version = signal<Record<string, number>>({});

  readonly user = computed(() => this.auth()?.user ?? null);
  readonly activeWorkspace = computed(() => this.workspaces().find((w) => w.id === this.api.activeWorkspaceId()) ?? null);
  readonly totalChannels = computed(() => this.workspaces().reduce((s, w) => s + (w.channelCount ?? 0), 0));
  readonly features = computed<Set<string>>(() => {
    const lic = this.license() ?? this.auth()?.license;
    // Không có thông tin gói → không khóa tính năng (máy chủ vẫn chặn ở API)
    if (!lic || !Array.isArray(lic.features)) return new Set(['SERIES', 'STUDIO', 'FILM', 'CALENDAR', 'INBOX', 'ANALYTICS']);
    return new Set(lic.features);
  });

  hasFeature(f?: FeatureFlag | string | null): boolean {
    return !f || this.features().has(f);
  }

  licenseUsable(lic: LicenseView | null | undefined): boolean {
    if (!lic) return true;
    if (typeof lic.usable === 'boolean') return lic.usable;
    return ['active', 'trial', 'grace', 'offline'].includes(lic.status);
  }

  bump(...keys: string[]): void {
    this.version.update((v) => {
      const n = { ...v };
      for (const k of keys) n[k] = (n[k] ?? 0) + 1;
      return n;
    });
  }

  ver(key: string): number {
    return this.version()[key] ?? 0;
  }

  toggleRail(): void {
    const next = !this.railCollapsed();
    this.railCollapsed.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('omni.rail', next ? '1' : '0');
    }
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    if (this.mobileNavOpen()) {
      this.mobileNavOpen.set(false);
    }
  }

  async loadAuth(): Promise<void> {
    this.authLoading.set(true);
    const r = await this.api.invokeRaw<AuthState>('auth.state');
    this.authLoading.set(false);
    if (!r.ok) {
      this.authError.set(errOf(r));
      return;
    }
    this.authError.set(null);
    const st: AuthState = r.data ?? { user: null };
    const norm: AuthState = {
      user: st.user ?? st.authUser ?? null,
      license: st.license ?? st.licenseState ?? null,
      hasUsers: st.hasUsers,
      lastEmail: st.lastEmail ?? null,
    };
    this.auth.set(norm);
    if (norm.license) this.license.set(norm.license);
  }

  setUser(user: AuthUser | null): void {
    this.auth.update((s) => ({ ...(s ?? { user: null }), user }));
  }

  async loadLicense(): Promise<void> {
    const r = await this.api.invokeRaw<LicenseView>('license.state');
    if (r.ok && r.data) this.license.set(r.data);
  }

  async loadWorkspaces(): Promise<void> {
    const r = await this.api.invokeRaw<WorkspaceRow[]>('workspaces.list');
    if (r.ok) {
      const list = asList<WorkspaceRow>(r.data);
      this.workspaces.set(list);
      const active = this.api.activeWorkspaceId();
      if (active && list.length && !list.some((w) => w.id === active)) this.api.setWorkspaceId(null);
    }
  }

  async loadQuota(): Promise<void> {
    const r = await this.api.invokeRaw<{ used: number; limit: number | null; blocked?: number }>('channels.quota');
    if (r.ok) this.quota.set(r.data ?? null);
  }

  async loadNotifications(): Promise<NotificationItem[]> {
    const r = await this.api.invokeRaw<DynamicEntity>('cloud.notifications');
    if (!r.ok) return [];
    const d: DynamicEntity = r.data ?? {};
    const items = asList<NotificationItem>(d.items ?? d).map((n) => ({
      ...n,
      unread: n.unread ?? (n.seen === undefined ? false : !n.seen),
    }));
    const prev = new Set(this.notifications().items.map((n) => n.id));
    const unread = typeof d.unread === 'number' ? d.unread : items.filter((n) => n.unread).length;
    this.notifications.set({ items, unread });
    return items.filter((n) => n.unread && !prev.has(n.id));
  }

  async loadBadges(): Promise<void> {
    const wsId = this.api.activeWorkspaceId();
    const [inbox, alerts, media] = await Promise.all([
      this.api.invokeRaw<DynamicEntity>('inbox.stats', { workspaceId: wsId }),
      this.api.invokeRaw<unknown[]>('alerts.open'),
      this.api.invokeRaw<MediaStatusView>('media.status'),
    ]);
    const b: Record<string, number> = { ...this.badges() };
    if (inbox.ok) {
      const d: DynamicEntity = inbox.data ?? {};
      b['inbox'] = d.unread ?? d.unreadCount ?? d.totalUnread ?? 0;
    }
    if (alerts.ok) b['alerts'] = asList(alerts.data).length;
    if (media.ok) this.media.set(media.data);
    this.badges.set(b);
  }

  async logout(): Promise<void> {
    await this.api.invokeRaw('auth.logout');
    this.setUser(null);
  }
}
