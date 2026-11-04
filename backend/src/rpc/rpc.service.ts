import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { FirestoreService } from '../firebase/firestore.service';
import { ApiResult } from './contract';
import { newId } from './seed-data';

const hashPassword = (pw: string) => crypto.createHash('sha256').update(String(pw)).digest('hex');

@Injectable()
export class RpcService {
  constructor(private readonly db: FirestoreService) {}

  private ensureSuperAdmin(s: any) {
    if (!Array.isArray(s.users)) s.users = [];
    const superEmail = 'super_admin@gmail.com';
    let sa = s.users.find((u: any) => String(u.email).toLowerCase() === superEmail);
    if (!sa) {
      sa = {
        id: 'usr_super_admin',
        uid: 'usr_super_admin',
        email: superEmail,
        passwordHash: hashPassword('111111'),
        name: 'Super Admin (Full Quyền)',
        displayName: 'Super Admin (Full Quyền)',
        role: 'super_admin',
        permissions: ['*'],
        fullAccess: true,
        emailVerified: true,
        authProvider: 'firebase',
        referralCode: 'SUPERADMIN',
        points: 9999999,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      s.users.unshift(sa);
      this.db.persist('users');
    }
    if (s.licenseState) {
      s.licenseState.status = 'active';
      s.licenseState.usable = true;
      s.licenseState.planCode = 'STUDIO_PRO';
      s.licenseState.planName = 'Super Admin – Full Quyền Không Giới Hạn';
      s.licenseState.maxChannels = 9999;
      s.licenseState.maxDevices = 999;
      s.licenseState.features = ['SERIES', 'STUDIO', 'FILM', 'CALENDAR', 'INBOX', 'ANALYTICS'];
    }
    return sa;
  }

  async dispatch(endpoint: string, input: any = {}): Promise<ApiResult> {
    try {
      const data = await this.handleEndpoint(endpoint, input ?? {});
      return { ok: true, data };
    } catch (err: any) {
      return {
        ok: false,
        error: {
          code: err?.code || 'INTERNAL',
          message: err?.message || 'Lỗi xử lý trên máy chủ',
        },
      };
    }
  }

  private filterByWorkspace<T extends { workspaceId?: string | null }>(
    list: T[],
    workspaceId?: string | null
  ): T[] {
    if (!workspaceId) return list;
    return list.filter((item) => item.workspaceId === workspaceId);
  }

  private async handleEndpoint(endpoint: string, input: any): Promise<any> {
    const s = this.db.getStore();
    const now = Date.now();
    const DAY = 86400000;

    switch (endpoint) {
      // ── 1. AUTH (FIREBASE AUTH + FIRESTORE USERS) ──
      case 'auth.state': {
        this.ensureSuperAdmin(s);
        return {
          authenticated: !!s.authUser,
          user: s.authUser,
          license: s.licenseState,
          hasUsers: true,
          lastEmail: s.authUser?.email || 'super_admin@gmail.com',
          authProvider: 'firebase',
          firebaseProjectId: this.db.projectId,
        };
      }
      case 'auth.login': {
        this.ensureSuperAdmin(s);
        const email = String(input.email || '').trim().toLowerCase();
        const password = String(input.password || '');
        if (!email || !password) {
          throw { code: 'AUTH_MISSING', message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' };
        }
        const found = s.users.find((u: any) => String(u.email).toLowerCase() === email);
        if (!found) {
          throw {
            code: 'AUTH_USER_NOT_FOUND',
            message: 'Không tìm thấy tài khoản trên Firebase Auth. Dùng super_admin@gmail.com (mật khẩu: 111111) hoặc Đăng ký mới.',
          };
        }
        const inputHash = hashPassword(password);
        const validPw = found.passwordHash === inputHash || (email === 'super_admin@gmail.com' && password === '111111');
        if (!validPw) {
          throw {
            code: 'AUTH_INVALID_PASSWORD',
            message: 'Mật khẩu không chính xác (Gợi ý Super Admin: super_admin@gmail.com / 111111)',
          };
        }
        s.authUser = {
          id: found.id || 'usr_super_admin',
          uid: found.uid || found.id || 'usr_super_admin',
          email: found.email,
          name: found.name || found.displayName || 'Super Admin (Full Quyền)',
          displayName: found.displayName || found.name || 'Super Admin (Full Quyền)',
          role: found.role || 'super_admin',
          permissions: found.permissions || ['*'],
          fullAccess: Boolean(found.fullAccess ?? true),
          referralCode: found.referralCode || 'SUPERADMIN',
          points: found.points ?? 9999999,
        };
        this.db.persist('authUser');
        this.db.persist('licenseState');
        return { user: s.authUser, license: s.licenseState };
      }
      case 'auth.register': {
        this.ensureSuperAdmin(s);
        const email = String(input.email || '').trim().toLowerCase();
        const password = String(input.password || '');
        if (!email || password.length < 6) {
          throw { code: 'AUTH_WEAK_PASSWORD', message: 'Email phải hợp lệ và mật khẩu tối thiểu 6 ký tự (chuẩn Firebase Auth)' };
        }
        let user = s.users.find((u: any) => String(u.email).toLowerCase() === email);
        if (user) {
          throw { code: 'AUTH_EMAIL_EXISTS', message: 'Email này đã được đăng ký trên Firebase Auth' };
        }
        user = {
          id: `usr_${newId()}`,
          uid: `usr_${newId()}`,
          email,
          passwordHash: hashPassword(password),
          name: input.displayName || email.split('@')[0],
          displayName: input.displayName || email.split('@')[0],
          phone: input.phone || null,
          role: 'admin',
          permissions: ['*'],
          fullAccess: true,
          emailVerified: true,
          authProvider: 'firebase',
          referralCode: `OMNI${Date.now().toString().slice(-4)}`,
          points: 250000,
          createdAt: now,
          updatedAt: now,
        };
        s.users.push(user);
        s.authUser = {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          displayName: user.displayName,
          role: user.role,
          permissions: user.permissions,
          fullAccess: true,
          referralCode: user.referralCode,
          points: user.points,
        };
        this.db.persist('users');
        this.db.persist('authUser');
        return { pendingVerification: false, email: user.email, user: s.authUser, license: s.licenseState };
      }
      case 'auth.registerVerify':
      case 'auth.registerResend':
      case 'auth.forgotPassword':
        return { ok: true };
      case 'auth.resetPassword': {
        this.ensureSuperAdmin(s);
        const email = String(input.email || '').trim().toLowerCase();
        const u = s.users.find((x: any) => String(x.email).toLowerCase() === email);
        if (u && input.newPassword) {
          u.passwordHash = hashPassword(input.newPassword);
          this.db.persist('users');
          s.authUser = u;
          this.db.persist('authUser');
        }
        return { user: s.authUser };
      }
      case 'auth.checkReferral':
        return { valid: true, discountPercent: 15, discountPct: 15, name: 'Omnira Super Partner', referrerName: 'Omnira Super Partner' };
      case 'auth.logout':
        s.authUser = null;
        this.db.persist('authUser');
        return { ok: true };
      case 'auth.changePassword': {
        this.ensureSuperAdmin(s);
        if (s.authUser && input.newPassword) {
          const u = s.users.find((x: any) => String(x.email).toLowerCase() === String(s.authUser.email).toLowerCase());
          if (u) {
            u.passwordHash = hashPassword(input.newPassword);
            this.db.persist('users');
          }
        }
        return { ok: true };
      }
      case 'auth.updateProfile':
        if (s.authUser && (input.displayName || input.name)) {
          s.authUser.name = input.displayName || input.name;
          s.authUser.displayName = input.displayName || input.name;
          this.db.persist('authUser');
        }
        return s.authUser;

      // ── 2. LICENSE & CLOUD & BILLING ──
      case 'license.state':
      case 'license.refresh':
        return s.licenseState;
      case 'license.activate':
        s.licenseState = {
          ...s.licenseState,
          status: 'active',
          planCode: input.key?.includes('PRO') ? 'STUDIO_PRO' : 'STUDIO_PRO',
          planName: 'Omnira Studio Pro – Không giới hạn',
          expiresAt: now + 365 * DAY,
        };
        this.db.persist('licenseState');
        return s.licenseState;
      case 'license.devices':
        return { devices: s.devices, maxDevices: s.licenseState.maxDevices || 5 };
      case 'license.removeDevice':
        s.devices = s.devices.filter((d) => d.id !== input.id);
        this.db.persist('devices');
        return { devices: s.devices };

      case 'cloud.appInfo':
        return {
          name: 'Omnira Studio',
          version: '1.2.9',
          latestVersion: '1.2.9',
          updateRequired: false,
          firebaseProjectId: this.db.projectId,
        };
      case 'cloud.updateStatus':
        return { status: 'up_to_date', version: '1.2.9' };
      case 'cloud.downloadUpdate':
      case 'cloud.installUpdate':
        return { ok: true };
      case 'cloud.notifications': {
        const items = [
          {
            id: 'notif_1',
            title: 'Chào mừng đến với Omnira Studio 1.2.9 Web Edition',
            body: 'Đã tích hợp Seedance 2.0, Xưởng Phim AI, Clone Video và đồng bộ trực tiếp với Firebase Firestore.',
            seen: false,
            createdAt: now - 3600000,
          },
          {
            id: 'notif_2',
            title: 'Khung giờ vàng tối nay (19:30 – 22:00)',
            body: 'Hệ thống đã xếp lịch 2 video Reels & TikTok cho Không gian Thời Trang Nữ.',
            seen: true,
            createdAt: now - 14400000,
          },
        ];
        return { items, unread: 1 };
      }
      case 'cloud.notificationsSeen':
        return { ok: true };

      case 'billing.plans':
        return [
          {
            code: 'STARTER',
            name: 'Gói Khởi Đầu (Starter)',
            priceVnd: 199000,
            originalPriceVnd: 299000,
            periodMonths: 1,
            maxChannels: 5,
            maxDevices: 2,
            features: ['CALENDAR', 'INBOX', 'STUDIO'],
            badge: 'Phổ biến cho cá nhân',
            highlights: ['Quản lý 5 kênh mạng xã hội', 'Xưởng Video AI & Ảnh AI', 'Lịch đăng bài & Hộp thư hợp nhất'],
          },
          {
            code: 'STUDIO_PRO',
            name: 'Gói Chuyên Nghiệp (Studio Pro)',
            priceVnd: 499000,
            originalPriceVnd: 799000,
            periodMonths: 1,
            maxChannels: 50,
            maxDevices: 5,
            features: ['SERIES', 'STUDIO', 'FILM', 'CALENDAR', 'INBOX', 'ANALYTICS'],
            badge: 'Khuyên dùng',
            highlights: [
              'Quản lý tới 50 kênh & Fanpage',
              'Mở khóa Xưởng Phim AI, Clone Video & Series AI',
              'Tự động trả lời bình luận / tin nhắn bằng AI',
              'Phân tích chuyên sâu & Cảnh báo phân phối sớm',
            ],
          },
          {
            code: 'AGENCY_YEAR',
            name: 'Gói Doanh Nghiệp (Agency 1 Năm)',
            priceVnd: 4990000,
            originalPriceVnd: 9588000,
            periodMonths: 12,
            maxChannels: 200,
            maxDevices: 15,
            features: ['SERIES', 'STUDIO', 'FILM', 'CALENDAR', 'INBOX', 'ANALYTICS'],
            badge: 'Tiết kiệm 48%',
            highlights: [
              'Không giới hạn Không gian làm việc (Pockets)',
              '200 kênh kết nối + 15 thiết bị đồng thời',
              'Ưu tiên hàng đợi kết xuất Seedance 2.0 & Veo 3.1',
            ],
          },
        ];
      case 'billing.promotions':
        return [
          {
            id: 'promo_2026',
            title: 'Ưu đãi Ra mắt Omnira Studio 1.2.9 – Giảm 35% gói năm',
            code: 'OMNIRA129',
            discountPct: 35,
            endsAt: now + 7 * DAY,
          },
        ];
      case 'billing.orders':
        return s.orders;
      case 'billing.order':
        return s.orders.find((o) => o.id === input.code || o.code === input.code) || s.orders[0] || null;
      case 'billing.createOrder': {
        const ord = {
          id: `ORD-${Date.now().toString().slice(-6)}`,
          code: `ORD-${Date.now().toString().slice(-6)}`,
          planCode: input.planCode || 'STUDIO_PRO',
          planName: input.planCode === 'STARTER' ? 'Gói Khởi Đầu (Starter)' : 'Omnira Studio Pro',
          months: input.months || 1,
          amountVnd: input.planCode === 'STARTER' ? 199000 : 499000,
          status: 'pending',
          qrUrl: 'https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=499000&addInfo=OMNIRA%20PRO',
          bankName: 'MB Bank',
          accountNumber: '0987654321',
          accountHolder: 'CONG TY CONG NGHE OMNIRA',
          transferContent: `OMNIRA ${Date.now().toString().slice(-6)}`,
          createdAt: now,
        };
        s.orders.unshift(ord);
        this.db.persist('orders');
        return ord;
      }
      case 'billing.referral':
        return {
          code: s.authUser?.referralCode || 'OMNIRA2026',
          points: s.authUser?.points || 250000,
          totalInvited: 8,
          paidInvited: 5,
          commissionPct: 20,
          history: [
            { id: 'ref_1', email: 'h***@gmail.com', amount: 100000, note: 'Nâng cấp gói Studio Pro', createdAt: now - 3 * DAY },
            { id: 'ref_2', email: 'm***@agency.vn', amount: 150000, note: 'Nâng cấp gói Agency', createdAt: now - 9 * DAY },
          ],
        };

      // ── 3. DASHBOARD, ALERTS & ACTIVITY ──
      case 'dashboard.summary': {
        const chans = this.filterByWorkspace(s.channels, input.workspaceId);
        const byPlatform: Record<string, number> = { facebook: 0, tiktok: 0, instagram: 0, youtube: 0 };
        const health: Record<string, number> = { ok: 0, warn: 0, error: 0, idle: 0 };
        for (const c of chans) {
          byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
          health[c.health] = (health[c.health] || 0) + 1;
        }
        const total = chans.length;
        const score = total ? Math.round(((health.ok + health.warn * 0.5) / total) * 1000) / 10 : 100;
        const chanIds = new Set(chans.map((c) => c.id));
        const posts = s.scheduledPosts.filter((p) => !input.workspaceId || chanIds.has(p.channelId));
        const published = posts.filter((p) => p.status === 'published').length;
        const queued = posts.filter((p) => p.status === 'queued').length;
        const failed = posts.filter((p) => p.status === 'failed').length;

        const dayMap = new Map<string, any>();
        for (const m of s.channelMetricsDaily) {
          if (input.workspaceId && !chanIds.has(m.channelId)) continue;
          const ch = s.channels.find((c) => c.id === m.channelId);
          const pt = dayMap.get(m.day) || {
            day: m.day,
            views: 0,
            engagements: 0,
            byPlatform: { facebook: 0, tiktok: 0, instagram: 0, youtube: 0 },
          };
          pt.views += m.views;
          pt.engagements += m.engagements;
          if (ch) pt.byPlatform[ch.platform] = (pt.byPlatform[ch.platform] || 0) + m.views;
          dayMap.set(m.day, pt);
        }
        const seriesData = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day));
        const views30d = seriesData.reduce((acc, d) => acc + d.views, 0);
        const engagements30d = seriesData.reduce((acc, d) => acc + d.engagements, 0);
        const platforms = ['facebook', 'tiktok', 'instagram', 'youtube'].map((pf) => ({
          platform: pf,
          views30d: seriesData.reduce((acc, d) => acc + (d.byPlatform[pf] || 0), 0),
          changePct: pf === 'tiktok' ? 28.4 : pf === 'facebook' ? 14.2 : 19.6,
        }));
        const wsProxies = this.filterByWorkspace(s.proxies, input.workspaceId);

        return {
          channels: { total, byPlatform, addedThisWeek: 2 },
          health: { ...health, score },
          posts: {
            publishedThisMonth: published,
            queued,
            failedThisMonth: failed,
            successRate: published + failed ? Math.round((published / (published + failed)) * 1000) / 10 : 100,
          },
          reach: {
            views30d,
            engagements30d,
            viewsChangePct: 22.8,
            series: seriesData,
            platforms,
          },
          proxies: { total: wsProxies.length, ok: wsProxies.filter((p) => p.health === 'ok').length },
          openAlerts: s.alerts.filter((a) => !a.resolvedAt).length,
        };
      }
      case 'dashboard.topChannels': {
        const chans = this.filterByWorkspace(s.channels, input.workspaceId);
        return chans
          .map((ch) => {
            const metrics = s.channelMetricsDaily.filter((m) => m.channelId === ch.id);
            const views = metrics.reduce((acc, m) => acc + m.views, 0);
            const engagements = metrics.reduce((acc, m) => acc + m.engagements, 0);
            return {
              ...ch,
              views30d: views,
              engagements30d: engagements,
              engagementRate: views ? Math.round((engagements / views) * 1000) / 10 : 0,
            };
          })
          .sort((a, b) => b.views30d - a.views30d)
          .slice(0, input.limit || 6);
      }
      case 'dashboard.daemon': {
        const queuedCount = s.scheduledPosts.filter((p) => p.status === 'queued').length;
        const enabledRules = s.autoReplyRules.filter((r) => r.enabled).length;
        return {
          render: { running: false, queued: 0, current: null },
          publish: {
            next24h: queuedCount,
            nextAt: now + 600000,
            nextChannels: s.channels.slice(0, 2).map((c) => c.name),
          },
          autoReply: { enabledRules },
          publisher: { running: Boolean(s.settings['posts.worker'] ?? true), queued: queuedCount, nextRunAt: now + 600000 },
          inboxSync: { running: Boolean(s.settings['inbox.autoSync'] ?? true), unread: s.conversations.reduce((a, c) => a + (c.unreadCount || 0), 0), lastSyncAt: now - 120000 },
          earlyReach: { running: true, flaggedCount: 0 },
          firebaseSync: { connected: true, projectId: this.db.projectId },
        };
      }
      case 'alerts.open':
        return s.alerts.filter((a) => !a.resolvedAt);
      case 'alerts.resolve': {
        const al = s.alerts.find((a) => a.id === input.id);
        if (al) al.resolvedAt = now;
        this.db.persist('alerts');
        return { ok: true };
      }
      case 'activity.recent':
        return s.activityLog.slice(0, input.limit || 20);

      // ── 4. WORKSPACES ──
      case 'workspaces.list':
        return s.workspaces
          .filter((w) => !w.archivedAt)
          .map((w) => {
            const wsChans = s.channels.filter((c) => c.workspaceId === w.id);
            const wsContent = s.contentItems.filter((c) => c.workspaceId === w.id);
            const wsPosts = s.scheduledPosts.filter((p) => {
              const ch = s.channels.find((c) => c.id === p.channelId);
              return ch?.workspaceId === w.id;
            });
            const aiSpend = Number(
              s.aiUsage
                .filter((u) => u.workspaceId === w.id)
                .reduce((acc, u) => acc + (u.costUsd || 0), 0)
                .toFixed(2)
            );
            return {
              ...w,
              channelCount: wsChans.length,
              unhealthyChannels: wsChans.filter((c) => c.health === 'warn' || c.health === 'error').length,
              platformCounts: {
                facebook: wsChans.filter((c) => c.platform === 'facebook').length,
                tiktok: wsChans.filter((c) => c.platform === 'tiktok').length,
                instagram: wsChans.filter((c) => c.platform === 'instagram').length,
                youtube: wsChans.filter((c) => c.platform === 'youtube').length,
              },
              accountCount: s.accounts.filter((a) => a.workspaceId === w.id).length,
              contentCount: wsContent.length,
              contentReady: wsContent.filter((c) => c.status === 'ready' || c.status === 'scheduled').length,
              queuedPosts: wsPosts.filter((p) => p.status === 'queued').length,
              postsPerDay: Math.max(1, wsPosts.length),
              aiSpendUsd: aiSpend,
              aiSpentUsd: aiSpend,
            };
          });
      case 'workspaces.listArchived':
        return s.workspaces.filter((w) => !!w.archivedAt);
      case 'workspaces.create': {
        const ws = {
          id: `ws_${newId()}`,
          name: input.name || 'Không gian mới',
          color: input.color || '#c0c1ff',
          icon: input.icon || 'layers',
          description: input.description || '',
          brandVoice: input.brandVoice || '',
          goldenHours: input.goldenHours || [{ start: '19:30', end: '21:30', weight: 0.5 }],
          tags: input.tags || [],
          aiBudgetUsd: input.aiBudgetUsd ?? 25,
          watermarkPath: null,
          watermarkPosition: 'br',
          watermarkOpacity: 0.85,
          sortOrder: s.workspaces.length,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        s.workspaces.push(ws);
        this.db.persist('workspaces');
        return ws;
      }
      case 'workspaces.update': {
        const idx = s.workspaces.findIndex((w) => w.id === input.id);
        if (idx !== -1) {
          s.workspaces[idx] = { ...s.workspaces[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('workspaces');
          return s.workspaces[idx];
        }
        return null;
      }
      case 'workspaces.archive': {
        const ws = s.workspaces.find((w) => w.id === input.id);
        if (ws) ws.archivedAt = now;
        this.db.persist('workspaces');
        return { ok: true };
      }
      case 'workspaces.restore': {
        const ws = s.workspaces.find((w) => w.id === input.id);
        if (ws) ws.archivedAt = null;
        this.db.persist('workspaces');
        return ws;
      }
      case 'workspaces.export':
        return { exportedAt: now, workspace: s.workspaces.find((w) => w.id === input.id) };
      case 'workspaces.setCanvasNoise':
        return { ok: true };

      // ── 5. ACCOUNTS, CHANNELS, PROXIES, INTEGRATIONS ──
      case 'accounts.tree': {
        const accs = this.filterByWorkspace(s.accounts, input.workspaceId);
        return accs.map((a) => ({
          ...a,
          proxy: s.proxies.find((p) => p.id === a.proxyId) || null,
          browserProfile: s.browserProfiles.find((bp) => bp.id === a.browserProfileId) || null,
          channels: s.channels.filter((c) => c.accountId === a.id),
        }));
      }
      case 'accounts.get': {
        const a = s.accounts.find((x) => x.id === input.id) || s.accounts[0];
        if (!a) return null;
        return {
          ...a,
          workspaceName: s.workspaces.find((w) => w.id === a.workspaceId)?.name || null,
          proxy: s.proxies.find((p) => p.id === a.proxyId) || null,
          browserProfile: s.browserProfiles.find((bp) => bp.id === a.browserProfileId) || null,
          channels: s.channels.filter((c) => c.accountId === a.id),
        };
      }
      case 'accounts.create': {
        const acc = {
          id: `acc_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id || null,
          platform: input.platform || 'facebook',
          displayName: input.displayName || 'Tài khoản mới',
          handle: input.handle || '@new.account',
          externalId: input.externalId || `ext_${Date.now()}`,
          proxyId: input.proxyId || null,
          browserProfileId: input.browserProfileId || null,
          twoFactorEnabled: Boolean(input.twoFactorEnabled),
          sessionStatus: 'active',
          sessionExpiresAt: now + 30 * DAY,
          health: 'ok',
          note: input.note || '',
          createdAt: now,
          updatedAt: now,
        };
        s.accounts.push(acc);
        this.db.persist('accounts');
        return acc;
      }
      case 'accounts.update': {
        const idx = s.accounts.findIndex((a) => a.id === input.id);
        if (idx !== -1) {
          s.accounts[idx] = { ...s.accounts[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('accounts');
          return s.accounts[idx];
        }
        return null;
      }
      case 'accounts.delete':
        s.accounts = s.accounts.filter((a) => a.id !== input.id);
        s.channels = s.channels.filter((c) => c.accountId !== input.id);
        this.db.persist('accounts');
        return { ok: true };
      case 'accounts.connectFacebook':
      case 'accounts.connectTiktok':
      case 'accounts.connectYoutube':
      case 'accounts.importFacebook': {
        const pf = endpoint.includes('Tiktok') ? 'tiktok' : endpoint.includes('Youtube') ? 'youtube' : 'facebook';
        const acc = {
          id: `acc_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          platform: pf,
          displayName: input.displayName || `Tài khoản ${pf.toUpperCase()} vừa kết nối`,
          handle: `@${pf}_${Date.now().toString().slice(-4)}`,
          externalId: `${pf}_${Date.now()}`,
          proxyId: s.proxies[0]?.id || null,
          browserProfileId: null,
          twoFactorEnabled: true,
          sessionStatus: 'active',
          sessionExpiresAt: now + 45 * DAY,
          health: 'ok',
          createdAt: now,
          updatedAt: now,
        };
        s.accounts.push(acc);
        const ch = {
          id: `ch_${newId()}`,
          workspaceId: acc.workspaceId,
          accountId: acc.id,
          platform: pf,
          kind: pf === 'facebook' ? 'page' : 'profile',
          name: `${acc.displayName} Official`,
          handle: acc.handle,
          externalId: `ch_ext_${Date.now()}`,
          followers: 12500,
          nicheTag: 'Kênh mới kết nối',
          tokenStatus: 'valid',
          tokenExpiresAt: now + 45 * DAY,
          status: 'active',
          health: 'ok',
          quotaBlocked: false,
          createdAt: now,
          updatedAt: now,
        };
        s.channels.push(ch);
        this.db.persist('accounts');
        return { account: acc, channels: [ch] };
      }
      case 'accounts.cancelYoutubeLogin':
        return { ok: true };

      case 'channels.list':
        return this.filterByWorkspace(s.channels, input.workspaceId);
      case 'channels.createPage':
      case 'channels.connect': {
        const ch = {
          id: `ch_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          accountId: input.accountId || s.accounts[0]?.id,
          platform: input.platform || 'facebook',
          kind: input.kind || 'page',
          name: input.name || 'Trang Fanpage Mới',
          handle: input.handle || `@page_${Date.now().toString().slice(-4)}`,
          externalId: `ext_${Date.now()}`,
          followers: input.followers ?? 1000,
          nicheTag: input.nicheTag || 'Tổng hợp',
          tokenStatus: 'valid',
          tokenExpiresAt: now + 60 * DAY,
          status: 'active',
          health: 'ok',
          quotaBlocked: false,
          createdAt: now,
          updatedAt: now,
        };
        s.channels.push(ch);
        this.db.persist('channels');
        return ch;
      }
      case 'channels.verify': {
        const ch = s.channels.find((c) => c.id === input.id);
        if (ch) {
          ch.tokenStatus = 'valid';
          ch.health = 'ok';
          ch.updatedAt = now;
          this.db.persist('channels');
        }
        return ch || { ok: true };
      }
      case 'channels.disconnect':
      case 'channels.delete':
        s.channels = s.channels.filter((c) => c.id !== input.id);
        this.db.persist('channels');
        return { ok: true };
      case 'channels.quota':
        return {
          used: s.channels.filter((c) => !c.quotaBlocked).length,
          limit: s.licenseState.maxChannels || 50,
          channels: s.channels,
        };
      case 'channels.setQuota':
        return { ok: true };

      case 'proxies.list':
        return this.filterByWorkspace(s.proxies, input.workspaceId);
      case 'proxies.create': {
        const px = {
          id: `px_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          label: input.label || `${input.country || 'VN'}-Proxy`,
          protocol: input.protocol || 'socks5',
          host: input.host || '103.14.129.99',
          port: Number(input.port) || 1080,
          country: input.country || 'VN',
          kind: input.kind || 'residential',
          exitIp: input.host || '103.14.129.99',
          latencyMs: 45,
          health: 'ok',
          lastCheckedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        s.proxies.push(px);
        this.db.persist('proxies');
        return px;
      }
      case 'proxies.delete':
        s.proxies = s.proxies.filter((p) => p.id !== input.id);
        this.db.persist('proxies');
        return { ok: true };

      case 'integrations.meta':
        return s.settings['integrations.meta'];
      case 'integrations.setMeta':
      case 'integrations.setInstagram':
        s.settings['integrations.meta'] = { ...s.settings['integrations.meta'], ...input };
        this.db.persist('settings');
        return s.settings['integrations.meta'];
      case 'integrations.tiktok':
        return s.settings['integrations.tiktok'];
      case 'integrations.setTiktok':
        s.settings['integrations.tiktok'] = { ...s.settings['integrations.tiktok'], ...input };
        this.db.persist('settings');
        return s.settings['integrations.tiktok'];
      case 'integrations.youtube':
        return s.settings['integrations.youtube'];
      case 'integrations.setYoutube':
      case 'integrations.setYoutubePublish':
        s.settings['integrations.youtube'] = { ...s.settings['integrations.youtube'], ...input };
        this.db.persist('settings');
        return s.settings['integrations.youtube'];

      // ── 6. PLAN (CONTENT IDEAS) ──
      case 'plan.list':
        return this.filterByWorkspace(s.contentIdeas, input.workspaceId);
      case 'plan.save': {
        if (input.id) {
          const idx = s.contentIdeas.findIndex((i) => i.id === input.id);
          if (idx !== -1) {
            s.contentIdeas[idx] = { ...s.contentIdeas[idx], ...input, updatedAt: now };
            this.db.persist('contentIdeas');
            return s.contentIdeas[idx];
          }
        }
        const idea = {
          id: `idea_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          plannedDate: input.plannedDate || new Date().toISOString().slice(0, 10),
          title: input.title || 'Ý tưởng nội dung mới',
          format: input.format || 'short_video',
          hook: input.hook || '',
          description: input.description || '',
          status: input.status || 'idea',
          projectId: null,
          contentItemId: null,
          source: input.source || 'manual',
          createdAt: now,
          updatedAt: now,
        };
        s.contentIdeas.unshift(idea);
        this.db.persist('contentIdeas');
        return idea;
      }
      case 'plan.generate': {
        const ws = s.workspaces.find((w) => w.id === input.workspaceId) || s.workspaces[0];
        const count = Math.min(14, Math.max(1, (input.days || 3) * (input.perDay || 1)));
        const created: any[] = [];
        for (let i = 0; i < count; i++) {
          const dateStr = new Date(now + i * DAY).toISOString().slice(0, 10);
          const idea = {
            id: `idea_${newId()}`,
            workspaceId: ws?.id || null,
            plannedDate: dateStr,
            title: `[AI] ${input.topic || ws?.name || 'Xu hướng'}: Bí quyết số ${i + 1} thu hút triệu lượt xem`,
            format: input.format || 'transformation',
            hook: `90% người mới đều mắc sai lầm thứ ${i + 1} này khi bắt đầu!`,
            description: `Triển khai 3 phân cảnh nhanh (Hook 3s đầu, Giải pháp thực tế 15s, Kêu gọi hành động 5s) bám sát giọng thương hiệu ${ws?.name || 'Omnira'}.`,
            status: 'idea',
            projectId: null,
            contentItemId: null,
            source: 'ai',
            createdAt: now,
            updatedAt: now,
          };
          s.contentIdeas.unshift(idea);
          created.push(idea);
        }
        this.db.persist('contentIdeas');
        return { created: created.length, items: created, meta: { model: 'gemini-3.5-flash' } };
      }
      case 'plan.delete':
        s.contentIdeas = s.contentIdeas.filter((i) => i.id !== input.id);
        this.db.persist('contentIdeas');
        return { ok: true };
      case 'plan.deleteMany': {
        const ids = new Set(input.ids || []);
        s.contentIdeas = s.contentIdeas.filter((i) => !ids.has(i.id));
        this.db.persist('contentIdeas');
        return { deleted: ids.size };
      }
      case 'plan.toPost': {
        const idea = s.contentIdeas.find((i) => i.id === input.id);
        const item = {
          id: `cnt_${newId()}`,
          workspaceId: idea?.workspaceId || s.workspaces[0]?.id,
          kind: 'reel',
          title: idea?.title || 'Bài đăng từ Kế hoạch nội dung',
          hook: idea?.hook || '',
          caption: `${idea?.hook || ''}\n\n${idea?.description || ''}`.trim(),
          hashtags: ['#OmniraStudio', '#Trending', '#Viral'],
          mediaPaths: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80'],
          thumbnailPath: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
          durationSec: 30,
          aspect: '9:16',
          status: 'draft',
          source: 'plan',
          spinVariants: 0,
          aiReviewed: true,
          hookScore: 88,
          createdAt: now,
          updatedAt: now,
        };
        s.contentItems.unshift(item);
        if (idea) {
          idea.contentItemId = item.id;
          idea.status = 'done';
        }
        this.db.persist('contentItems');
        return { contentItemId: item.id, item };
      }
      case 'plan.toVideo': {
        const idea = s.contentIdeas.find((i) => i.id === input.id);
        const vp = {
          id: `vp_${newId()}`,
          workspaceId: idea?.workspaceId || s.workspaces[0]?.id,
          topic: idea?.title || 'Dự án Video từ Kế hoạch',
          format: 'short',
          aspect: '9:16',
          targetDurationSec: 30,
          ttsProvider: 'google_tts',
          voiceId: 'vi-VN-HoaiMy',
          renderMode: 'semi_ai',
          subtitleStyle: 'montserrat-kara-pop',
          bgmTrack: 'lofi-runway-chic.mp3',
          bgmVolume: 0.15,
          visualBible: {},
          fashionSetup: { enabled: false },
          acts: [],
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        s.videoProjects.unshift(vp);
        if (idea) {
          idea.projectId = vp.id;
          idea.status = 'scripting';
        }
        this.db.persist('videoProjects');
        return { projectId: vp.id, project: vp };
      }
      case 'plan.toImage': {
        const idea = s.contentIdeas.find((i) => i.id === input.id);
        const imgp = {
          id: `imgp_${newId()}`,
          workspaceId: idea?.workspaceId || s.workspaces[0]?.id,
          title: idea?.title || 'Dự án Ảnh từ Kế hoạch',
          mode: 'product_ad',
          aspect: '4:5',
          stylePreset: 'editorial_studio',
          brief: `${idea?.hook || ''}\n${idea?.description || ''}`.trim(),
          ideas: [],
          createdAt: now,
          updatedAt: now,
        };
        s.imageProjects.unshift(imgp);
        this.db.persist('imageProjects');
        return { projectId: imgp.id, project: imgp };
      }

      // ── 7. CONTENT LIBRARY ──
      case 'content.list': {
        let items = this.filterByWorkspace(s.contentItems, input.workspaceId);
        if (input.status && input.status !== 'all') items = items.filter((i) => i.status === input.status);
        if (input.kind && input.kind !== 'all') items = items.filter((i) => i.kind === input.kind);
        if (input.q) {
          const q = String(input.q).toLowerCase();
          items = items.filter((i) => i.title?.toLowerCase().includes(q) || i.caption?.toLowerCase().includes(q));
        }
        return items;
      }
      case 'content.stats': {
        const items = this.filterByWorkspace(s.contentItems, input.workspaceId);
        const byKind: Record<string, number> = { video: 0, reel: 0, short: 0, image: 0, carousel: 0, text: 0 };
        for (const r of items) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
        return {
          total: items.length,
          ready: items.filter((i) => i.status === 'ready').length,
          draft: items.filter((i) => i.status === 'draft').length,
          scheduled: items.filter((i) => i.status === 'scheduled').length,
          published: items.filter((i) => i.status === 'published').length,
          byKind,
        };
      }
      case 'content.create': {
        const item = {
          id: `cnt_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          kind: input.kind || 'reel',
          title: input.title || 'Nội dung mới',
          hook: input.hook || '',
          caption: input.caption || '',
          firstComment: input.firstComment || '',
          hashtags: input.hashtags || ['#OmniraStudio'],
          mediaPaths: input.mediaPaths || ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80'],
          thumbnailPath: input.thumbnailPath || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
          durationSec: input.durationSec ?? 30,
          aspect: input.aspect || '9:16',
          status: input.status || 'ready',
          source: input.source || 'manual',
          spinVariants: 0,
          aiReviewed: true,
          hookScore: 86,
          createdAt: now,
          updatedAt: now,
        };
        s.contentItems.unshift(item);
        this.db.persist('contentItems');
        return item;
      }
      case 'content.update': {
        const idx = s.contentItems.findIndex((i) => i.id === input.id);
        if (idx !== -1) {
          s.contentItems[idx] = { ...s.contentItems[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('contentItems');
          return s.contentItems[idx];
        }
        return null;
      }
      case 'content.delete':
        s.contentItems = s.contentItems.filter((i) => i.id !== input.id);
        this.db.persist('contentItems');
        return { ok: true };
      case 'content.bulkDelete': {
        const ids = new Set(input.ids || []);
        s.contentItems = s.contentItems.filter((i) => !ids.has(i.id));
        this.db.persist('contentItems');
        return { deleted: ids.size };
      }
      case 'content.bulkMove': {
        const ids = new Set(input.ids || []);
        for (const item of s.contentItems) {
          if (ids.has(item.id)) item.workspaceId = input.workspaceId;
        }
        this.db.persist('contentItems');
        return { moved: ids.size };
      }
      case 'content.variants':
        return s.contentVariants.filter((v) => v.contentItemId === input.contentItemId || v.contentItemId === input.id);
      case 'content.spin': {
        const targetIds: string[] = Array.isArray(input.ids) && input.ids.length
          ? input.ids
          : [input.contentItemId || input.id || s.contentItems[0]?.id].filter(Boolean);
        const createdVariants: any[] = [];
        for (const tid of targetIds) {
          const item = s.contentItems.find((i) => i.id === tid);
          if (!item) continue;
          const v1 = {
            id: `var_${newId()}`,
            contentItemId: item.id,
            caption: `✨ [Phiên bản AI Spin 1] ${item.title} — Giải pháp tối ưu giúp bạn nổi bật mỗi ngày! Xem hết video để không bỏ lỡ mẹo số 3 nhé!`,
            hashtags: [...(item.hashtags || []), '#XuHuong2026', '#GoiYPhoido'],
            model: 'gemini-3.5-flash',
            createdAt: now,
          };
          const v2 = {
            id: `var_${newId()}`,
            contentItemId: item.id,
            caption: `🔥 [Phiên bản AI Spin 2] Đừng bỏ qua nếu bạn đang tìm kiếm bí quyết: ${item.title}. Lưu lại áp dụng ngay hôm nay!`,
            hashtags: [...(item.hashtags || []), '#ViralReels', '#TipsHay'],
            model: 'gemini-3.5-flash',
            createdAt: now,
          };
          s.contentVariants.unshift(v1, v2);
          item.spinVariants = s.contentVariants.filter((v) => v.contentItemId === item.id).length;
          createdVariants.push(v1, v2);
        }
        this.db.persist('contentVariants');
        this.db.persist('contentItems');
        return { done: targetIds.length, failed: [], variants: createdVariants };
      }
      case 'content.applyVariant': {
        const v = s.contentVariants.find((x) => x.id === (input.variantId || input.id));
        const item = s.contentItems.find((x) => x.id === (input.contentItemId || v?.contentItemId));
        if (v && item) {
          item.caption = v.caption;
          item.hashtags = v.hashtags;
          item.updatedAt = now;
          this.db.persist('contentItems');
        }
        return item;
      }
      case 'content.deleteVariant':
        s.contentVariants = s.contentVariants.filter((v) => v.id !== input.id && v.id !== input.variantId);
        this.db.persist('contentVariants');
        return { ok: true };
      case 'content.hashtags': {
        const suggested = ['#XuHuongTikTok', '#ReelsVietNam', '#ThoiTrangCongSo', '#ReviewChanThuc', '#OmniraAI', '#Viral2026'];
        const ids: string[] = Array.isArray(input.ids) ? input.ids : input.id ? [input.id] : [];
        for (const id of ids) {
          const item = s.contentItems.find((i) => i.id === id);
          if (item) item.hashtags = Array.from(new Set([...(item.hashtags || []), ...suggested.slice(0, 4)]));
        }
        if (ids.length) this.db.persist('contentItems');
        return { done: ids.length || 1, hashtags: suggested };
      }
      case 'content.hookScore':
      case 'content.hook': {
        const item = s.contentItems.find((x) => x.id === input.id);
        const res = {
          score: 94,
          critique: 'Câu mở đầu đánh trúng tâm lý tò mò trong 3 giây đầu tiên, độ dài vừa vặn cho Reels/TikTok.',
          suggestions: [
            '90% chị em đều mắc lỗi này khiến trang phục kém sang đi một nửa!',
            'Chỉ thay đổi 1 chi tiết nhỏ này, diện mạo của bạn sẽ khác biệt hoàn toàn!',
          ],
        };
        if (item) {
          item.hookScore = res.score;
          item.hookCritique = res.critique;
          this.db.persist('contentItems');
        }
        return res;
      }

      // ── 8. SERIES AI ──
      case 'series.list':
        return this.filterByWorkspace(s.series, input.workspaceId).map((ser) => ({
          ...ser,
          episodeCount: s.seriesEpisodes.filter((e) => e.seriesId === ser.id).length,
          characterCount: s.seriesCharacters.filter((c) => c.seriesId === ser.id).length,
        }));
      case 'series.get': {
        const ser = s.series.find((x) => x.id === input.id) || s.series[0];
        if (!ser) return null;
        return {
          ...ser,
          characters: s.seriesCharacters.filter((c) => c.seriesId === ser.id),
          episodes: s.seriesEpisodes.filter((e) => e.seriesId === ser.id).sort((a, b) => a.episodeNumber - b.episodeNumber),
        };
      }
      case 'series.create': {
        const ser = {
          id: `ser_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          title: input.title || 'Series AI Mới',
          logline: input.logline || '',
          genre: input.genre || 'Drama / Storytelling',
          visualStyle: input.visualStyle || 'Cinematic 35mm film look, warm golden hour lighting',
          visualStyleEn: input.visualStyle || 'Cinematic 35mm film look, warm golden hour lighting',
          episodeLengthSec: input.episodeLengthSec ?? 60,
          productionMode: input.productionMode || 'film_ai',
          ttsProvider: input.ttsProvider || 'google_tts',
          narratorVoiceId: input.narratorVoiceId || 'vi-VN-HoaiMy',
          renderMode: input.renderMode || 'full_ai',
          targetChannelId: input.targetChannelId || s.channels[0]?.id,
          arcSummary: input.arcSummary || '',
          createdAt: now,
          updatedAt: now,
        };
        s.series.unshift(ser);
        this.db.persist('series');
        return ser;
      }
      case 'series.update': {
        const idx = s.series.findIndex((x) => x.id === input.id);
        if (idx !== -1) {
          s.series[idx] = { ...s.series[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('series');
          return s.series[idx];
        }
        return null;
      }
      case 'series.delete':
        s.series = s.series.filter((x) => x.id !== input.id);
        this.db.persist('series');
        return { ok: true };
      case 'series.saveCharacter': {
        if (input.id) {
          const idx = s.seriesCharacters.findIndex((c) => c.id === input.id);
          if (idx !== -1) {
            s.seriesCharacters[idx] = { ...s.seriesCharacters[idx], ...input };
            this.db.persist('seriesCharacters');
            return s.seriesCharacters[idx];
          }
        }
        const ch = {
          id: `char_${newId()}`,
          seriesId: input.seriesId || s.series[0]?.id,
          name: input.name || 'Nhân vật mới',
          role: input.role || 'Nhân vật chính',
          appearance: input.appearance || '',
          promptEn: input.promptEn || 'Vietnamese cinematic character portrait, 85mm lens, high detail',
          personality: input.personality || '',
          voiceProvider: input.voiceProvider || 'google_tts',
          voiceId: input.voiceId || 'vi-VN-HoaiMy',
          referenceImage: input.referenceImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          sortOrder: s.seriesCharacters.length,
        };
        s.seriesCharacters.push(ch);
        this.db.persist('seriesCharacters');
        return ch;
      }
      case 'series.deleteCharacter':
        s.seriesCharacters = s.seriesCharacters.filter((c) => c.id !== input.id);
        this.db.persist('seriesCharacters');
        return { ok: true };
      case 'series.characterPrompt':
      case 'series.characterImage':
      case 'series.setCharacterImage': {
        const c = s.seriesCharacters.find((x) => x.id === (input.characterId || input.id));
        if (c) {
          c.promptEn = c.promptEn || 'Cinematic portrait, consistent facial identity, studio lighting, 85mm f/1.4';
          c.referenceImage = input.imageUrl || c.referenceImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
          this.db.persist('seriesCharacters');
        }
        return c;
      }
      case 'series.saveEpisode': {
        if (input.id) {
          const idx = s.seriesEpisodes.findIndex((e) => e.id === input.id);
          if (idx !== -1) {
            s.seriesEpisodes[idx] = { ...s.seriesEpisodes[idx], ...input };
            this.db.persist('seriesEpisodes');
            return s.seriesEpisodes[idx];
          }
        }
        const existing = s.seriesEpisodes.filter((e) => e.seriesId === input.seriesId);
        const ep = {
          id: `ep_${newId()}`,
          seriesId: input.seriesId || s.series[0]?.id,
          episodeNumber: input.episodeNumber || existing.length + 1,
          title: input.title || `Tập ${existing.length + 1}: Hành trình mới`,
          synopsis: input.synopsis || '',
          status: 'scripting',
          projectId: null,
          filmId: null,
          createdAt: now,
        };
        s.seriesEpisodes.push(ep);
        this.db.persist('seriesEpisodes');
        return ep;
      }
      case 'series.deleteEpisode':
        s.seriesEpisodes = s.seriesEpisodes.filter((e) => e.id !== input.id);
        this.db.persist('seriesEpisodes');
        return { ok: true };
      case 'series.develop': {
        const serId = input.id || input.seriesId || s.series[0]?.id;
        const existing = s.seriesEpisodes.filter((e) => e.seriesId === serId);
        const count = Number(input.episodes) || 3;
        const added: any[] = [];
        for (let i = 1; i <= count; i++) {
          const epNum = existing.length + i;
          const ep = {
            id: `ep_${newId()}`,
            seriesId: serId,
            episodeNumber: epNum,
            title: `Tập ${epNum}: Bước ngoặt bất ngờ số ${epNum}`,
            synopsis: `AI tự động phát triển mạch truyện Tập ${epNum}: Nhân vật chính đối mặt với thử thách mới và khám phá ra manh mối quan trọng.`,
            status: 'scripting',
            projectId: null,
            filmId: null,
            createdAt: now,
          };
          s.seriesEpisodes.push(ep);
          added.push(ep);
        }
        this.db.persist('seriesEpisodes');
        return { addedEpisodes: added.length, episodes: added };
      }
      case 'series.writeEpisode':
      case 'series.makeFilm': {
        const ep = s.seriesEpisodes.find((e) => e.id === (input.episodeId || input.id)) || s.seriesEpisodes[0];
        const film = {
          id: `film_${newId()}`,
          workspaceId: s.workspaces[0]?.id,
          seriesId: ep?.seriesId || s.series[0]?.id,
          episodeId: ep?.id || null,
          title: ep?.title || 'Phim ngắn từ Series AI',
          idea: ep?.synopsis || 'Phim ngắn chuyển thể từ tập Series AI',
          stylePreset: 'cinematic_realistic',
          stylePrompt: 'Cinematic 35mm film, warm lighting, high detail',
          aspect: '9:16',
          resolution: '1080p',
          targetDurationSec: 60,
          dialogueLanguage: 'Vietnamese',
          voiceMode: 'tts_dialogue',
          narrationProvider: 'google_tts',
          narrationVoiceId: 'vi-VN-HoaiMy',
          seedanceSource: 'fal',
          seedanceTier: 'fast',
          chainShots: true,
          subtitleEnabled: true,
          status: 'production',
          createdAt: now,
          updatedAt: now,
        };
        s.filmProjects.unshift(film);
        if (ep) {
          ep.filmId = film.id;
          ep.status = 'completed';
        }
        this.db.persist('filmProjects');
        return { filmId: film.id, projectId: film.id, film };
      }

      // ── 9. VIDEO STUDIO (XƯỞNG VIDEO AI) & RENDER ──
      case 'studio.list':
      case 'studio.projects':
        return this.filterByWorkspace(s.videoProjects, input.workspaceId).map((p) => ({
          ...p,
          sceneCount: s.videoScenes.filter((sc) => sc.projectId === p.id).length,
        }));
      case 'studio.get': {
        const p = s.videoProjects.find((x) => x.id === input.id) || s.videoProjects[0];
        if (!p) return null;
        return {
          ...p,
          scenes: s.videoScenes.filter((sc) => sc.projectId === p.id).sort((a, b) => a.position - b.position),
          jobs: s.renderJobs.filter((j) => j.projectId === p.id),
        };
      }
      case 'studio.create': {
        const vp = {
          id: `vp_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          topic: input.topic || 'Dự án Video AI mới',
          format: input.format || 'short',
          aspect: input.aspect || '9:16',
          targetDurationSec: input.targetDurationSec ?? 30,
          ttsProvider: input.ttsProvider || 'google_tts',
          voiceId: input.voiceId || 'vi-VN-HoaiMy',
          renderMode: input.renderMode || 'semi_ai',
          subtitleStyle: input.subtitleStyle || 'montserrat-kara-pop',
          bgmTrack: input.bgmTrack || 'lofi-runway-chic.mp3',
          bgmVolume: 0.15,
          visualBible: input.visualBible || {},
          fashionSetup: input.fashionSetup || { enabled: false },
          acts: [],
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        s.videoProjects.unshift(vp);
        this.db.persist('videoProjects');
        return vp;
      }
      case 'studio.update': {
        const idx = s.videoProjects.findIndex((x) => x.id === input.id);
        if (idx !== -1) {
          s.videoProjects[idx] = { ...s.videoProjects[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('videoProjects');
          return s.videoProjects[idx];
        }
        return null;
      }
      case 'studio.delete':
        s.videoProjects = s.videoProjects.filter((x) => x.id !== input.id);
        s.videoScenes = s.videoScenes.filter((sc) => sc.projectId !== input.id);
        this.db.persist('videoProjects');
        return { ok: true };
      case 'studio.generateScript':
      case 'studio.writeAct': {
        const pid = input.projectId || input.id || s.videoProjects[0]?.id;
        const proj = s.videoProjects.find((x) => x.id === pid);
        s.videoScenes = s.videoScenes.filter((sc) => sc.projectId !== pid);
        const newScenes = [
          {
            id: `sc_${newId()}`,
            projectId: pid,
            position: 0,
            label: 'Cảnh 1 – Hook thu hút (0-6s)',
            voiceover: `Bạn có biết bí quyết quan trọng nhất về "${proj?.topic || 'chủ đề này'}" mà 90% mọi người bỏ lỡ?`,
            durationSec: 6,
            mediaMode: 'ai_image',
            mediaPrompt: 'Cinematic vertical 9:16 opening hook shot, dramatic studio lighting, high contrast',
            mediaSource: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
            mediaPath: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
          },
          {
            id: `sc_${newId()}`,
            projectId: pid,
            position: 1,
            label: 'Cảnh 2 – Phân tích & Trình diễn (6-20s)',
            voiceover: 'Hãy nhìn sự khác biệt rõ rệt khi áp dụng đúng nguyên tắc phối hợp tỉ lệ và ánh sáng chuẩn studio.',
            durationSec: 14,
            mediaMode: 'ai_video',
            mediaPrompt: 'Smooth gimbal camera movement showcasing main subject details, 4k photorealistic',
            mediaSource: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&auto=format&fit=crop&q=80',
            mediaPath: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&auto=format&fit=crop&q=80',
          },
          {
            id: `sc_${newId()}`,
            projectId: pid,
            position: 2,
            label: 'Cảnh 3 – Tổng kết & Kêu gọi hành động (20-30s)',
            voiceover: 'Lưu ngay video này và bấm theo dõi kênh để cập nhật những xu hướng mới nhất mỗi ngày nhé!',
            durationSec: 10,
            mediaMode: 'ai_image',
            mediaPrompt: 'Close-up hero shot with warm bokeh background, inviting call to action visual',
            mediaSource: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
            mediaPath: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
          },
        ];
        s.videoScenes.push(...newScenes);
        if (proj) proj.status = 'ready';
        this.db.persist('videoScenes');
        return { scenes: newScenes };
      }
      case 'studio.saveScenes': {
        const pid = input.projectId || input.id;
        if (pid && Array.isArray(input.scenes)) {
          s.videoScenes = s.videoScenes.filter((sc) => sc.projectId !== pid);
          input.scenes.forEach((sc: any, i: number) => {
            s.videoScenes.push({
              ...sc,
              id: sc.id || `sc_${newId()}`,
              projectId: pid,
              position: i,
            });
          });
          this.db.persist('videoScenes');
        }
        return s.videoScenes.filter((sc) => sc.projectId === pid);
      }
      case 'studio.updateBible':
      case 'studio.bibleFromRefs': {
        const p = s.videoProjects.find((x) => x.id === (input.projectId || input.id));
        if (p) {
          p.visualBible = { ...p.visualBible, ...(input.bible || input) };
          this.db.persist('videoProjects');
        }
        return p?.visualBible || {};
      }
      case 'studio.promptExport':
        return {
          prompts: s.videoScenes
            .filter((sc) => sc.projectId === (input.projectId || input.id))
            .map((sc) => ({ scene: sc.label, prompt: sc.mediaPrompt, voiceover: sc.voiceover })),
        };
      case 'studio.tryOn':
        return { imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80' };
      case 'studio.toContent': {
        const p = s.videoProjects.find((x) => x.id === (input.projectId || input.id)) || s.videoProjects[0];
        const item = {
          id: `cnt_${newId()}`,
          workspaceId: p?.workspaceId || s.workspaces[0]?.id,
          kind: 'reel',
          title: p?.topic || 'Video xuất từ Xưởng Video AI',
          caption: p?.topic || '',
          hashtags: ['#OmniraStudio', '#AIVideo'],
          mediaPaths: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
          thumbnailPath: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
          durationSec: p?.targetDurationSec || 30,
          aspect: p?.aspect || '9:16',
          status: 'ready',
          source: 'studio',
          spinVariants: 0,
          aiReviewed: true,
          hookScore: 91,
          createdAt: now,
          updatedAt: now,
        };
        s.contentItems.unshift(item);
        this.db.persist('contentItems');
        return item;
      }

      case 'render.estimate':
        return { estimatedUsd: 0.14, estimatedSec: 18, encoder: 'h264_nvenc' };
      case 'render.jobs':
        return s.renderJobs.filter((j) => !input.projectId || j.projectId === input.projectId);
      case 'render.start':
      case 'render.image':
      case 'render.video':
      case 'render.tts': {
        const job = {
          id: `rj_${newId()}`,
          projectId: input.projectId || s.videoProjects[0]?.id,
          status: 'completed',
          encoder: 'h264_nvenc',
          progress: 100,
          stage: 'Hoàn tất kết xuất MP4 1080p',
          outputPath: `renders/video_${Date.now()}.mp4`,
          notes: ['Đã tổng hợp giọng đọc AI + Phụ đề Karaoke + Nhạc nền'],
          startedAt: now - 5000,
          finishedAt: now,
          createdAt: now,
        };
        s.renderJobs.unshift(job);
        this.db.persist('renderJobs');
        return job;
      }
      case 'render.cancel':
        return { ok: true };

      // ── 10. FILM STUDIO (XƯỞNG PHIM AI) ──
      case 'film.gate':
        return { ready: true, textOk: true, imageOk: true, videoOk: true, voiceOk: true, missing: [] };
      case 'film.list':
        return this.filterByWorkspace(s.filmProjects, input.workspaceId).map((f) => ({
          ...f,
          characterCount: s.filmAssets.filter((a) => a.filmId === f.id && a.kind === 'character').length,
          locationCount: s.filmAssets.filter((a) => a.filmId === f.id && a.kind === 'location').length,
          shotCount: s.filmAssets.filter((a) => a.filmId === f.id && a.kind === 'shot').length,
        }));
      case 'film.get': {
        const f = s.filmProjects.find((x) => x.id === input.id) || s.filmProjects[0];
        if (!f) return null;
        const assets = s.filmAssets
          .filter((a) => a.filmId === f.id)
          .sort((a, b) => a.position - b.position)
          .map((a) => ({
            ...a,
            takes: s.filmTakes.filter((t) => t.assetId === a.id),
          }));
        return {
          ...f,
          assets,
          characters: assets.filter((a) => a.kind === 'character'),
          locations: assets.filter((a) => a.kind === 'location'),
          shots: assets.filter((a) => a.kind === 'shot'),
          renders: s.filmRenders.filter((r) => r.filmId === f.id),
          proposals: [],
        };
      }
      case 'film.create': {
        const film = {
          id: `film_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          seriesId: input.seriesId || null,
          episodeId: input.episodeId || null,
          title: input.title || 'Dự án Phim AI Mới',
          idea: input.idea || '',
          stylePreset: input.stylePreset || 'cinematic_realistic',
          stylePrompt: input.stylePrompt || 'Cinematic 35mm film photography, warm natural light, shallow depth of field',
          aspect: input.aspect || '9:16',
          resolution: input.resolution || '1080p',
          targetDurationSec: input.targetDurationSec ?? 45,
          dialogueLanguage: input.dialogueLanguage || 'Vietnamese',
          voiceMode: input.voiceMode || 'tts_dialogue',
          narrationProvider: 'google_tts',
          narrationVoiceId: 'vi-VN-HoaiMy',
          seedanceSource: 'fal',
          seedanceTier: 'fast',
          chainShots: true,
          subtitleEnabled: true,
          subtitleStyle: 'cinematic-bottom',
          bgmTrack: 'emotional-piano-warm.mp3',
          bgmVolume: 0.18,
          watermarkMode: 'pocket',
          watermarkPosition: 'br',
          watermarkOpacity: 0.85,
          watermarkScale: 0.18,
          status: 'scripting',
          createdAt: now,
          updatedAt: now,
        };
        s.filmProjects.unshift(film);
        this.db.persist('filmProjects');
        return film;
      }
      case 'film.update': {
        const idx = s.filmProjects.findIndex((f) => f.id === input.id);
        if (idx !== -1) {
          s.filmProjects[idx] = { ...s.filmProjects[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('filmProjects');
          return s.filmProjects[idx];
        }
        return null;
      }
      case 'film.delete':
        s.filmProjects = s.filmProjects.filter((f) => f.id !== input.id);
        s.filmAssets = s.filmAssets.filter((a) => a.filmId !== input.id);
        this.db.persist('filmProjects');
        return { ok: true };
      case 'film.generateScript': {
        const fid = input.id || input.filmId || s.filmProjects[0]?.id;
        const film = s.filmProjects.find((f) => f.id === fid);
        const charAsset = {
          id: `fa_char_${newId()}`,
          filmId: fid,
          kind: 'character',
          position: 0,
          name: 'Nhân vật chính',
          role: 'Protagonist',
          description: 'Nhân vật trung tâm trong câu chuyện, biểu cảm chân thực và giàu cảm xúc.',
          prompt: `${film?.stylePrompt || 'Cinematic 35mm'}, Vietnamese protagonist portrait, expressive eyes, 85mm lens`,
          voiceProvider: 'google_tts',
          voiceId: 'vi-VN-HoaiMy',
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
          status: 'done',
        };
        const locAsset = {
          id: `fa_loc_${newId()}`,
          filmId: fid,
          kind: 'location',
          position: 0,
          name: 'Bối cảnh trung tâm',
          role: 'Primary Location',
          description: 'Không gian điện ảnh với ánh sáng tự nhiên chiếu xuyên qua khung cửa.',
          prompt: `${film?.stylePrompt || 'Cinematic 35mm'}, atmospheric interior location, volumetric sunlight, detailed textures`,
          imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
          status: 'done',
        };
        const shot1 = {
          id: `fa_shot_${newId()}`,
          filmId: fid,
          kind: 'shot',
          position: 0,
          name: 'Cảnh 1 – Toàn cảnh thiết lập không gian',
          role: 'Wide Establishing Shot',
          description: 'Máy quay đẩy chậm vào nhân vật chính trong không gian ngập nắng.',
          prompt: 'Wide cinematic establishing shot, protagonist standing by sunlit window, 35mm film grain',
          videoPrompt: 'Slow push-in camera motion, dust motes dancing in warm sunlight, subtle movement',
          dialogue: 'Mọi hành trình lớn đều bắt đầu từ một quyết định nhỏ ngày hôm nay.',
          speaker: 'Nhân vật chính',
          durationSec: 6,
          startSource: 'auto',
          imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          status: 'done',
          videoStatus: 'done',
        };
        s.filmAssets = s.filmAssets.filter((a) => a.filmId !== fid).concat([charAsset, locAsset, shot1]);
        if (film) film.status = 'production';
        this.db.persist('filmAssets');
        return this.handleEndpoint('film.get', { id: fid });
      }
      case 'film.saveAsset': {
        if (input.id) {
          const idx = s.filmAssets.findIndex((a) => a.id === input.id);
          if (idx !== -1) {
            s.filmAssets[idx] = { ...s.filmAssets[idx], ...input };
            this.db.persist('filmAssets');
            return s.filmAssets[idx];
          }
        }
        const asset = {
          id: `fa_${newId()}`,
          filmId: input.filmId || s.filmProjects[0]?.id,
          kind: input.kind || 'shot',
          position: s.filmAssets.filter((a) => a.filmId === input.filmId && a.kind === (input.kind || 'shot')).length,
          name: input.name || 'Phân cảnh mới',
          role: input.role || 'Medium Shot',
          description: input.description || '',
          prompt: input.prompt || '',
          videoPrompt: input.videoPrompt || '',
          dialogue: input.dialogue || '',
          speaker: input.speaker || '',
          durationSec: input.durationSec ?? 6,
          imageUrl: input.imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
          videoUrl: input.videoUrl || null,
          status: 'done',
          videoStatus: 'done',
        };
        s.filmAssets.push(asset);
        this.db.persist('filmAssets');
        return asset;
      }
      case 'film.deleteAsset':
        s.filmAssets = s.filmAssets.filter((a) => a.id !== input.id && a.id !== input.assetId);
        this.db.persist('filmAssets');
        return { ok: true };
      case 'film.generate': {
        const asset = s.filmAssets.find((a) => a.id === (input.assetId || input.id));
        if (asset) {
          asset.status = 'done';
          if (input.mode === 'video' || input.kind === 'video') {
            asset.videoStatus = 'done';
            asset.videoUrl = asset.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          } else {
            asset.imageUrl = asset.imageUrl || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80';
          }
          const take = {
            id: `ft_${newId()}`,
            filmId: asset.filmId,
            assetId: asset.id,
            kind: input.mode === 'video' ? 'video' : 'image',
            url: input.mode === 'video' ? asset.videoUrl : asset.imageUrl,
            model: input.mode === 'video' ? 'seedance-2.0-fast' : 'gemini-3.1-flash-image',
            createdAt: now,
          };
          s.filmTakes.unshift(take);
          this.db.persist('filmAssets');
        }
        return { queued: 1, asset };
      }
      case 'film.assemble': {
        const fid = input.filmId || input.id || s.filmProjects[0]?.id;
        const r = {
          id: `fr_${newId()}`,
          filmId: fid,
          title: `Bản dựng Full HD (${new Date().toLocaleTimeString('vi-VN')})`,
          status: 'completed',
          resolution: '1080p',
          durationSec: 45,
          fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          createdAt: now,
        };
        s.filmRenders.unshift(r);
        this.db.persist('filmRenders');
        return r;
      }
      case 'film.assembleStatus':
        return { running: false, progress: 100, stage: 'Hoàn tất ghép phim' };
      case 'film.renders':
        return s.filmRenders.filter((r) => !input.filmId || r.filmId === input.filmId);
      case 'film.deleteRender':
        s.filmRenders = s.filmRenders.filter((r) => r.id !== input.id);
        this.db.persist('filmRenders');
        return { ok: true };
      case 'film.renderToContent': {
        const f = s.filmProjects.find((x) => x.id === (input.filmId || input.id)) || s.filmProjects[0];
        const item = {
          id: `cnt_${newId()}`,
          workspaceId: f?.workspaceId || s.workspaces[0]?.id,
          kind: 'video',
          title: f?.title || 'Phim ngắn xuất từ Xưởng Phim AI',
          caption: f?.idea || '',
          hashtags: ['#OmniraFilm', '#AIFilmStudio'],
          mediaPaths: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
          thumbnailPath: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
          durationSec: f?.targetDurationSec || 45,
          aspect: f?.aspect || '9:16',
          status: 'ready',
          source: 'film',
          spinVariants: 0,
          aiReviewed: true,
          hookScore: 93,
          createdAt: now,
          updatedAt: now,
        };
        s.contentItems.unshift(item);
        this.db.persist('contentItems');
        return item;
      }
      case 'film.estimate':
        return { imageUsd: 0.12, videoUsd: 0.72, voiceUsd: 0.03, totalUsd: 0.87 };
      case 'film.queue':
        return { paused: false, active: 0, queued: 0, items: [] };
      case 'film.setQueue':
      case 'film.cancel':
      case 'film.assembleCancel':
      case 'film.reorder':
      case 'film.selectTake':
      case 'film.uploadTake':
      case 'film.deleteTake':
      case 'film.upscale':
      case 'film.setSeedanceSource':
      case 'film.writeNarration':
      case 'film.previewNarration':
      case 'film.uploadNarration':
      case 'film.setWatermarkImage':
      case 'film.watermarkInfo':
      case 'film.optimizeStyle':
      case 'film.refreshPrompt':
      case 'film.resolveProposals':
      case 'film.adoptLocation':
      case 'film.seriesLocations':
      case 'film.exportVideos':
      case 'film.promoteToSeries':
        return { ok: true };

      // ── 11. CLONE VIDEO ──
      case 'clone.info':
        return { ready: true, ffmpegReady: true, ytdlpReady: true, visionProviders: ['Gemini 3.5 Flash', 'GPT-4o'] };
      case 'clone.list':
        return this.filterByWorkspace(s.cloneJobs, input.workspaceId);
      case 'clone.get':
        return s.cloneJobs.find((j) => j.id === input.id) || s.cloneJobs[0] || null;
      case 'clone.start': {
        const job = {
          id: `clone_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          sourceName: input.sourceName || input.url || 'viral_video_sample.mp4',
          sourceUrl: input.url || null,
          videoFile: 'source.mp4',
          thumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
          durationSec: 24,
          status: 'ready',
          stage: 'Đã phân tích hoàn tất 4 phân cảnh & góc máy',
          method: 'video',
          via: 'Gemini 3.5 Flash',
          model: 'gemini-3.5-flash',
          analysis: s.cloneJobs[0]?.analysis || {
            summary: 'Video chuyển cảnh nhanh theo nhịp nhạc, bố cục 9:16 bắt mắt.',
            aspect: '9:16',
            pacing: 'Nhanh (6s/cảnh)',
            hookTechnique: 'Câu hỏi trực diện + hiệu ứng chuyển cảnh',
            shots: [
              { index: 1, start: 0, end: 6, camera: 'Medium Shot', description: 'Mở đầu ấn tượng thu hút người xem', voiceover: 'Đừng bỏ lỡ bí quyết phối đồ cực đỉnh này!' },
              { index: 2, start: 6, end: 15, camera: 'Full Body Tracking', description: 'Trình diễn chi tiết sản phẩm trong ánh sáng tự nhiên', voiceover: 'Chất liệu cao cấp đứng form và tôn dáng tuyệt đối.' },
              { index: 3, start: 15, end: 24, camera: 'Close-up CTA', description: 'Cận cảnh chi tiết và lời kêu gọi hành động', voiceover: 'Bấm ngay vào giỏ hàng góc trái để nhận ưu đãi!' },
            ],
          },
          notes: ['Bóc tách 3 phân cảnh bằng Gemini 3.5 Flash'],
          filmId: null,
          error: null,
          createdAt: now,
        };
        s.cloneJobs.unshift(job);
        this.db.persist('cloneJobs');
        return job;
      }
      case 'clone.toFilm': {
        const job = s.cloneJobs.find((j) => j.id === (input.id || input.jobId)) || s.cloneJobs[0];
        const film = await this.handleEndpoint('film.create', {
          workspaceId: job?.workspaceId,
          title: `Clone: ${job?.sourceName || 'Video mẫu'}`,
          idea: job?.analysis?.summary || 'Dự án phim được dựng lại từ Clone Video AI',
        });
        await this.handleEndpoint('film.generateScript', { id: film.id });
        if (job) job.filmId = film.id;
        this.db.persist('cloneJobs');
        return { filmId: film.id, film };
      }
      case 'clone.retry':
      case 'clone.cancel':
        return s.cloneJobs.find((j) => j.id === input.id) || { ok: true };
      case 'clone.delete':
        s.cloneJobs = s.cloneJobs.filter((j) => j.id !== input.id);
        this.db.persist('cloneJobs');
        return { ok: true };

      // ── 12. IMAGE STUDIO (XƯỞNG ẢNH AI) ──
      case 'imagestudio.list':
        return this.filterByWorkspace(s.imageProjects, input.workspaceId).map((p) => ({
          ...p,
          resultCount: s.imageResults.filter((r) => r.projectId === p.id).length,
          coverUrl: s.imageResults.find((r) => r.projectId === p.id)?.imageUrl || null,
        }));
      case 'imagestudio.get': {
        const p = s.imageProjects.find((x) => x.id === input.id) || s.imageProjects[0];
        if (!p) return null;
        return {
          ...p,
          results: s.imageResults.filter((r) => r.projectId === p.id),
        };
      }
      case 'imagestudio.create': {
        const p = {
          id: `imgp_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          title: input.title || 'Bộ ảnh AI Mới',
          mode: input.mode || 'fashion_lookbook',
          aspect: input.aspect || '4:5',
          stylePreset: input.stylePreset || 'editorial_studio',
          brief: input.brief || '',
          productName: input.productName || '',
          ideas: [],
          createdAt: now,
          updatedAt: now,
        };
        s.imageProjects.unshift(p);
        this.db.persist('imageProjects');
        return p;
      }
      case 'imagestudio.update': {
        const idx = s.imageProjects.findIndex((x) => x.id === input.id);
        if (idx !== -1) {
          s.imageProjects[idx] = { ...s.imageProjects[idx], ...(input.patch || input), updatedAt: now };
          this.db.persist('imageProjects');
          return s.imageProjects[idx];
        }
        return null;
      }
      case 'imagestudio.delete':
        s.imageProjects = s.imageProjects.filter((x) => x.id !== input.id);
        s.imageResults = s.imageResults.filter((r) => r.projectId !== input.id);
        this.db.persist('imageProjects');
        return { ok: true };
      case 'imagestudio.generateIdeas': {
        const p = s.imageProjects.find((x) => x.id === (input.projectId || input.id)) || s.imageProjects[0];
        const ideas = [
          {
            id: `ii_${newId()}`,
            title: 'Concept 1 – Ánh nắng sớm qua khung cửa kính Studio',
            prompt: 'High-end editorial product & fashion photography, warm morning sunlight casting soft window shadows, 85mm f/1.4',
            selected: true,
          },
          {
            id: `ii_${newId()}`,
            title: 'Concept 2 – Bối cảnh tối giản sang trọng (Luxury Minimalist)',
            prompt: 'Luxury minimalist travertine stone podium and warm beige backdrop, studio softbox lighting, ultra detailed',
            selected: true,
          },
          {
            id: `ii_${newId()}`,
            title: 'Concept 3 – Lifestyle đường phố Sài Gòn giờ vàng',
            prompt: 'Candid street style photography during golden hour, natural bokeh background, vibrant editorial colors',
            selected: true,
          },
        ];
        if (p) {
          p.ideas = ideas;
          this.db.persist('imageProjects');
        }
        return ideas;
      }
      case 'imagestudio.generate':
      case 'imagestudio.enqueue': {
        const pid = input.projectId || input.id || s.imageProjects[0]?.id;
        const p = s.imageProjects.find((x) => x.id === pid);
        const sampleUrls = [
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&auto=format&fit=crop&q=80',
        ];
        const created: any[] = [];
        for (let i = 0; i < 2; i++) {
          const r = {
            id: `imgr_${newId()}`,
            projectId: pid,
            ideaId: p?.ideas?.[i]?.id || null,
            title: p?.ideas?.[i]?.title || `Ảnh AI #${i + 1}`,
            prompt: p?.ideas?.[i]?.prompt || p?.brief || 'Editorial studio photo',
            imageUrl: sampleUrls[i % sampleUrls.length],
            aspect: p?.aspect || '4:5',
            model: 'gemini-3.1-flash-image',
            createdAt: now,
          };
          s.imageResults.unshift(r);
          created.push(r);
        }
        this.db.persist('imageResults');
        return { created: created.length, results: created };
      }
      case 'imagestudio.deleteResult':
        s.imageResults = s.imageResults.filter((r) => r.id !== input.id && r.id !== input.resultId);
        this.db.persist('imageResults');
        return { ok: true };
      case 'imagestudio.toContent': {
        const p = s.imageProjects.find((x) => x.id === (input.projectId || input.id)) || s.imageProjects[0];
        const results = s.imageResults.filter((r) => r.projectId === p?.id);
        const item = {
          id: `cnt_${newId()}`,
          workspaceId: p?.workspaceId || s.workspaces[0]?.id,
          kind: results.length > 1 ? 'carousel' : 'image',
          title: p?.title || 'Bộ ảnh AI Lookbook',
          caption: p?.brief || '',
          hashtags: ['#OmniraImageAI', '#Lookbook'],
          mediaPaths: results.map((r) => r.imageUrl),
          thumbnailPath: results[0]?.imageUrl || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
          aspect: p?.aspect || '4:5',
          status: 'ready',
          source: 'image-studio',
          spinVariants: 0,
          aiReviewed: true,
          hookScore: 90,
          createdAt: now,
          updatedAt: now,
        };
        s.contentItems.unshift(item);
        this.db.persist('contentItems');
        return item;
      }
      case 'imagestudio.estimate':
        return { totalUsd: 0.08, count: 2 };
      case 'imagestudio.jobStatus':
        return { running: false, queued: 0, completed: 2 };
      case 'imagestudio.cancelJobs':
      case 'imagestudio.refreshPrompt':
      case 'imagestudio.retext':
        return { ok: true };

      // ── 13. TTS STUDIO (ĐỌC VĂN BẢN) & LOCAL TTS ──
      case 'tts.list':
        return s.ttsJobs;
      case 'tts.get':
        return s.ttsJobs.find((j) => j.id === input.id) || s.ttsJobs[0] || null;
      case 'tts.create': {
        const text = String(input.text || '');
        const job = {
          id: `tts_${newId()}`,
          title: input.title || text.slice(0, 48) || 'Bản thu giọng đọc AI mới',
          text,
          provider: input.provider || 'google_tts',
          model: input.model || 'gemini-2.5-flash-preview-tts',
          voiceId: input.voiceId || 'vi-VN-HoaiMy',
          voiceLabel: input.voiceLabel || 'Hoài My (Nữ miền Nam)',
          pauseSec: input.pauseSec ?? 0.45,
          chars: text.length,
          cast: input.cast || {},
          status: 'completed',
          progress: 100,
          chunksDone: 1,
          chunksTotal: 1,
          file: `audio/tts_${Date.now()}.wav`,
          srtFile: `audio/tts_${Date.now()}.srt`,
          durationSec: Math.max(3, Math.round(text.length / 14)),
          startedAt: now - 2000,
          finishedAt: now,
          createdAt: now,
        };
        s.ttsJobs.unshift(job);
        this.db.persist('ttsJobs');
        return job;
      }
      case 'tts.rename': {
        const job = s.ttsJobs.find((j) => j.id === input.id);
        if (job) {
          job.title = input.title;
          this.db.persist('ttsJobs');
        }
        return job;
      }
      case 'tts.delete':
        s.ttsJobs = s.ttsJobs.filter((j) => j.id !== input.id);
        this.db.persist('ttsJobs');
        return { ok: true };
      case 'tts.cancel':
      case 'tts.resume':
      case 'tts.export':
        return { ok: true, exportedPath: 'Exports/omnira_tts_audio.wav' };

      case 'localtts.status':
        return { installed: true, running: true, device: 'Apple Silicon MPS / Neural Engine', model: 'vieneu-v3-turbo', clonesCount: s.voiceClones.length };
      case 'localtts.clones':
        return s.voiceClones;
      case 'localtts.addClone':
      case 'localtts.addRecorded': {
        const vc = {
          id: `vc_${newId()}`,
          name: input.name || 'Giọng Clone Mới',
          sampleFile: 'voice_sample.wav',
          language: 'vi',
          createdAt: now,
        };
        s.voiceClones.push(vc);
        this.db.persist('voiceClones');
        return vc;
      }
      case 'localtts.renameClone': {
        const vc = s.voiceClones.find((c) => c.id === input.id);
        if (vc) vc.name = input.name;
        this.db.persist('voiceClones');
        return vc;
      }
      case 'localtts.removeClone':
        s.voiceClones = s.voiceClones.filter((c) => c.id !== input.id);
        this.db.persist('voiceClones');
        return { ok: true };
      case 'localtts.install':
      case 'localtts.uninstall':
      case 'localtts.cancel':
        return { ok: true };

      // ── 14. CALENDAR & SCHEDULED POSTS ──
      case 'posts.range': {
        const chanMap = new Map(s.channels.map((c) => [c.id, c]));
        const itemMap = new Map(s.contentItems.map((i) => [i.id, i]));
        return s.scheduledPosts
          .filter((p) => {
            const ch = chanMap.get(p.channelId);
            if (input.workspaceId && ch?.workspaceId !== input.workspaceId) return false;
            return true;
          })
          .map((p) => {
            const ch = chanMap.get(p.channelId);
            const item = itemMap.get(p.contentItemId);
            return {
              ...p,
              channelName: ch?.name || 'Kênh',
              platform: ch?.platform || 'facebook',
              title: item?.title || 'Bài đăng',
              kind: item?.kind || 'reel',
              thumbnailPath: item?.thumbnailPath || null,
            };
          })
          .sort((a, b) => a.scheduledAt - b.scheduledAt);
      }
      case 'posts.schedule': {
        const channelIds: string[] = Array.isArray(input.channelIds)
          ? input.channelIds
          : input.channelId
          ? [input.channelId]
          : [s.channels[0]?.id];
        const created: any[] = [];
        for (const cid of channelIds) {
          const sp = {
            id: `sp_${newId()}`,
            contentItemId: input.contentItemId || s.contentItems[0]?.id,
            channelId: cid,
            scheduledAt: input.scheduledAt || now + 2 * 3600000,
            status: 'queued',
            isGoldenHour: Boolean(input.isGoldenHour ?? true),
            attempts: 0,
            publishedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          s.scheduledPosts.push(sp);
          created.push(sp);
        }
        this.db.persist('scheduledPosts');
        return created;
      }
      case 'posts.autoSchedule': {
        const idSet = Array.isArray(input.contentIds) && input.contentIds.length ? new Set(input.contentIds) : null;
        const readyItems = idSet
          ? s.contentItems.filter((i) => idSet.has(i.id))
          : this.filterByWorkspace(s.contentItems, input.workspaceId).filter((i) => i.status === 'ready');
        const chans = this.filterByWorkspace(s.channels, input.workspaceId);
        const spacingMs = (Number(input.spacingHours) || 4) * 3600000;
        const created: any[] = [];
        readyItems.forEach((item, idx) => {
          const ch = chans[idx % Math.max(1, chans.length)] || s.channels[0];
          if (!ch) return;
          const sp = {
            id: `sp_${newId()}`,
            contentItemId: item.id,
            channelId: ch.id,
            scheduledAt: now + (idx + 1) * spacingMs,
            status: 'queued',
            isGoldenHour: true,
            attempts: 0,
            publishedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          item.status = 'scheduled';
          s.scheduledPosts.push(sp);
          created.push(sp);
        });
        this.db.persist('scheduledPosts');
        this.db.persist('contentItems');
        return { count: created.length, scheduled: created, skipped: [], posts: created };
      }
      case 'posts.reschedule': {
        const sp = s.scheduledPosts.find((p) => p.id === input.id);
        if (sp) {
          sp.scheduledAt = input.scheduledAt;
          sp.updatedAt = now;
          this.db.persist('scheduledPosts');
        }
        return sp;
      }
      case 'posts.publishNow': {
        const sp = s.scheduledPosts.find((p) => p.id === input.id);
        if (sp) {
          sp.status = 'published';
          sp.publishedAt = now;
          sp.permalink = `https://social.omnira.vn/post/${sp.id}`;
          sp.views = 1240;
          sp.reach = 980;
          sp.engagements = 145;
          this.db.persist('scheduledPosts');
          return sp;
        }
        return { ok: true };
      }
      case 'posts.cancel':
        s.scheduledPosts = s.scheduledPosts.filter((p) => p.id !== input.id);
        this.db.persist('scheduledPosts');
        return { ok: true };
      case 'posts.worker':
        return { enabled: Boolean(s.settings['posts.worker'] ?? true) };
      case 'posts.setWorker':
        s.settings['posts.worker'] = Boolean(input.enabled);
        this.db.persist('settings');
        return { enabled: s.settings['posts.worker'] };
      case 'posts.stagger': {
        const stg = s.settings['posts.stagger'] || { enabled: true, minMinutes: 1, maxMinutes: 3, minSec: 60, maxSec: 180 };
        return {
          enabled: stg.enabled ?? true,
          minMinutes: stg.minMinutes ?? Math.round((stg.minSec ?? 60) / 60),
          maxMinutes: stg.maxMinutes ?? Math.round((stg.maxSec ?? 180) / 60),
          minSec: stg.minSec ?? 60,
          maxSec: stg.maxSec ?? 180,
        };
      }
      case 'posts.setStagger':
        s.settings['posts.stagger'] = {
          enabled: input.enabled ?? true,
          minMinutes: input.minMinutes ?? 1,
          maxMinutes: input.maxMinutes ?? 3,
          minSec: input.minSec ?? (input.minMinutes ?? 1) * 60,
          maxSec: input.maxSec ?? (input.maxMinutes ?? 3) * 60,
        };
        this.db.persist('settings');
        return s.settings['posts.stagger'];

      // ── 15. UNIFIED INBOX ──
      case 'inbox.conversations': {
        let convs = this.filterByWorkspace(s.conversations, input.workspaceId);
        if (input.platform && input.platform !== 'all') convs = convs.filter((c) => c.platform === input.platform);
        if (input.status && input.status !== 'all') convs = convs.filter((c) => c.status === input.status);
        if (input.unreadOnly) convs = convs.filter((c) => (c.unreadCount || 0) > 0);
        return convs.map((c) => ({
          ...c,
          channelName: s.channels.find((ch) => ch.id === c.channelId)?.name || 'Kênh',
          drafts: s.messages.filter((m) => m.conversationId === c.id && m.deliveryStatus === 'draft').length,
        }));
      }
      case 'inbox.messages':
        return s.messages
          .filter((m) => m.conversationId === input.conversationId)
          .sort((a, b) => a.createdAt - b.createdAt);
      case 'inbox.send':
      case 'inbox.reply': {
        const msg = {
          id: `msg_${newId()}`,
          conversationId: input.conversationId,
          direction: 'out',
          author: 'Bạn (Omnira Studio)',
          body: input.body || '',
          attachments: input.attachments || [],
          deliveryStatus: 'sent',
          createdAt: now,
        };
        s.messages.push(msg);
        const conv = s.conversations.find((c) => c.id === input.conversationId);
        if (conv) {
          conv.lastMessageAt = now;
          conv.lastMessagePreview = msg.body;
          conv.unreadCount = 0;
        }
        this.db.persist('messages');
        return msg;
      }
      case 'inbox.suggestReply': {
        const conv = s.conversations.find((c) => c.id === input.conversationId);
        const draft = {
          id: `msg_${newId()}`,
          conversationId: input.conversationId,
          direction: 'out',
          author: 'AI Gợi ý (Omnira)',
          body: `Dạ em chào ${conv?.customerName || 'anh/chị'} ạ ❤️ Bên em hiện đang sẵn hàng mẫu này và ưu đãi miễn phí vận chuyển hôm nay. Anh/chị cho em xin SĐT + chiều cao cân nặng để em tư vấn size chuẩn nhất nhé ạ!`,
          attachments: [],
          deliveryStatus: 'draft',
          aiNote: 'Soạn bởi Gemini 3.5 Flash theo giọng thương hiệu',
          note: 'Soạn bởi Gemini 3.5 Flash theo giọng thương hiệu',
          createdAt: now,
        };
        s.messages.push(draft);
        this.db.persist('messages');
        return draft;
      }
      case 'inbox.approveDraft': {
        const m = s.messages.find((x) => x.id === (input.messageId || input.id));
        if (m) {
          if (input.body) m.body = input.body;
          m.deliveryStatus = 'sent';
          m.author = 'Maison De Ánh (AI Approved)';
          this.db.persist('messages');
        }
        return m;
      }
      case 'inbox.discardDraft':
        s.messages = s.messages.filter((x) => x.id !== (input.messageId || input.id));
        this.db.persist('messages');
        return { ok: true };
      case 'inbox.markRead': {
        const conv = s.conversations.find((c) => c.id === input.conversationId);
        if (conv) conv.unreadCount = 0;
        this.db.persist('conversations');
        return { ok: true };
      }
      case 'inbox.update': {
        const conv = s.conversations.find((c) => c.id === (input.conversationId || input.id));
        if (conv) {
          Object.assign(conv, input.patch || input);
          this.db.persist('conversations');
        }
        return conv;
      }
      case 'inbox.stats': {
        const convs = this.filterByWorkspace(s.conversations, input.workspaceId);
        return {
          total: convs.length,
          unread: convs.filter((c) => (c.unreadCount || 0) > 0).length,
          byPlatform: {
            facebook: convs.filter((c) => c.platform === 'facebook').length,
            tiktok: convs.filter((c) => c.platform === 'tiktok').length,
            instagram: convs.filter((c) => c.platform === 'instagram').length,
            youtube: convs.filter((c) => c.platform === 'youtube').length,
          },
          avgResponseSec: 42,
          enabledRules: s.autoReplyRules.filter((r) => r.enabled).length,
        };
      }
      case 'inbox.quickReplies':
        return this.filterByWorkspace(s.quickReplies, input.workspaceId);
      case 'inbox.rules':
        return this.filterByWorkspace(s.autoReplyRules, input.workspaceId);
      case 'inbox.saveRule': {
        if (input.id) {
          const idx = s.autoReplyRules.findIndex((r) => r.id === input.id);
          if (idx !== -1) {
            s.autoReplyRules[idx] = { ...s.autoReplyRules[idx], ...input, updatedAt: now };
            this.db.persist('autoReplyRules');
            return s.autoReplyRules[idx];
          }
        }
        const rule = {
          id: `rule_${newId()}`,
          workspaceId: input.workspaceId || s.workspaces[0]?.id,
          channelId: input.channelId || null,
          name: input.name || 'Quy tắc trả lời tự động mới',
          keywords: Array.isArray(input.keywords) ? input.keywords : ['giá', 'ib'],
          action: input.action || 'reply_and_dm',
          template: input.template || 'Dạ shop đã gửi thông tin chi tiết vào tin nhắn cho bạn rồi ạ ❤️',
          minDelaySec: input.minDelaySec ?? 15,
          maxDelaySec: input.maxDelaySec ?? 35,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        };
        s.autoReplyRules.push(rule);
        this.db.persist('autoReplyRules');
        return rule;
      }
      case 'inbox.toggleRule': {
        const r = s.autoReplyRules.find((x) => x.id === input.id);
        if (r) {
          r.enabled = input.enabled ?? !r.enabled;
          this.db.persist('autoReplyRules');
        }
        return r;
      }
      case 'inbox.deleteRule':
        s.autoReplyRules = s.autoReplyRules.filter((x) => x.id !== input.id);
        this.db.persist('autoReplyRules');
        return { ok: true };
      case 'inbox.aiSettings':
        return s.settings['inbox.ai'];
      case 'inbox.setAiSettings':
        s.settings['inbox.ai'] = { ...s.settings['inbox.ai'], ...input };
        this.db.persist('settings');
        return s.settings['inbox.ai'];
      case 'inbox.worker':
        return { running: true, autoSync: Boolean(s.settings['inbox.autoSync'] ?? true), version: 1, lastSyncAt: now - 30000 };
      case 'inbox.setAutoSync':
        s.settings['inbox.autoSync'] = Boolean(input.enabled);
        this.db.persist('settings');
        return { running: true, autoSync: s.settings['inbox.autoSync'], version: 2 };
      case 'inbox.sync':
        return { ok: true, synced: 3, channels: s.channels.length, newMessages: 2, errors: [] };
      case 'inbox.resend':
        return { ok: true };
      case 'inbox.pickAttachments': {
        const paths = Array.isArray(input.files)
          ? input.files.map((f: any) => f.dataUrl || f.name)
          : ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&auto=format&fit=crop&q=80'];
        return { paths };
      }

      // ── 16. ANALYTICS & INSIGHTS ──
      case 'analytics.overview': {
        const sum = await this.handleEndpoint('dashboard.summary', input);
        const topChans = await this.handleEndpoint('dashboard.topChannels', { ...input, limit: 10 });
        const published = s.scheduledPosts
          .filter((p) => p.status === 'published' && (!input.channelId || p.channelId === input.channelId))
          .map((p) => {
            const item = s.contentItems.find((i) => i.id === p.contentItemId);
            const ch = s.channels.find((c) => c.id === p.channelId);
            return {
              ...p,
              title: item?.title || 'Bài đăng',
              formatLabel: item?.kind === 'carousel' ? 'Carousel' : item?.kind === 'short' ? 'YouTube Shorts' : 'Reels / TikTok',
              durationSec: item?.durationSec || 28,
              retention: 68,
              channelName: ch?.name || 'Kênh',
              platform: ch?.platform || 'instagram',
            };
          });
        return {
          posts: Math.max(published.length, sum.posts.publishedThisMonth || 18),
          postsWithMetrics: Math.max(published.length, 15),
          totalViews: sum.reach.views30d,
          totalEngagements: sum.reach.engagements30d,
          avgRetention: 64,
          byFormat: [
            { key: 'reel', label: 'Reels / TikTok ngắn', posts: 10, avgViews: 68400, avgEngagements: 5920, avgRetention: 68 },
            { key: 'carousel', label: 'Bộ ảnh Lookbook (Carousel)', posts: 5, avgViews: 24500, avgEngagements: 2380, avgRetention: null },
            { key: 'short', label: 'YouTube Shorts', posts: 3, avgViews: 41200, avgEngagements: 3150, avgRetention: 61 },
          ],
          byLength: [
            { key: 'under_30s', label: 'Dưới 30 giây (Hook nhanh)', posts: 8, avgViews: 74200, avgEngagements: 6410, avgRetention: 71 },
            { key: '30_60s', label: '30 – 60 giây (Storytelling)', posts: 7, avgViews: 52800, avgEngagements: 4320, avgRetention: 62 },
            { key: 'over_60s', label: 'Trên 60 giây (Review sâu)', posts: 3, avgViews: 38900, avgEngagements: 2980, avgRetention: 54 },
          ],
          top: published,
          bottom: [...published].reverse(),
          totals: {
            views: sum.reach.views30d,
            engagements: sum.reach.engagements30d,
            followers: topChans.reduce((a: number, c: any) => a + (c.followers || 0), 0),
            publishedPosts: sum.posts.publishedThisMonth,
          },
          series: sum.reach.series,
          byPlatform: sum.reach.platforms,
          channels: topChans,
          topPosts: published,
        };
      }
      case 'analytics.goals': {
        const metricLabels: Record<string, string> = {
          followers: 'Người theo dõi',
          views: 'Lượt xem 30 ngày',
          watch_minutes_60d: 'Phút xem 60 ngày',
          videos_30d: 'Video đăng 30 ngày',
        };
        return s.channelGoals
          .filter((g) => !input.channelId || g.channelId === input.channelId)
          .map((g) => {
            const ch = s.channels.find((c) => c.id === g.channelId);
            const current = g.metric === 'followers' ? ch?.followers || 0 : g.metric === 'videos_30d' ? 18 : 642000;
            const progress = Math.min(100, Math.round((current / Math.max(1, g.target)) * 100));
            return {
              ...g,
              channelName: ch?.name || 'Kênh',
              platform: ch?.platform || 'tiktok',
              metricLabel: metricLabels[g.metric] || g.label || g.metric,
              current,
              progress,
              progressPct: progress,
            };
          });
      }
      case 'analytics.saveGoal': {
        const g = {
          id: input.id || `goal_${newId()}`,
          channelId: input.channelId || s.channels[0]?.id,
          metric: input.metric || 'followers',
          target: Number(input.target) || 500000,
          label: input.label || 'Mục tiêu tăng trưởng mới',
          createdAt: now,
        };
        s.channelGoals.push(g);
        this.db.persist('channelGoals');
        return g;
      }
      case 'analytics.deleteGoal':
        s.channelGoals = s.channelGoals.filter((g) => g.id !== input.id);
        this.db.persist('channelGoals');
        return { ok: true };
      case 'insights.bestHours': {
        const byHour = Array.from({ length: 24 }, (_, hour) => {
          const isLunch = hour >= 11 && hour <= 13;
          const isEvening = hour >= 19 && hour <= 22;
          return {
            hour,
            posts: isEvening ? 4 : isLunch ? 3 : hour >= 8 && hour <= 23 ? 1 : 0,
            score: isEvening ? 96 : isLunch ? 84 : hour >= 8 && hour <= 23 ? 42 : 12,
          };
        });
        return {
          posts: 18,
          minPosts: 5,
          byHour,
          suggested: [
            { day: 0, start: '11:30', end: '13:00', weight: 0.85, hour: 11, score: 84, label: '11:30 – 13:00 (Giờ nghỉ trưa)' },
            { day: 0, start: '20:00', end: '21:30', weight: 1.0, hour: 20, score: 96, label: '20:00 – 21:30 (Khung giờ vàng buổi tối)' },
          ],
        };
      }
      case 'insights.last':
      case 'insights.sync':
        return { lastSyncAt: now, syncedChannels: s.channels.length, channels: s.channels.length, posts: s.scheduledPosts.length, errors: [], notes: [] };

      // ── 17. AI ROUTER, MEDIA, FLOW, SETTINGS, SUPPORT, SYSTEM ──
      case 'ai.providers':
        return s.aiProviders;
      case 'ai.updateProvider':
      case 'ai.setKey': {
        const p = s.aiProviders.find((x) => x.id === input.id || x.provider === input.provider);
        if (p) {
          Object.assign(p, input.patch || input);
          if (input.apiKey) {
            p.hasKey = true;
            p.keyPreview = `${String(input.apiKey).slice(0, 6)}…${String(input.apiKey).slice(-4)}`;
            p.status = 'ok';
          }
          p.lastTestedAt = now;
          this.db.persist('aiProviders');
        }
        return p;
      }
      case 'ai.removeKey': {
        const p = s.aiProviders.find((x) => x.id === input.id || x.provider === input.provider);
        if (p) {
          p.hasKey = false;
          p.keyPreview = null;
          p.status = 'untested';
          this.db.persist('aiProviders');
        }
        return p;
      }
      case 'ai.test':
      case 'ai.testAll':
      case 'ai.testModel':
        return { ok: true, latencyMs: 265, model: input.model || 'gemini-3.5-flash' };
      case 'ai.routing':
        return {
          fallbackOnError: Boolean(s.settings['ai.fallbackOnError']),
          omniraManaged: Boolean(s.settings['ai.omnira']),
          chains: {
            text: ['gemini', 'openai', 'anthropic'],
            tts: ['google_tts', 'elevenlabs', 'local_tts'],
            media: ['google_image', 'seedance', 'google_veo'],
          },
        };
      case 'ai.setFallback':
      case 'ai.omnira':
      case 'ai.reorder':
        return { ok: true };
      case 'ai.pricing':
        return [
          { model: 'gemini-3.5-flash', inputPer1M: 0.15, outputPer1M: 0.6, unit: '1M tokens' },
          { model: 'gpt-4o', inputPer1M: 2.5, outputPer1M: 10.0, unit: '1M tokens' },
          { model: 'claude-sonnet-5-5', inputPer1M: 3.0, outputPer1M: 15.0, unit: '1M tokens' },
          { model: 'gemini-3.1-flash-image', inputPer1M: 0.04, outputPer1M: 0.04, unit: '1 ảnh' },
          { model: 'seedance-2.0-fast', inputPer1M: 0.12, outputPer1M: 0.12, unit: '1 giây video' },
        ];
      case 'ai.setPrice':
        return { ok: true };

      case 'settings.budget': {
        const totalUsd = Number(s.aiUsage.reduce((a, u) => a + (u.costUsd || 0), 0).toFixed(3));
        return {
          monthlyHardCapUsd: s.settings['budget.monthlyHardCapUsd'] ?? 120,
          circuitBreaker: Boolean(s.settings['budget.circuitBreaker']),
          spentThisMonthUsd: totalUsd,
          byFeature: [
            { feature: 'Xưởng Phim AI (Seedance & Gemini Image)', costUsd: 0.202, calls: 18 },
            { feature: 'Giọng đọc AI (Gemini TTS)', costUsd: 0.028, calls: 12 },
            { feature: 'Trợ lý Hộp thư & Spin Nội dung', costUsd: 0.015, calls: 24 },
          ],
        };
      }
      case 'settings.setBudget':
        if (input.monthlyHardCapUsd !== undefined) s.settings['budget.monthlyHardCapUsd'] = Number(input.monthlyHardCapUsd);
        if (input.circuitBreaker !== undefined) s.settings['budget.circuitBreaker'] = Boolean(input.circuitBreaker);
        this.db.persist('settings');
        return this.handleEndpoint('settings.budget', {});

      case 'media.status':
      case 'media.detect':
      case 'media.info':
        return {
          ffmpegReady: true,
          ffmpegVersion: '7.1-omnira-cloud',
          preferredEncoder: s.settings['media.preferredEncoder'] || 'h264_nvenc',
          encoders: ['h264_nvenc', 'h264_videotoolbox', 'libx264'],
          imageEngine: s.settings['media.imageEngine'] || 'google_image',
          videoEngine: s.settings['media.videoEngine'] || 'seedance',
          seedanceTier: s.settings['media.seedanceTier'] || 'fast',
          upscaleReady: true,
        };
      case 'media.voices':
        return [
          { id: 'vi-VN-HoaiMy', name: 'Hoài My (Nữ miền Nam – Truyền cảm)', label: 'Hoài My (Nữ miền Nam – Truyền cảm)', provider: 'google_tts', gender: 'female', lang: 'vi-VN' },
          { id: 'vi-VN-NamMinh', name: 'Nam Minh (Nam miền Bắc – Chuyên nghiệp)', label: 'Nam Minh (Nam miền Bắc – Chuyên nghiệp)', provider: 'google_tts', gender: 'male', lang: 'vi-VN' },
          { id: 'vi-VN-ThaoTrinh', name: 'Thảo Trinh (Nữ KOC Review trẻ trung)', label: 'Thảo Trinh (Nữ KOC Review trẻ trung)', provider: 'google_tts', gender: 'female', lang: 'vi-VN' },
          { id: 'eleven-Rachel-vi', name: 'Rachel Multilingual v2', label: 'Rachel Multilingual v2', provider: 'elevenlabs', gender: 'female', lang: 'multilingual' },
          { id: 'local-khanh-linh', name: 'Khánh Linh (VieNeu Clone Local)', label: 'Khánh Linh (VieNeu Clone Local)', provider: 'local_tts', gender: 'female', lang: 'vi-VN' },
        ];
      case 'media.voiceReady':
        return { ready: true, provider: 'google_tts' };
      case 'media.bgmList':
        return s.bgmTracks;
      case 'media.setEncoder':
        s.settings['media.preferredEncoder'] = input.encoder;
        this.db.persist('settings');
        return { ok: true };
      case 'media.setImageEngine':
        s.settings['media.imageEngine'] = input.engine;
        this.db.persist('settings');
        return { ok: true };
      case 'media.setVideoEngine':
        s.settings['media.videoEngine'] = input.engine;
        this.db.persist('settings');
        return { ok: true };
      case 'media.setSeedanceTier':
        s.settings['media.seedanceTier'] = input.tier;
        this.db.persist('settings');
        return { ok: true };
      case 'media.previewVoice':
      case 'media.generateMusic':
      case 'media.importBgm':
      case 'media.importClips':
      case 'media.cleanup':
      case 'media.showInFolder':
      case 'media.upscale':
      case 'media.upscaleInfo':
      case 'media.upscaleProgress':
      case 'media.cancelUpscale':
        return { ok: true };

      case 'flow.status':
      case 'museFlow.status':
      case 'grokFlow.status':
        return {
          loggedIn: true,
          ready: true,
          credits: 1850,
          model: 'veo-3.1-fast',
          concurrency: 2,
          lastCheckedAt: now,
        };
      case 'flow.check':
      case 'flow.setPrefs':
      case 'flow.setModel':
      case 'flow.setSource':
      case 'flow.refreshCredits':
      case 'flow.test':
      case 'museFlow.check':
      case 'museFlow.setPrefs':
      case 'grokFlow.check':
      case 'grokFlow.setPrefs':
        return { ok: true, status: 'ready' };

      case 'support.list':
        return s.supportTickets;
      case 'support.get':
        return s.supportTickets.find((t) => t.id === input.id) || s.supportTickets[0] || null;
      case 'support.create': {
        const t = {
          id: `tkt_${newId().slice(0, 6)}`,
          type: input.type || 'support',
          subject: input.subject || 'Yêu cầu hỗ trợ mới',
          status: 'open',
          createdAt: now,
          updatedAt: now,
          messages: [
            {
              id: `tm_${newId()}`,
              author: s.authUser?.name || 'Bạn',
              role: 'user',
              body: input.body || '',
              attachments: input.attachments || [],
              createdAt: now,
            },
          ],
        };
        s.supportTickets.unshift(t);
        this.db.persist('supportTickets');
        return t;
      }
      case 'support.reply': {
        const t = s.supportTickets.find((x) => x.id === input.id);
        if (t) {
          t.messages.push({
            id: `tm_${newId()}`,
            author: s.authUser?.name || 'Bạn',
            role: 'user',
            body: input.body || '',
            attachments: input.attachments || [],
            createdAt: now,
          });
          t.updatedAt = now;
          this.db.persist('supportTickets');
        }
        return t;
      }
      case 'support.pickImages':
        return [];

      case 'system.storage':
      case 'storage.location':
        return {
          root: `firebase://omnira-studio-11041651/firestore`,
          dbSizeBytes: 2480000,
          mediaSizeBytes: 148200000,
          freeBytes: 85899345920,
          firebaseProjectId: this.db.projectId,
        };
      case 'system.dbInfo':
        return { path: `firebase://${this.db.projectId}/default`, seeded: true };
      case 'system.logInfo':
        return { dir: '/var/log/omnira-studio', file: '/var/log/omnira-studio/app.log', sizeBytes: 42180 };
      case 'system.background':
        return s.settings['system.background'] || { preset: 'aurora', opacity: 0.25, blur: 32 };
      case 'system.setBackground':
        s.settings['system.background'] = { ...s.settings['system.background'], ...input };
        this.db.persist('settings');
        return s.settings['system.background'];
      case 'system.pickImage':
        if (Array.isArray(input.files) && input.files[0]?.dataUrl) return input.files[0].dataUrl;
        return 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80';
      case 'system.pickMedia':
        if (Array.isArray(input.files) && input.files.length) return input.files.map((f: any) => f.dataUrl || f.name);
        return ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80'];
      case 'system.pickVideo':
        return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      default:
        return { ok: true, endpoint };
    }
  }
}
