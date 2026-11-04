import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';
import { QuotaBarComponent } from '../../layout/quota-bar.component';
import { ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, asList, errOf, fmtCompact, fmtDateTime, fmtRelative, healthTone } from '../../shared/util';

type Filter = 'all' | 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'attention';

const SESSION_LABEL: Record<string, { label: string; health: string }> = {
  active: { label: 'Phiên đang hoạt động', health: 'ok' },
  expiring: { label: 'Phiên sắp hết hạn', health: 'warn' },
  checkpoint: { label: 'Bị checkpoint – cần xác minh', health: 'warn' },
  expired: { label: 'Phiên đã hết hạn', health: 'error' },
  logged_out: { label: 'Đã đăng xuất', health: 'error' },
  unknown: { label: 'Chưa kiểm tra', health: 'idle' },
};
const TOKEN_LABEL: Record<string, string> = { valid: 'API đã kết nối', expiring: 'Token sắp hết hạn', expired: 'Token hết hạn', missing: 'Chưa kết nối API', invalid: 'Token không hợp lệ' };
const ROLE_LABEL: Record<string, string> = { admin: 'Quản trị viên', editor: 'Biên tập viên', moderator: 'Người kiểm duyệt', advertiser: 'Nhà quảng cáo' };

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule, QuotaBarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="users" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Quản lý Tài khoản & Trang</h1>
          <p class="o-page-desc">{{ accounts().length }} tài khoản · {{ channels().length }} kênh · {{ connectedPct() }}% đã kết nối API đăng bài</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn" (click)="connect('facebook')" [disabled]="connecting()"><o-icon name="facebook" [size]="15" style="color: rgb(var(--c-brand-facebook))" /> Kết nối Facebook</button>
          <button class="o-btn" (click)="connect('tiktok')" [disabled]="connecting()"><o-icon name="tiktok" [size]="15" /> Kết nối TikTok</button>
          <button class="o-btn" (click)="connect('youtube')" [disabled]="connecting()"><o-icon name="youtube" [size]="15" style="color: rgb(var(--c-brand-youtube))" /> Kết nối YouTube</button>
          <button class="o-btn o-btn-primary" (click)="openAdd()"><o-icon name="userplus" [size]="15" /> Thêm tài khoản</button>
        </div>
      </div>

      <omni-quota-bar />

      <div class="o-tabs">
        <button [class.active]="view() === 'accounts'" (click)="view.set('accounts')"><o-icon name="users" [size]="14" /> Tài khoản & Trang</button>
        <button [class.active]="view() === 'proxies'" (click)="view.set('proxies')"><o-icon name="globe" [size]="14" /> Proxy <span class="o-badge mono">{{ proxies().length }}</span></button>
        <button [class.active]="view() === 'profiles'" (click)="view.set('profiles')"><o-icon name="fingerprint" [size]="14" /> Browser Profile <span class="o-badge mono">{{ profiles().length }}</span></button>
      </div>

      @switch (view()) {
        @case ('accounts') {
          <div class="flex flex-wrap items-center gap-2">
            @for (c of chips(); track c.value) {
              <button class="o-chip" [class.active]="filter() === c.value" (click)="filter.set(c.value)">
                @if (c.dot) { <span class="o-dot" [class]="'o-dot ' + c.dot"></span> }
                {{ c.label }} <span class="o-badge mono">{{ c.count }}</span>
              </button>
            }
            <div class="relative ml-auto" style="width: min(260px, 100%)">
              <o-icon name="search" [size]="14" class="o-muted" style="position: absolute; left: 10px; top: 11px" />
              <input class="o-input" style="padding-left: 30px" placeholder="Tìm tài khoản, fanpage, handle…" [ngModel]="query()" (ngModelChange)="query.set($event)" />
            </div>
          </div>

          <div class="layout">
            <div class="flex flex-col gap-4 min-w-0">
              @if (loading()) { @for (i of [0, 1, 2]; track i) { <div class="o-skel" style="height: 120px"></div> } }

              <!-- FacebookTree -->
              @if (show('facebook') && fbAccounts().length) {
                <section class="o-card">
                  <div class="o-card-head"><span class="o-plat facebook">FB</span><div class="flex-1"><div class="o-card-title">Facebook – Tài khoản VIA & Fanpage</div><div class="o-card-sub">{{ fbAccounts().length }} VIA · {{ fbPages() }} Fanpage</div></div></div>
                  <ul class="tree px-2 pb-2">
                    @for (a of fbAccounts(); track a.id) {
                      <li>
                        <div class="o-list-item" [class.active]="selId() === a.id" (click)="select(a.id)">
                          <button class="o-icon-btn" style="width: 24px; height: 24px" (click)="toggleExpand(a.id, $event)" [attr.aria-expanded]="expanded().has(a.id)" [attr.aria-label]="expanded().has(a.id) ? 'Thu gọn' : 'Mở rộng'"><o-icon [name]="expanded().has(a.id) ? 'chevrondown' : 'chevronright'" [size]="14" /></button>
                          <div class="o-avatar" style="width: 32px; height: 32px">{{ a.displayName.slice(0, 2).toUpperCase() }}</div>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2"><span class="font-semibold truncate">{{ a.displayName }}</span>@if (a.twoFactorEnabled) { <span class="o-badge success"><o-icon name="shield" [size]="11" /> 2FA</span> }</div>
                            <div class="text-label-sm o-muted truncate">{{ a.handle ? at(a.handle) : 'UID: ' + (a.externalId ?? '—') }} · {{ (a.channels ?? []).length }} trang</div>
                          </div>
                          <span class="flex items-center gap-1.5 text-label-sm"><span class="o-dot" [class]="'o-dot ' + tone(session(a).health)"></span>{{ session(a).label }}</span>
                        </div>
                        @if (expanded().has(a.id)) {
                          <ul class="children">
                            @for (c of a.channels ?? []; track c.id) {
                              <li class="o-list-item" (click)="select(a.id)">
                                <span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span>
                                <div class="min-w-0 flex-1"><div class="truncate text-body-sm">{{ c.name }}</div><div class="text-label-sm o-faint">{{ c.platform === 'instagram' ? (c.handle ?? '') : 'ID: ' + (c.externalId ?? '—') }} · {{ compact(c.followers) }} theo dõi</div></div>
                                @if (c.quotaBlocked) { <span class="o-badge warning">Ngoài hạn mức</span> }
                                <span class="o-badge" [class]="'o-badge ' + tokenTone(c.tokenStatus)">{{ tokenLabel(c.tokenStatus) }}</span>
                              </li>
                            } @empty { <li class="text-body-sm o-muted px-3 py-2">Chưa có Fanpage – thêm trang hoặc nhập từ User token.</li> }
                            <li class="px-2 py-1 flex gap-2">
                              <button class="o-btn o-btn-sm o-btn-subtle" (click)="openAddPage(a)"><o-icon name="plus" [size]="13" /> Thêm Fanpage</button>
                              <button class="o-btn o-btn-sm o-btn-subtle" (click)="openImport(a)"><o-icon name="download" [size]="13" /> Nhập Fanpage từ token</button>
                            </li>
                          </ul>
                        }
                      </li>
                    }
                  </ul>
                </section>
              }

              <!-- TikTokGrid -->
              @if (show('tiktok') && byPlatform('tiktok').length) {
                <section class="o-card">
                  <div class="o-card-head"><span class="o-plat tiktok">TT</span><div class="flex-1"><div class="o-card-title">TikTok</div><div class="o-card-sub">{{ byPlatform('tiktok').length }} tài khoản</div></div></div>
                  <div class="grid gap-3 px-4 pb-4" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
                    @for (a of byPlatform('tiktok'); track a.id) {
                      @let c = a.channels?.[0];
                      <button class="o-tile tt" [class.sel]="selId() === a.id" (click)="select(a.id)">
                        <div class="flex items-center gap-2">
                          <div class="o-avatar">{{ a.displayName.slice(0, 2).toUpperCase() }}</div>
                          <div class="min-w-0 flex-1 text-left"><div class="font-semibold truncate">{{ a.displayName }}</div><div class="text-label-sm o-muted truncate">{{ a.handle ? at(a.handle) : '—' }}</div></div>
                          <span class="o-dot" [class]="'o-dot ' + tone(session(a).health)"></span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-3 text-left">
                          <div><div class="text-label-sm o-muted">Theo dõi</div><b class="font-mono">{{ compact(c?.followers) }}</b></div>
                          <div><div class="text-label-sm o-muted">Ngách</div><span class="text-body-sm truncate block">{{ c?.nicheTag ?? '—' }}</span></div>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-2">
                          <span class="o-badge" [class]="'o-badge ' + tokenTone(c?.tokenStatus)">{{ tokenLabel(c?.tokenStatus) }}</span>
                          @if (c?.quotaBlocked) { <span class="o-badge warning">Ngoài hạn mức</span> }
                        </div>
                      </button>
                    }
                  </div>
                </section>
              }

              <!-- InstagramList -->
              @if (show('instagram') && igChannels().length) {
                <section class="o-card">
                  <div class="o-card-head"><span class="o-plat instagram">IG</span><div class="flex-1"><div class="o-card-title">Instagram Business</div><div class="o-card-sub">Liên kết qua Fanpage Facebook hoặc tài khoản riêng</div></div></div>
                  <ul class="px-2 pb-2">
                    @for (row of igChannels(); track row.c.id) {
                      <li class="o-list-item" [class.active]="selId() === row.a.id" (click)="select(row.a.id)">
                        <div class="o-avatar" style="width: 32px; height: 32px">{{ row.c.name.slice(0, 2).toUpperCase() }}</div>
                        <div class="min-w-0 flex-1"><div class="truncate font-semibold">{{ row.c.handle || row.c.name }}</div><div class="text-label-sm o-muted truncate">{{ row.c.name }} · qua {{ row.a.displayName }}</div></div>
                        <span class="font-mono text-body-sm">{{ compact(row.c.followers) }}</span>
                        <span class="o-badge" [class]="'o-badge ' + tokenTone(row.c.tokenStatus)">{{ tokenLabel(row.c.tokenStatus) }}</span>
                      </li>
                    }
                  </ul>
                </section>
              }

              <!-- YouTube -->
              @if (show('youtube') && byPlatform('youtube').length) {
                <section class="o-card">
                  <div class="o-card-head"><span class="o-plat youtube">YT</span><div class="flex-1"><div class="o-card-title">YouTube</div><div class="o-card-sub">Kênh đăng Shorts & video dài qua YouTube Data API</div></div></div>
                  <ul class="px-2 pb-2">
                    @for (a of byPlatform('youtube'); track a.id) {
                      @for (c of a.channels ?? []; track c.id) {
                        <li class="o-list-item" [class.active]="selId() === a.id" (click)="select(a.id)">
                          <div class="o-avatar" style="width: 32px; height: 32px; background: rgb(var(--c-brand-youtube) / 0.2)"><o-icon name="youtube" [size]="16" /></div>
                          <div class="min-w-0 flex-1"><div class="truncate font-semibold">{{ c.name }}</div><div class="text-label-sm o-muted truncate">{{ c.handle ?? a.displayName }}</div></div>
                          <span class="font-mono text-body-sm">{{ compact(c.followers) }} sub</span>
                          <span class="o-badge" [class]="'o-badge ' + tokenTone(c.tokenStatus)">{{ tokenLabel(c.tokenStatus) }}</span>
                        </li>
                      }
                    }
                  </ul>
                </section>
              }

              @if (!loading() && !visibleCount()) {
                <div class="o-card o-empty" style="padding: 48px">
                  <o-icon name="users" [size]="28" />
                  {{ accounts().length ? 'Không có tài khoản khớp bộ lọc.' : 'Chưa có tài khoản nào – kết nối Facebook / TikTok / YouTube hoặc thêm thủ công.' }}
                  <div class="flex gap-2 mt-2"><button class="o-btn o-btn-primary" (click)="openAdd()"><o-icon name="userplus" [size]="15" /> Thêm tài khoản</button><a class="o-btn" routerLink="/guide">Xem hướng dẫn kết nối</a></div>
                </div>
              }
            </div>

            <!-- AccountInspector -->
            <aside class="o-card inspector">
              @if (detail(); as a) {
                <div class="o-card-head">
                  <div class="o-avatar" style="width: 44px; height: 44px">{{ a.displayName.slice(0, 2).toUpperCase() }}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2"><span class="o-plat" [class]="'o-plat ' + a.platform">{{ meta(a.platform).short }}</span><span class="o-card-title truncate">{{ a.displayName }}</span></div>
                    <div class="o-card-sub">{{ a.handle ? at(a.handle) : 'UID: ' + (a.externalId ?? '—') }}</div>
                  </div>
                  <button class="o-icon-btn" (click)="selId.set(null)" aria-label="Đóng"><o-icon name="x" [size]="15" /></button>
                </div>
                <div class="flex flex-col gap-4 px-4 pb-4">
                  <div class="o-tile flex flex-col gap-2">
                    <div class="text-label-sm o-muted">Phiên đăng nhập</div>
                    <div class="flex items-center gap-2"><span class="o-dot" [class]="'o-dot ' + tone(session(a).health)"></span><b>{{ session(a).label }}</b></div>
                    @if (a.sessionExpiresAt) { <div class="text-label-sm o-muted">Hết hạn {{ rel(a.sessionExpiresAt) }} ({{ dt(a.sessionExpiresAt) }})</div> }
                    <div class="flex flex-wrap gap-1">
                      @if (a.twoFactorEnabled) { <span class="o-badge success"><o-icon name="shield" [size]="11" /> Đã bật 2FA</span> } @else { <span class="o-badge warning">Chưa bật 2FA</span> }
                      @if (a.note) { <span class="o-badge">{{ a.note }}</span> }
                    </div>
                  </div>

                  <div class="o-form-grid">
                    <label class="o-field"><span class="o-label">Không gian làm việc</span>
                      <select class="o-select" [ngModel]="a.workspaceId ?? ''" (ngModelChange)="patchAccount(a.id, { workspaceId: $event || null }, 'Đã chuyển không gian làm việc')">
                        <option value="">— Không thuộc Pocket —</option>
                        @for (w of shell.workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }
                      </select>
                    </label>
                    <label class="o-field"><span class="o-label">Proxy</span>
                      <select class="o-select" [ngModel]="a.proxyId ?? ''" (ngModelChange)="patchAccount(a.id, { proxyId: $event || null }, 'Đã đổi proxy')">
                        <option value="">— Không dùng proxy —</option>
                        @for (p of proxies(); track p.id) { <option [value]="p.id">{{ p.label }} · {{ p.country ?? '' }} {{ p.latencyMs != null ? p.latencyMs + 'ms' : '' }}</option> }
                      </select>
                    </label>
                  </div>
                  @if (a.browserProfile; as bp) {
                    <div class="o-tile text-body-sm flex flex-col gap-1">
                      <div class="flex items-center gap-2"><o-icon name="fingerprint" [size]="14" class="o-secondary" /><b>{{ bp.name }}</b></div>
                      <div class="o-muted truncate o-code">{{ bp.userAgent }}</div>
                      <div class="flex flex-wrap gap-1"><span class="o-badge">{{ bp.locale }}</span><span class="o-badge">{{ bp.timezone }}</span>@if (bp.canvasNoise) { <span class="o-badge success">Canvas noise</span> }@if (bp.webrtcShield) { <span class="o-badge success">WebRTC shield</span> }</div>
                    </div>
                  }
                  <div class="flex flex-wrap gap-2">
                    <button class="o-btn o-btn-sm" (click)="openEdit(a)"><o-icon name="edit" [size]="13" /> Sửa thông tin</button>
                    @if (a.platform === 'facebook') {
                      <button class="o-btn o-btn-sm" (click)="openAddPage(a)"><o-icon name="plus" [size]="13" /> Thêm Fanpage</button>
                      <button class="o-btn o-btn-sm" (click)="openImport(a)"><o-icon name="download" [size]="13" /> Nhập từ User token</button>
                      <button class="o-btn o-btn-sm" (click)="connect('facebook', a.id)"><o-icon name="refresh" [size]="13" /> Đăng nhập lại</button>
                    }
                    @if (a.platform === 'tiktok') { <button class="o-btn o-btn-sm" (click)="connect('tiktok', a.id)"><o-icon name="refresh" [size]="13" /> Kết nối lại TikTok</button> }
                    @if (a.platform === 'youtube') { <button class="o-btn o-btn-sm" (click)="connect('youtube', a.id)"><o-icon name="refresh" [size]="13" /> Kết nối lại YouTube</button> }
                  </div>

                  <div class="o-divider"></div>
                  <div class="flex items-center justify-between"><span class="o-label">Kênh / Trang ({{ (a.channels ?? []).length }})</span></div>
                  @for (c of a.channels ?? []; track c.id) {
                    <div class="o-tile flex flex-col gap-2">
                      <div class="flex items-center gap-2">
                        <span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span>
                        <span class="flex-1 min-w-0 truncate font-semibold">{{ c.name }}</span>
                        <span class="o-dot" [class]="'o-dot ' + tone(c.health)"></span>
                      </div>
                      <div class="flex flex-wrap gap-1 text-label-sm">
                        <span class="o-badge" [class]="'o-badge ' + tokenTone(c.tokenStatus)">{{ tokenLabel(c.tokenStatus) }}</span>
                        @if (c.tokenExpiresAt) { <span class="o-badge">Token hết hạn {{ rel(c.tokenExpiresAt) }}</span> }
                        @if (c.role) { <span class="o-badge">{{ roleLabel(c.role) }}</span> }
                        @if (c.quotaBlocked) { <span class="o-badge warning">Ngoài hạn mức</span> }
                        <span class="o-badge mono">{{ compact(c.followers) }} theo dõi</span>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <button class="o-btn o-btn-sm" (click)="openConnect(c)"><o-icon name="key" [size]="12" /> {{ c.tokenStatus === 'valid' ? 'Đổi token' : 'Kết nối API' }}</button>
                        @if (c.tokenStatus && c.tokenStatus !== 'missing') {
                          <button class="o-btn o-btn-sm o-btn-subtle" (click)="verify(c)" [disabled]="busyId() === c.id"><o-icon name="checkcheck" [size]="12" /> Kiểm tra</button>
                          <button class="o-btn o-btn-sm o-btn-subtle" (click)="disconnect(c)"><o-icon name="link" [size]="12" /> Ngắt API</button>
                        }
                        <button class="o-btn o-btn-sm o-btn-subtle o-error" (click)="deleteChannel(c)"><o-icon name="trash" [size]="12" /></button>
                      </div>
                    </div>
                  } @empty { <div class="text-body-sm o-muted">Chưa có kênh nào kết nối API.</div> }

                  @if (activity().length) {
                    <div class="o-divider"></div>
                    <div class="o-label">Hoạt động gần đây</div>
                    @for (e of activity(); track e.id) { <div class="text-body-sm"><span class="o-faint">{{ rel(e.createdAt) }} · </span>{{ e.message }}</div> }
                  }
                  <div class="o-divider"></div>
                  <button class="o-btn o-btn-danger" (click)="deleteAccount(a)"><o-icon name="trash" [size]="14" /> Xóa tài khoản</button>
                </div>
              } @else {
                <div class="o-empty" style="padding: 48px 16px"><o-icon name="users" [size]="26" />Chọn một tài khoản để xem phiên đăng nhập, token và kết nối đăng bài.</div>
              }
            </aside>
          </div>
        }

        @case ('proxies') {
          <section class="o-card">
            <div class="o-card-head">
              <div class="o-card-ico"><o-icon name="globe" [size]="16" /></div>
              <div class="flex-1"><div class="o-card-title">Proxy</div><div class="o-card-sub">Mỗi tài khoản đi qua một IP cố định để tránh liên kết dàn kênh</div></div>
              <button class="o-btn o-btn-primary o-btn-sm" (click)="openProxy()"><o-icon name="plus" [size]="13" /> Thêm proxy</button>
            </div>
            <div class="px-4 pb-4">
              <div class="o-table-wrap">
                <table class="o-table">
                  <thead><tr><th>Nhãn</th><th>Giao thức</th><th>Máy chủ</th><th>Quốc gia</th><th>Loại</th><th>IP ra</th><th class="text-right">Độ trễ</th><th>Tình trạng</th><th>Dùng bởi</th><th></th></tr></thead>
                  <tbody>
                    @for (p of proxies(); track p.id) {
                      <tr>
                        <td class="font-semibold">{{ p.label }}</td>
                        <td><span class="o-badge mono">{{ p.protocol }}</span></td>
                        <td class="o-code">{{ p.host }}:{{ p.port }}</td>
                        <td>{{ p.country ?? '—' }}</td>
                        <td>{{ p.kind ?? '—' }}</td>
                        <td class="o-code">{{ p.exitIp ?? '—' }}</td>
                        <td class="text-right font-mono" [class.o-warning]="p.latencyMs > 350">{{ p.latencyMs != null ? p.latencyMs + 'ms' : '—' }}</td>
                        <td><span class="flex items-center gap-1.5"><span class="o-dot" [class]="'o-dot ' + tone(p.health)"></span>{{ p.health ?? 'chưa kiểm tra' }}</span></td>
                        <td>{{ proxyUsage(p.id) }} tài khoản</td>
                        <td class="text-right"><button class="o-icon-btn" (click)="deleteProxy(p)" aria-label="Xóa proxy"><o-icon name="trash" [size]="14" /></button></td>
                      </tr>
                    } @empty { <tr><td colspan="10"><div class="o-empty">Chưa có proxy</div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        }

        @case ('profiles') {
          <section class="o-card">
            <div class="o-card-head">
              <div class="o-card-ico"><o-icon name="fingerprint" [size]="16" /></div>
              <div class="flex-1"><div class="o-card-title">Browser Profile (chống phát hiện)</div><div class="o-card-sub">Mỗi Pocket có profile riêng: User-Agent, ngôn ngữ, múi giờ, nhiễu Canvas, chặn WebRTC</div></div>
            </div>
            <div class="grid gap-3 px-4 pb-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
              @for (bp of profiles(); track bp.id) {
                <div class="o-tile flex flex-col gap-2">
                  <div class="flex items-center gap-2"><o-icon name="fingerprint" [size]="15" class="o-secondary" /><b class="flex-1 truncate">{{ bp.name }}</b><span class="o-badge">{{ wsName(bp.workspaceId) }}</span></div>
                  <div class="o-code o-muted" style="word-break: break-all">{{ bp.userAgent }}</div>
                  <div class="flex flex-wrap gap-1"><span class="o-badge">{{ bp.locale }}</span><span class="o-badge">{{ bp.timezone }}</span>@if (bp.webglVendor) { <span class="o-badge">{{ bp.webglVendor }}</span> }</div>
                  <div class="flex flex-wrap gap-1"><span class="o-badge" [class.success]="bp.canvasNoise">Canvas noise {{ bp.canvasNoise ? 'bật' : 'tắt' }}</span><span class="o-badge" [class.success]="bp.webrtcShield">WebRTC shield {{ bp.webrtcShield ? 'bật' : 'tắt' }}</span></div>
                  @if (bp.workspaceId) { <button class="o-btn o-btn-sm o-btn-subtle self-start" (click)="toggleNoise(bp)">{{ bp.canvasNoise ? 'Tắt' : 'Bật' }} nhiễu Canvas cho cả Pocket</button> }
                </div>
              } @empty { <div class="o-empty" style="grid-column: 1 / -1">Chưa có Browser Profile – profile được tạo tự động khi tạo Pocket.</div> }
            </div>
          </section>
        }
      }
    </div>

    <!-- AddAccountDialog -->
    <o-modal [open]="addOpen()" [title]="editId() ? 'Sửa tài khoản' : 'Thêm tài khoản'" subtitle="TikTok / Instagram / YouTube tự tạo kênh tương ứng. Facebook (VIA): thêm Fanpage sau khi tạo." (closed)="addOpen.set(false)">
      @if (!editId()) {
        <div class="o-seg">@for (p of ['facebook', 'tiktok', 'instagram', 'youtube']; track p) { <button [class.active]="acc.platform === p" (click)="acc.platform = p">{{ meta(p).label }}</button> }</div>
      }
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Tên hiển thị</span><input class="o-input" [(ngModel)]="acc.displayName" maxlength="120" /></label>
        <label class="o-field"><span class="o-label">Handle / username</span><input class="o-input" [(ngModel)]="acc.handle" maxlength="100" placeholder="không cần @" /></label>
        <label class="o-field"><span class="o-label">UID / ID ngoài</span><input class="o-input" [(ngModel)]="acc.externalId" maxlength="100" /></label>
        <label class="o-field"><span class="o-label">Không gian làm việc</span>
          <select class="o-select" [(ngModel)]="acc.workspaceId"><option value="">— Không thuộc Pocket —</option>@for (w of shell.workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select>
        </label>
        <label class="o-field"><span class="o-label">Proxy</span>
          <select class="o-select" [(ngModel)]="acc.proxyId"><option value="">— Không dùng —</option>@for (p of proxies(); track p.id) { <option [value]="p.id">{{ p.label }}</option> }</select>
        </label>
      </div>
      <label class="o-check"><input type="checkbox" [(ngModel)]="acc.twoFactorEnabled" /> Đã bật xác thực 2 lớp (2FA)</label>
      <label class="o-field"><span class="o-label">Ghi chú</span><textarea class="o-textarea" rows="2" [(ngModel)]="acc.note" maxlength="500"></textarea></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="addOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || !acc.displayName.trim()" (click)="saveAccount()">{{ editId() ? 'Lưu' : 'Thêm tài khoản' }}</button>
      </div>
    </o-modal>

    <!-- AddPageDialog -->
    <o-modal [open]="pageOpen()" title="Thêm Fanpage" [subtitle]="'Thuộc VIA: ' + (pageFor()?.displayName ?? '')" (closed)="pageOpen.set(false)">
      <label class="o-field"><span class="o-label">Tên Fanpage</span><input class="o-input" [(ngModel)]="pg.name" maxlength="160" /></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Page ID</span><input class="o-input" [(ngModel)]="pg.externalId" maxlength="100" /></label>
        <label class="o-field"><span class="o-label">Vai trò</span><select class="o-select" [(ngModel)]="pg.role">@for (r of roles; track r) { <option [value]="r">{{ roleLabel(r) }}</option> }</select></label>
        <label class="o-field"><span class="o-label">Ngách</span><input class="o-input" [(ngModel)]="pg.nicheTag" maxlength="60" placeholder="VD: Thời trang công sở" /></label>
      </div>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="pageOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || !pg.name.trim()" (click)="savePage()">Thêm Fanpage</button>
      </div>
    </o-modal>

    <!-- ImportFacebookDialog -->
    <o-modal [open]="importOpen()" title="Nhập Fanpage từ User token" subtitle="Tự tìm mọi Fanpage (+ Instagram Business liên kết) mà VIA quản lý" (closed)="importOpen.set(false)">
      <label class="o-field"><span class="o-label">User access token</span><textarea class="o-textarea o-code" rows="4" [(ngModel)]="imp.userToken" placeholder="EAAG…"></textarea><span class="o-hint">Token được mã hóa trong két, không bao giờ hiển thị lại.</span></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">App ID (tùy chọn – đổi token dài hạn)</span><input class="o-input" [(ngModel)]="imp.appId" /></label>
        <label class="o-field"><span class="o-label">App Secret (tùy chọn)</span><input class="o-input" type="password" [(ngModel)]="imp.appSecret" /></label>
      </div>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="importOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || imp.userToken.trim().length < 20" (click)="doImport()">Nhập Fanpage</button>
      </div>
    </o-modal>

    <!-- ConnectChannelDialog -->
    <o-modal [open]="!!connectFor()" title="Kết nối API đăng bài" [subtitle]="connectFor()?.name ?? ''" (closed)="connectFor.set(null)">
      <p class="text-body-sm o-muted">
        @switch (connectFor()?.platform) {
          @case ('tiktok') { Dán Access token TikTok (Content Posting API). Có thể kèm Refresh token và Client Key/Secret để tự gia hạn. }
          @case ('youtube') { Dán Access token / Refresh token Google (quyền youtube.upload). }
          @default { Dán Page token hoặc User token (FB, IG – tự tìm trang khớp). }
        }
      </p>
      <label class="o-field"><span class="o-label">Access token</span><textarea class="o-textarea o-code" rows="4" [(ngModel)]="tk.token"></textarea></label>
      @if (connectFor()?.platform !== 'facebook' && connectFor()?.platform !== 'instagram') {
        <label class="o-field"><span class="o-label">Refresh token (tùy chọn)</span><input class="o-input o-code" [(ngModel)]="tk.refreshToken" /></label>
        <div class="o-form-grid">
          <label class="o-field"><span class="o-label">Client Key</span><input class="o-input" [(ngModel)]="tk.clientKey" /></label>
          <label class="o-field"><span class="o-label">Client Secret</span><input class="o-input" type="password" [(ngModel)]="tk.clientSecret" /></label>
        </div>
      }
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="connectFor.set(null)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || tk.token.trim().length < 20" (click)="doConnect()">Kết nối</button>
      </div>
    </o-modal>

    <!-- Proxy dialog -->
    <o-modal [open]="proxyOpen()" title="Thêm proxy" (closed)="proxyOpen.set(false)">
      <label class="o-field"><span class="o-label">Dán nhanh (host:port:user:pass)</span><input class="o-input o-code" [(ngModel)]="px.quick" (ngModelChange)="parseQuick($event)" placeholder="103.14.129.44:9080:user:pass" /></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Nhãn</span><input class="o-input" [(ngModel)]="px.label" maxlength="80" /></label>
        <label class="o-field"><span class="o-label">Giao thức</span><select class="o-select" [(ngModel)]="px.protocol"><option value="socks5">SOCKS5</option><option value="http">HTTP</option><option value="https">HTTPS</option></select></label>
        <label class="o-field"><span class="o-label">Host</span><input class="o-input o-code" [(ngModel)]="px.host" /></label>
        <label class="o-field"><span class="o-label">Port</span><input class="o-input o-code" type="number" [(ngModel)]="px.port" /></label>
        <label class="o-field"><span class="o-label">Username</span><input class="o-input" [(ngModel)]="px.username" /></label>
        <label class="o-field"><span class="o-label">Password</span><input class="o-input" type="password" [(ngModel)]="px.password" /></label>
        <label class="o-field"><span class="o-label">Quốc gia</span><input class="o-input" [(ngModel)]="px.country" maxlength="8" placeholder="VN" /></label>
        <label class="o-field"><span class="o-label">Loại</span><select class="o-select" [(ngModel)]="px.kind"><option value="residential">Residential</option><option value="datacenter">Datacenter</option><option value="mobile">Mobile 4G</option><option value="isp">ISP</option></select></label>
        <label class="o-field"><span class="o-label">Pocket</span><select class="o-select" [(ngModel)]="px.workspaceId"><option value="">— Dùng chung —</option>@for (w of shell.workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select></label>
      </div>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="proxyOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || !px.label.trim() || !px.host.trim() || !px.port" (click)="saveProxy()">Thêm proxy</button>
      </div>
    </o-modal>
  `,
  styles: [
    `.layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
     @media (min-width: 1280px) { .layout { grid-template-columns: minmax(0, 1fr) 420px; } .inspector { position: sticky; top: 0; max-height: calc(100vh - 120px); overflow: auto; } }
     .tree .children { margin: 0 0 6px 34px; padding-left: 10px; border-left: 1px dashed rgb(var(--c-outline-variant) / 0.6); }
     @media (max-width: 640px) { .tree .children { margin-left: 14px; } }
     .tt { text-align: left; color: inherit; font: inherit; border: 1px solid transparent; cursor: pointer; padding: 12px; }
     .tt:hover { border-color: rgb(var(--c-overlay) / 0.1); }
     .tt.sel { border-color: rgb(var(--c-primary) / 0.5); }`,
  ],
})
export class AccountsPageComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly route = inject(ActivatedRoute);

  readonly roles = ['admin', 'editor', 'moderator', 'advertiser'];
  readonly view = signal<'accounts' | 'proxies' | 'profiles'>('accounts');
  readonly accounts = signal<DynamicEntity[]>([]);
  readonly proxies = signal<DynamicEntity[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<Filter>('all');
  readonly query = signal('');
  readonly selId = signal<string | null>(null);
  readonly detail = signal<DynamicEntity | null>(null);
  readonly activity = signal<DynamicEntity[]>([]);
  readonly expanded = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly connecting = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly addOpen = signal(false);
  readonly editId = signal<string | null>(null);
  readonly pageOpen = signal(false);
  readonly pageFor = signal<DynamicEntity | null>(null);
  readonly importOpen = signal(false);
  readonly importFor = signal<DynamicEntity | null>(null);
  readonly connectFor = signal<DynamicEntity | null>(null);
  readonly proxyOpen = signal(false);

  acc = { platform: 'facebook', displayName: '', handle: '', externalId: '', workspaceId: '', proxyId: '', twoFactorEnabled: false, note: '' };
  pg = { name: '', externalId: '', role: 'admin', nicheTag: '' };
  imp = { userToken: '', appId: '', appSecret: '' };
  tk = { token: '', refreshToken: '', clientKey: '', clientSecret: '' };
  px = { quick: '', label: '', protocol: 'socks5', host: '', port: 0 as number, username: '', password: '', country: '', kind: 'residential', workspaceId: '' };

  readonly compact = fmtCompact;
  readonly rel = fmtRelative;
  readonly dt = fmtDateTime;

  readonly channels = computed(() => this.accounts().flatMap((a): DynamicEntity[] => a.channels ?? []));
  readonly connectedPct = computed(() => {
    const ch = this.channels();
    return ch.length ? Math.round((ch.filter((c) => c.tokenStatus === 'valid').length / ch.length) * 1000) / 10 : 0;
  });
  readonly profiles = computed(() => {
    const m = new Map<string, DynamicEntity>();
    for (const a of this.accounts()) if (a.browserProfile) m.set(a.browserProfile.id, a.browserProfile);
    return [...m.values()];
  });

  private readonly attention = computed(() => this.accounts().filter((a) => this.needsAttention(a)));
  readonly chips = computed(() => {
    const all = this.accounts();
    const by = (p: string) => all.filter((a) => a.platform === p).length;
    const ig = this.channels().filter((c) => c.platform === 'instagram').length;
    return [
      { value: 'all' as Filter, label: 'Tất cả', count: all.length, dot: '' },
      { value: 'facebook' as Filter, label: 'Facebook VIA', count: by('facebook'), dot: '' },
      { value: 'tiktok' as Filter, label: 'TikTok', count: by('tiktok'), dot: '' },
      { value: 'instagram' as Filter, label: 'Instagram', count: by('instagram') + ig, dot: '' },
      { value: 'youtube' as Filter, label: 'YouTube', count: by('youtube'), dot: '' },
      { value: 'attention' as Filter, label: 'Cần chú ý', count: this.attention().length, dot: 'warning' },
    ];
  });

  private readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    let l = this.filter() === 'attention' ? this.attention() : this.accounts();
    if (q) l = l.filter((a) => [a.displayName, a.handle, a.externalId, ...(a.channels ?? []).map((c: DynamicEntity) => c.name + ' ' + (c.handle ?? ''))].join(' ').toLowerCase().includes(q));
    return l;
  });
  readonly fbAccounts = computed(() => this.filtered().filter((a) => a.platform === 'facebook'));
  readonly fbPages = computed(() => this.fbAccounts().reduce((s, a) => s + (a.channels ?? []).filter((c: DynamicEntity) => c.platform === 'facebook').length, 0));
  readonly igChannels = computed(() => this.filtered().flatMap((a) => (a.channels ?? []).filter((c: DynamicEntity) => c.platform === 'instagram').map((c: DynamicEntity) => ({ a, c }))));
  readonly visibleCount = computed(() => {
    const f = this.filter();
    const l = this.filtered();
    if (f === 'all' || f === 'attention') return l.length;
    if (f === 'instagram') return this.igChannels().length;
    return l.filter((a) => a.platform === f).length;
  });

  constructor() {
    effect(() => {
      this.api.activeWorkspaceId();
      this.shell.ver('workspace');
      this.shell.ver('accounts');
      void this.load();
    });
    this.route.queryParamMap.subscribe((q) => {
      if (q.get('add')) this.openAdd();
      const ch = q.get('channel');
      if (ch) this.pendingChannel = ch;
    });
  }
  private pendingChannel: string | null = null;

  show(p: string) {
    const f = this.filter();
    return f === 'all' || f === 'attention' || f === p;
  }
  byPlatform(p: string) {
    return this.filtered().filter((a) => a.platform === p);
  }
  at(h: string) {
    return '@' + String(h).replace(/^@+/, '');
  }
  meta(p: string) {
    return PLATFORM_META[p] ?? { label: p, short: (p ?? '?').slice(0, 2).toUpperCase() };
  }
  tone(h: string) {
    return healthTone(h === 'idle' ? null : h);
  }
  tokenTone(t?: string) {
    return t === 'valid' ? 'success' : t === 'expiring' ? 'warning' : t === 'expired' || t === 'invalid' ? 'danger' : '';
  }
  tokenLabel(t?: string) {
    return TOKEN_LABEL[t ?? 'missing'] ?? t ?? '';
  }
  roleLabel(r: string) {
    return ROLE_LABEL[r] ?? r;
  }
  session(a: DynamicEntity) {
    let st = a.sessionStatus ?? 'unknown';
    if (st === 'active' && a.sessionExpiresAt && new Date(a.sessionExpiresAt).getTime() - Date.now() < 3 * 86400000) st = 'expiring';
    return SESSION_LABEL[st] ?? { label: st, health: a.health ?? 'idle' };
  }
  needsAttention(a: DynamicEntity) {
    const s = this.session(a).health;
    return s === 'warn' || s === 'error' || a.health === 'warn' || a.health === 'error' || (a.channels ?? []).some((c: DynamicEntity) => c.tokenStatus !== 'valid' || c.health === 'error' || c.quotaBlocked);
  }
  proxyUsage(id: string) {
    return this.accounts().filter((a) => a.proxyId === id).length;
  }
  wsName(id: string) {
    return this.shell.workspaces().find((w) => w.id === id)?.name ?? 'Dùng chung';
  }

  async load() {
    const workspaceId = this.api.activeWorkspaceId();
    const [t, p] = await Promise.all([this.api.invokeRaw<DynamicEntity[]>('accounts.tree', { workspaceId }), this.api.invokeRaw<DynamicEntity[]>('proxies.list', { workspaceId })]);
    this.loading.set(false);
    if (!t.ok) return this.api.toast('Không tải được tài khoản', errOf(t), 'error');
    const list = asList<DynamicEntity>(t.data);
    this.accounts.set(list);
    this.proxies.set(asList<DynamicEntity>(p.ok ? p.data : []));
    if (this.expanded().size === 0) this.expanded.set(new Set(list.filter((a) => a.platform === 'facebook').slice(0, 3).map((a) => a.id)));
    if (this.pendingChannel) {
      const owner = list.find((a) => (a.channels ?? []).some((c: DynamicEntity) => c.id === this.pendingChannel));
      this.pendingChannel = null;
      if (owner) void this.select(owner.id);
    } else if (this.selId()) void this.select(this.selId()!);
  }

  async select(id: string) {
    this.selId.set(id);
    const local = this.accounts().find((a) => a.id === id);
    if (local) this.detail.set(local);
    const [d, act] = await Promise.all([this.api.invokeRaw<DynamicEntity>('accounts.get', { id }), this.api.invokeRaw<DynamicEntity[]>('activity.recent', { limit: 50 })]);
    if (this.selId() !== id) return;
    if (d.ok && d.data) this.detail.set({ ...(local ?? {}), ...d.data });
    const name = (this.detail()?.displayName ?? '').toLowerCase();
    this.activity.set(asList<DynamicEntity>(act.ok ? act.data : []).filter((e) => name && String(e.message ?? '').toLowerCase().includes(name)).slice(0, 5));
  }

  toggleExpand(id: string, e: Event) {
    e.stopPropagation();
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }

  async connect(platform: 'facebook' | 'tiktok' | 'youtube', accountId?: string) {
    this.connecting.set(true);
    const ep = platform === 'facebook' ? 'accounts.connectFacebook' : platform === 'tiktok' ? 'accounts.connectTiktok' : 'accounts.connectYoutube';
    const r = await this.api.invokeRaw<DynamicEntity>(ep, { accountId, workspaceId: this.api.activeWorkspaceId() });
    this.connecting.set(false);
    if (!r.ok) return this.api.toast(`Không kết nối được ${PLATFORM_META[platform].label}`, errOf(r), 'error');
    const url = r.data?.authUrl ?? r.data?.url;
    if (url) {
      window.open(url, '_blank', 'width=560,height=720');
      this.api.toast('Hoàn tất đăng nhập trong cửa sổ mới', 'Danh sách sẽ tự cập nhật khi kết nối xong', 'info');
    } else this.api.toast(`Đã kết nối ${PLATFORM_META[platform].label}`, r.data?.account?.displayName, 'success');
    this.shell.bump('accounts', 'channels', 'dashboard');
    void this.shell.loadWorkspaces();
    void this.shell.loadQuota();
  }

  openAdd() {
    this.editId.set(null);
    this.acc = { platform: 'facebook', displayName: '', handle: '', externalId: '', workspaceId: this.api.activeWorkspaceId() ?? '', proxyId: '', twoFactorEnabled: false, note: '' };
    this.addOpen.set(true);
  }

  openEdit(a: DynamicEntity) {
    this.editId.set(a.id);
    this.acc = { platform: a.platform, displayName: a.displayName ?? '', handle: a.handle ?? '', externalId: a.externalId ?? '', workspaceId: a.workspaceId ?? '', proxyId: a.proxyId ?? '', twoFactorEnabled: !!a.twoFactorEnabled, note: a.note ?? '' };
    this.addOpen.set(true);
  }

  async saveAccount() {
    this.saving.set(true);
    const body = {
      workspaceId: this.acc.workspaceId || null,
      displayName: this.acc.displayName.trim(),
      handle: this.acc.handle.replace(/^@/, '').trim() || null,
      externalId: this.acc.externalId.trim() || null,
      proxyId: this.acc.proxyId || null,
      twoFactorEnabled: this.acc.twoFactorEnabled,
      note: this.acc.note.trim() || null,
    };
    const id = this.editId();
    const r = id ? await this.api.invokeRaw<DynamicEntity>('accounts.update', { id, patch: body }) : await this.api.invokeRaw<DynamicEntity>('accounts.create', { ...body, platform: this.acc.platform });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không lưu được tài khoản', errOf(r), 'error');
    this.addOpen.set(false);
    this.api.toast(id ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản', body.displayName, 'success');
    await this.load();
    const newId = id ?? r.data?.id;
    if (newId) void this.select(newId);
    void this.shell.loadWorkspaces();
    void this.shell.loadQuota();
  }

  async patchAccount(id: string, patch: DynamicEntity, msg: string) {
    const r = await this.api.invokeRaw('accounts.update', { id, patch });
    if (!r.ok) return this.api.toast('Không cập nhật được', errOf(r), 'error');
    this.api.toast(msg, undefined, 'success');
    await this.load();
    void this.shell.loadWorkspaces();
  }

  async deleteAccount(a: DynamicEntity) {
    if (!confirm(`Xóa "${a.displayName}" cùng ${(a.channels ?? []).length} kênh, token và lịch đăng liên quan? Không thể hoàn tác.`)) return;
    const r = await this.api.invokeRaw('accounts.delete', { id: a.id });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.selId.set(null);
    this.detail.set(null);
    this.api.toast('Đã xóa tài khoản', a.displayName, 'success');
    await this.load();
    void this.shell.loadWorkspaces();
    void this.shell.loadQuota();
  }

  openAddPage(a: DynamicEntity) {
    this.pageFor.set(a);
    this.pg = { name: '', externalId: '', role: 'admin', nicheTag: '' };
    this.pageOpen.set(true);
  }

  async savePage() {
    this.saving.set(true);
    const r = await this.api.invokeRaw('channels.createPage', { accountId: this.pageFor()?.id, name: this.pg.name.trim(), externalId: this.pg.externalId.trim() || null, role: this.pg.role || null, nicheTag: this.pg.nicheTag.trim() || null });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không thêm được Fanpage', errOf(r), 'error');
    this.pageOpen.set(false);
    this.api.toast('Đã thêm Fanpage', this.pg.name, 'success');
    const pfId = this.pageFor()?.id;
    if (pfId) this.expanded.update((s) => new Set(s).add(pfId));
    await this.load();
    void this.shell.loadQuota();
  }

  openImport(a: DynamicEntity) {
    this.importFor.set(a);
    this.imp = { userToken: '', appId: '', appSecret: '' };
    this.importOpen.set(true);
  }

  async doImport() {
    this.saving.set(true);
    const r = await this.api.invokeRaw<DynamicEntity>('accounts.importFacebook', { accountId: this.importFor()?.id, userToken: this.imp.userToken.trim(), appId: this.imp.appId.trim() || null, appSecret: this.imp.appSecret.trim() || null });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không nhập được Fanpage', errOf(r), 'error');
    this.importOpen.set(false);
    const n = asList(r.data?.channels ?? r.data?.pages).length;
    this.api.toast('Đã nhập Fanpage', n ? `${n} trang / Instagram được cấp quyền` : undefined, 'success');
    await this.load();
    void this.shell.loadQuota();
  }

  openConnect(c: DynamicEntity) {
    this.tk = { token: '', refreshToken: '', clientKey: '', clientSecret: '' };
    this.connectFor.set(c);
  }

  async doConnect() {
    const c = this.connectFor();
    if (!c) return;
    this.saving.set(true);
    const r = await this.api.invokeRaw('channels.connect', { channelId: c.id, token: this.tk.token.trim(), refreshToken: this.tk.refreshToken.trim() || null, clientKey: this.tk.clientKey.trim() || null, clientSecret: this.tk.clientSecret.trim() || null });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Kết nối API thất bại', errOf(r), 'error');
    this.connectFor.set(null);
    this.api.toast('Đã kết nối API đăng bài', c.name, 'success');
    await this.load();
  }

  async verify(c: DynamicEntity) {
    this.busyId.set(c.id);
    const r = await this.api.invokeRaw<DynamicEntity>('channels.verify', { id: c.id });
    this.busyId.set(null);
    if (!r.ok) return this.api.toast('Token không dùng được', errOf(r), 'error');
    this.api.toast('Token hoạt động tốt', c.name, 'success');
    await this.load();
  }

  async disconnect(c: DynamicEntity) {
    if (!confirm(`Ngắt kết nối API của "${c.name}"? Lịch đăng của kênh sẽ tạm dừng.`)) return;
    const r = await this.api.invokeRaw('channels.disconnect', { id: c.id });
    if (!r.ok) return this.api.toast('Không ngắt được', errOf(r), 'error');
    this.api.toast('Đã ngắt kết nối API', c.name, 'success');
    await this.load();
  }

  async deleteChannel(c: DynamicEntity) {
    if (!confirm(`Xóa kênh "${c.name}" cùng lịch đăng & token liên quan?`)) return;
    const r = await this.api.invokeRaw('channels.delete', { id: c.id });
    if (!r.ok) return this.api.toast('Không xóa được kênh', errOf(r), 'error');
    this.api.toast('Đã xóa kênh', c.name, 'success');
    await this.load();
    void this.shell.loadQuota();
    void this.shell.loadWorkspaces();
  }

  openProxy() {
    this.px = { quick: '', label: '', protocol: 'socks5', host: '', port: 0, username: '', password: '', country: 'VN', kind: 'residential', workspaceId: this.api.activeWorkspaceId() ?? '' };
    this.proxyOpen.set(true);
  }

  parseQuick(v: string) {
    const m = v.trim().replace(/^(socks5|https?):\/\//, '').split(':');
    if (m.length >= 2) {
      this.px.host = m[0];
      this.px.port = +m[1] || 0;
      this.px.username = m[2] ?? '';
      this.px.password = m[3] ?? '';
      if (!this.px.label) this.px.label = `${this.px.country || 'PX'}-${m[0].split('.').slice(-1)[0]}`;
    }
  }

  async saveProxy() {
    this.saving.set(true);
    const r = await this.api.invokeRaw('proxies.create', {
      workspaceId: this.px.workspaceId || null,
      label: this.px.label.trim(),
      protocol: this.px.protocol,
      host: this.px.host.trim(),
      port: +this.px.port,
      username: this.px.username || null,
      password: this.px.password || undefined,
      country: this.px.country || null,
      kind: this.px.kind || null,
    });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không thêm được proxy', errOf(r), 'error');
    this.proxyOpen.set(false);
    this.api.toast('Đã thêm proxy', this.px.label, 'success');
    await this.load();
  }

  async deleteProxy(p: DynamicEntity) {
    const used = this.proxyUsage(p.id);
    if (!confirm(`Xóa proxy "${p.label}"?${used ? ` ${used} tài khoản đang dùng sẽ chuyển sang không dùng proxy.` : ''}`)) return;
    const r = await this.api.invokeRaw('proxies.delete', { id: p.id });
    if (!r.ok) return this.api.toast('Không xóa được proxy', errOf(r), 'error');
    this.api.toast('Đã xóa proxy', p.label, 'success');
    await this.load();
  }

  async toggleNoise(bp: DynamicEntity) {
    const r = await this.api.invokeRaw('workspaces.setCanvasNoise', { id: bp.workspaceId, enabled: !bp.canvasNoise });
    if (!r.ok) return this.api.toast('Không đổi được', errOf(r), 'error');
    this.api.toast('Đã cập nhật nhiễu Canvas', this.wsName(bp.workspaceId), 'success');
    await this.load();
  }
}
