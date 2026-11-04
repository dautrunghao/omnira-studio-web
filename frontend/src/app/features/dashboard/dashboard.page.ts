import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { ChartSeries, LineChartComponent } from '../../shared/line-chart.component';
import { PLATFORM_META, PLATFORM_ORDER, asList, errOf, fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtRelative, fmtSignedPct } from '../../shared/util';
import { QuotaBarComponent } from '../../layout/quota-bar.component';

interface Summary {
  channels: { total: number; addedThisWeek: number; byPlatform: Record<string, number> };
  health: { score: number; ok: number; warn: number; error: number };
  posts: { publishedThisMonth: number; successRate: number | null; queued: number; failedThisMonth: number };
  reach: {
    views30d: number;
    viewsChangePct: number | null;
    engagements30d: number;
    series: { day: string; byPlatform: Record<string, number> }[];
    platforms: { platform: string; views?: number; views30d?: number; changePct?: number | null; followers?: number }[];
  };
}

interface Slot {
  start: string;
  end: string;
  weight: number;
}

const SEV_ICON: Record<string, string> = { error: 'alert', warn: 'alert', info: 'info' };

/** Chuẩn hóa summary – chịu được backend trả thiếu trường. */
function normSummary(s: any): Summary | null {
  if (!s) return null;
  const byP = s.channels?.byPlatform ?? {};
  return {
    channels: { total: s.channels?.total ?? 0, addedThisWeek: s.channels?.addedThisWeek ?? 0, byPlatform: { facebook: 0, tiktok: 0, instagram: 0, youtube: 0, ...byP } },
    health: { score: s.health?.score ?? 100, ok: s.health?.ok ?? 0, warn: s.health?.warn ?? 0, error: s.health?.error ?? 0 },
    posts: { publishedThisMonth: s.posts?.publishedThisMonth ?? 0, successRate: s.posts?.successRate ?? null, queued: s.posts?.queued ?? 0, failedThisMonth: s.posts?.failedThisMonth ?? 0 },
    reach: {
      views30d: s.reach?.views30d ?? 0,
      viewsChangePct: s.reach?.viewsChangePct ?? null,
      engagements30d: s.reach?.engagements30d ?? 0,
      series: asList(s.reach?.series),
      platforms: asList(s.reach?.platforms),
    },
  };
}

/** Daemon: chấp nhận shape gốc { render, publish, autoReply } hoặc { publisher, inboxSync }. */
function normDaemon(d: any) {
  if (!d) return null;
  return {
    render: d.render ?? { running: d.renderer?.running ?? 0, queued: d.renderer?.queued ?? 0, current: d.renderer?.current ?? null },
    publish: d.publish ?? { next24h: d.publisher?.queued ?? 0, nextAt: d.publisher?.nextRunAt ?? null, nextChannels: d.publisher?.nextChannels ?? [] },
    autoReply: d.autoReply ?? { enabledRules: d.inboxSync?.rules ?? 0, repliedToday: d.inboxSync?.repliedToday ?? 0, pendingDrafts: d.inboxSync?.pendingDrafts ?? 0 },
  };
}

function mergeSlots(workspaces: any[]): Slot[] {
  const m = new Map<string, Slot & { w: number }>();
  let total = 0;
  for (const w of workspaces) {
    const n = Math.max(1, w.channelCount ?? 1);
    total += n;
    for (const s of w.goldenHours ?? []) {
      const k = `${s.start}-${s.end}`;
      const cur = m.get(k) ?? { start: s.start, end: s.end, weight: 0, w: 0 };
      cur.w += s.weight * n;
      m.set(k, cur);
    }
  }
  return [...m.values()].map((s) => ({ start: s.start, end: s.end, weight: total ? s.w / total : 0 })).sort((a, b) => a.start.localeCompare(b.start));
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [IconComponent, LineChartComponent, RouterLink, QuotaBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <!-- PageHeader -->
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="dashboard" [size]="20" /></div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="o-page-title">Trung tâm Điều hành Hệ thống</h1>
            @if (s(); as x) {
              <span class="o-badge pill mono" [class.success]="x.health.score >= 90" [class.warning]="x.health.score >= 70 && x.health.score < 90" [class.danger]="x.health.score < 70">{{ pct(x.health.score) }} Tối ưu</span>
            }
          </div>
          <p class="o-page-desc">{{ s() ? 'Giám sát tự động ' + s()!.channels.total + ' kênh mạng xã hội và luồng AI Video Renderer' : 'Đang tải số liệu…' }}</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn" [disabled]="syncing()" (click)="runSync()" [title]="lastSync() ? 'Lần cuối: ' + dt(lastSync().at) + ' · tự đồng bộ mỗi 6 giờ' : 'Lấy lượt xem, tương tác, người theo dõi thật từ Facebook / Instagram / TikTok'">
            <o-icon [name]="syncing() ? 'loader' : 'refresh'" [size]="16" [class.o-spin]="syncing()" class="o-secondary" /> Đồng bộ số liệu
          </button>
          <a class="o-btn o-btn-primary" routerLink="/studio"><o-icon name="sparkles" [size]="16" /> Tạo video AI</a>
        </div>
      </div>

      @if (error()) { <div class="o-banner danger"><o-icon name="alert" [size]="15" class="o-error" />{{ error() }}</div> }
      <omni-quota-bar />

      <!-- KPI -->
      <div class="o-grid-kpi">
        <div class="o-card kpi">
          <div class="kpi-top"><span class="o-label">Tổng kênh quản lý</span>@if (s()?.channels?.addedThisWeek) { <span class="o-badge success pill">+{{ s()!.channels.addedThisWeek }} tuần này</span> }</div>
          <div class="kpi-val">{{ s() ? int(s()!.channels.total) : '–' }} <span class="kpi-unit">Kênh</span></div>
          @if (s(); as x) {
            <div class="flex flex-wrap gap-1">
              @for (p of platforms; track p) { <span class="o-plat" [class]="'o-plat ' + p">{{ x.channels.byPlatform[p] ?? 0 }} {{ meta(p).short }}</span> }
            </div>
          }
        </div>
        <div class="o-card kpi">
          <div class="kpi-top"><span class="o-label">Chỉ số an toàn dàn</span>@if (s() && s()!.health.warn + s()!.health.error > 0) { <span class="o-badge danger pill">{{ s()!.health.warn + s()!.health.error }} Lưu ý</span> }</div>
          <div class="kpi-val o-tertiary">{{ s() ? pct(s()!.health.score) : '–' }} <span class="kpi-unit">An toàn</span></div>
          @if (s(); as x) {
            <div class="flex flex-col gap-1.5">
              <div class="o-progress tertiary"><div [style.width.%]="x.health.score"></div></div>
              <div class="flex justify-between text-label-sm"><span class="o-tertiary">{{ x.health.ok }} Xanh</span><span class="o-warning">{{ x.health.warn }} Cảnh báo</span><span class="o-error">{{ x.health.error }} Lỗi</span></div>
            </div>
          }
        </div>
        <div class="o-card kpi">
          <div class="kpi-top"><span class="o-label">Bài đăng tháng này</span>@if (s()?.posts?.successRate != null) { <span class="o-badge secondary mono">{{ pct(s()!.posts.successRate) }} Success</span> }</div>
          <div class="kpi-val">{{ s() ? int(s()!.posts.publishedThisMonth) : '–' }} <span class="kpi-unit">Video / Bài</span></div>
          @if (s(); as x) { <div class="text-body-sm o-muted">Hàng chờ: {{ x.posts.queued }} bài · Lỗi: {{ x.posts.failedThisMonth }}</div> }
        </div>
        <div class="o-card kpi">
          <div class="kpi-top"><span class="o-label">Lượt xem & tiếp cận</span>@if (s()?.reach?.viewsChangePct != null) { <span class="o-badge pill" [class.success]="s()!.reach.viewsChangePct! >= 0" [class.danger]="s()!.reach.viewsChangePct! < 0">{{ spct(s()!.reach.viewsChangePct) }}</span> }</div>
          <div class="kpi-val">{{ s() ? compact(s()!.reach.views30d) : '–' }} <span class="kpi-unit">Lượt xem / 30 ngày</span></div>
          @if (s(); as x) { <div class="text-body-sm o-muted">Tương tác: {{ compact(x.reach.engagements30d) }}</div> }
        </div>
      </div>

      <!-- ReachCard + GoldenHours -->
      <div class="o-two">
        <section class="o-card flex flex-col">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="activity" [size]="16" /></div>
            <div class="flex-1 min-w-0"><div class="o-card-title">Lưu lượng View {{ range() }} ngày</div><div class="o-card-sub">Lượt xem theo nền tảng: Facebook, TikTok, Instagram & YouTube</div></div>
            <div class="o-seg" role="radiogroup" aria-label="Khoảng thời gian">
              @for (r of ['30', '14', '7']; track r) { <button [class.active]="range() === r" (click)="range.set(r)">{{ r }} ngày</button> }
            </div>
            <button class="o-icon-btn" [class.active]="table()" [title]="table() ? 'Xem biểu đồ' : 'Xem bảng số liệu'" (click)="table.set(!table())"><o-icon name="table" [size]="16" /></button>
          </div>
          <div class="mx-4 rounded-xl p-2" style="background: rgb(var(--c-surface-container-lowest))">
            @if (s()) {
              <o-line-chart [xLabels]="chart().x" [series]="chart().series" [height]="250" [showTable]="table()" ariaLabel="Lượt xem theo nền tảng" />
            } @else { <div class="o-skel" style="height: 250px"></div> }
          </div>
          <div class="grid gap-2 p-4" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))">
            @for (p of platforms; track p) {
              @let r = platformRow(p);
              <div class="o-tile flex items-center gap-2">
                <span class="o-swatch" [style.background]="meta(p).series"></span>
                <div class="min-w-0 flex-1">
                  <div class="text-label-sm o-muted">{{ meta(p).label }}</div>
                  <div class="font-mono font-semibold">{{ compact(r?.views ?? r?.views30d) }}</div>
                </div>
                @if (r?.changePct != null) { <span class="text-label-sm font-mono" [class.o-tertiary]="r!.changePct! >= 0" [class.o-error]="r!.changePct! < 0">{{ spct(r!.changePct) }}</span> }
              </div>
            }
          </div>
        </section>

        <section class="o-card flex flex-col">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="clock" [size]="16" /></div>
            <div class="flex-1 min-w-0"><div class="o-card-title">Giờ vàng Đăng bài</div><div class="o-card-sub">{{ activeWs() ? 'Cấu hình của Pocket “' + activeWs()!.name + '”' : 'Tổng hợp các Pocket (trọng số theo số kênh)' }}</div></div>
            <span class="o-badge success">Tự động giãn</span>
          </div>
          <div class="mx-4 flex-1 rounded-xl p-2" style="background: rgb(var(--c-surface-container-lowest))">
            <div class="gh-row text-label-sm o-faint"><span>Khung giờ</span><span>Mật độ tương tác</span><span class="text-right">Tỷ trọng</span></div>
            @for (sl of slots(); track sl.start + sl.end) {
              <div class="gh-row" [class.hot]="hot().has(sl.start)">
                <span class="flex items-center gap-1.5 font-mono text-body-sm"><span class="o-dot" [class.success]="hot().has(sl.start)"></span>{{ sl.start }}–{{ sl.end }}</span>
                <div class="o-progress" [class.tertiary]="hot().has(sl.start)"><div [style.width.%]="(sl.weight / maxW()) * 100"></div></div>
                <span class="text-right font-mono text-body-sm">{{ pct(sl.weight * 100) }}</span>
              </div>
            } @empty { <p class="px-2 py-4 text-body-sm o-muted">Chưa cấu hình khung giờ vàng.</p> }
            <div class="day-strip mt-3" aria-hidden="true">
              @for (h of hours; track h) { <div class="hcell" [style.opacity]="0.15 + hourWeight(h) * 0.85" [title]="h + ':00'"></div> }
            </div>
            <div class="flex justify-between text-label-sm o-faint mt-1 font-mono"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
          </div>
          <div class="p-4 flex gap-2">
            <button class="o-btn o-btn-sm o-btn-subtle" (click)="router.navigate(['/workspaces'])">Chỉnh giờ vàng <o-icon name="arrowright" [size]="13" /></button>
            <button class="o-btn o-btn-sm o-btn-subtle" (click)="router.navigate(['/analytics'])">Giờ vàng học từ số liệu <o-icon name="arrowright" [size]="13" /></button>
          </div>
        </section>
      </div>

      <!-- TopChannels + Alerts -->
      <div class="o-two wide-r">
        <section class="o-card flex flex-col">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="award" [size]="16" /></div>
            <div class="flex-1 min-w-0"><div class="o-card-title">Top Kênh Tăng Trưởng Mạnh Nhất</div><div class="o-card-sub">Lượng người theo dõi tăng trong 7 ngày qua</div></div>
            <a class="o-btn o-btn-sm o-btn-subtle" routerLink="/accounts">Tất cả kênh <o-icon name="arrowright" [size]="13" /></a>
          </div>
          <ul class="flex flex-col gap-2 px-4 pb-4">
            @if (top() === null) { @for (i of [0, 1, 2]; track i) { <li class="o-skel" style="height: 56px"></li> } }
            @for (c of top() ?? []; track c.id ?? c.channelId) {
              <li class="o-tile flex items-center gap-3">
                <div class="o-avatar" style="width: 40px; height: 40px">@if (c.avatarUrl) { <img [src]="c.avatarUrl" alt="" /> } @else { {{ (c.name || '?').slice(0, 2).toUpperCase() }} }</div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2"><span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span><span class="truncate text-label-md">{{ c.handle ? (c.handle.startsWith('@') ? c.handle : '@' + c.handle) : c.name }}</span></div>
                  <div class="mt-0.5 truncate o-code o-muted">{{ c.platform === 'facebook' ? 'ID: ' + (c.externalId ?? '—') : c.name }}</div>
                </div>
                <div class="text-right">
                  @if ((c.growth ?? c.followersGained ?? c.delta) != null) {
                    <div class="font-mono text-headline-sm o-tertiary">+{{ compact(c.growth ?? c.followersGained ?? c.delta) }}</div>
                  } @else {
                    <div class="font-mono text-headline-sm o-tertiary">{{ compact(c.views30d) }}</div>
                  }
                  <div class="text-label-sm o-muted">{{ compact(c.followers) }} người theo dõi</div>
                </div>
              </li>
            }
            @if (top()?.length === 0) { <li class="text-body-sm o-muted">Chưa có số liệu kênh.</li> }
          </ul>
        </section>

        <section class="o-card flex flex-col">
          <div class="o-card-head">
            <div class="o-card-ico" style="background: rgb(var(--c-warning) / 0.14); color: rgb(var(--c-warning))"><o-icon name="alert" [size]="16" /></div>
            <div class="flex-1 min-w-0"><div class="o-card-title">Cảnh báo cần xử lý</div><div class="o-card-sub">Proxy, phiên đăng nhập, token, hạn mức và lỗi đăng bài</div></div>
            @if (alerts().length) { <span class="o-badge danger pill">{{ alerts().length }} Ưu tiên cao</span> }
          </div>
          <ul class="flex flex-col gap-2 px-4 pb-4 o-scroll" style="max-height: 360px">
            @for (a of alerts(); track a.id) {
              <li class="o-tile flex items-start gap-3">
                <o-icon [name]="sevIcon(a.severity)" [size]="16" [class.o-error]="a.severity === 'error'" [class.o-warning]="a.severity === 'warn'" [class.o-secondary]="a.severity === 'info'" />
                <div class="min-w-0 flex-1">
                  <div class="text-label-md font-semibold">{{ a.title }}</div>
                  @if (a.message) { <p class="text-body-sm o-muted">{{ a.message }}</p> }
                  <div class="text-label-sm o-faint mt-1">{{ rel(a.createdAt) }}</div>
                </div>
                <button class="o-btn o-btn-sm o-btn-subtle" (click)="resolve(a.id)" title="Đánh dấu đã xử lý"><o-icon name="check" [size]="13" /> Xử lý</button>
              </li>
            } @empty {
              <li class="o-empty"><o-icon name="checkcheck" [size]="22" class="o-tertiary" />Mọi thứ đang ổn định – không có cảnh báo.</li>
            }
          </ul>
        </section>
      </div>

      <!-- DaemonPanel -->
      <section class="o-card">
        <div class="o-card-head">
          <div class="o-card-ico"><o-icon name="workflow" [size]="16" /></div>
          <div class="flex-1 min-w-0"><div class="o-card-title">Luồng Tự Động Hóa Chạy Ngầm (Automation Daemon)</div><div class="o-card-sub">Render video, đăng bài theo lịch và tự động trả lời</div></div>
          <span class="o-badge pill" [class.success]="daemonActive()"><span class="o-dot" [class.success]="daemonActive()" [class.live]="daemonActive()"></span> {{ daemonActive() ? 'Có tác vụ' : 'Rảnh' }}</span>
        </div>
        @let d = daemon();
        <div class="grid gap-3 px-4 pb-4" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
          <div class="o-tile lane">
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-label-md"><o-icon name="clapperboard" [size]="15" class="o-primary" /> Xưởng AI Video</span><span class="o-badge secondary mono">{{ d?.render?.current?.encoder ?? 'Encoder: chưa dò' }}</span></div>
            <div class="font-semibold">{{ d ? (d.render?.running ? 'Đang render ' + d.render.running + ' video' : 'Không có video đang render') : '…' }}</div>
            @if (d?.render?.current; as cur) {
              <p class="truncate text-body-sm o-muted">Kịch bản: “{{ cur.topic }}”</p>
              <div class="o-progress"><div [style.width.%]="(cur.progress <= 1 ? cur.progress * 100 : cur.progress)"></div></div>
            } @else { <p class="text-body-sm o-muted">Hàng chờ: {{ d?.render?.queued ?? 0 }} video</p> }
          </div>
          <div class="o-tile lane">
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-label-md"><o-icon name="calendar" [size]="15" class="o-secondary" /> Hàng chờ lên lịch</span>@if (d?.publish?.nextAt) { <span class="o-badge secondary mono">{{ rel(d.publish.nextAt) }}</span> }</div>
            <div class="font-semibold">{{ d ? (d.publish?.next24h ?? 0) + ' bài trong 24 giờ tới' : '…' }}</div>
            <p class="truncate text-body-sm o-muted">{{ d?.publish?.nextChannels?.length ? 'Kênh: ' + d.publish.nextChannels.join(', ') : 'Chưa có bài nào sắp đăng' }}</p>
          </div>
          <div class="o-tile lane">
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-label-md"><o-icon name="bot" [size]="15" class="o-tertiary" /> Tự động trả lời</span><span class="o-badge mono">{{ d?.autoReply?.enabledRules ?? 0 }} quy tắc</span></div>
            <div class="font-semibold">{{ d ? (d.autoReply?.repliedToday ?? d.autoReply?.sentToday ?? 0) + ' phản hồi hôm nay' : '…' }}</div>
            <p class="truncate text-body-sm o-muted">{{ d?.autoReply?.pendingDrafts ? d.autoReply.pendingDrafts + ' bản nháp AI chờ duyệt' : 'Không có bản nháp chờ duyệt' }}</p>
          </div>
        </div>
      </section>

      <!-- Activity feed -->
      <section class="o-card">
        <div class="o-card-head">
          <div class="o-card-ico"><o-icon name="logs" [size]="16" /></div>
          <div class="flex-1 min-w-0"><div class="o-card-title">Nhật ký hoạt động</div><div class="o-card-sub">Sự kiện gần nhất của hệ thống tự động hóa</div></div>
          <div class="o-seg">
            @for (f of activityFilters; track f.v) { <button [class.active]="actFilter() === f.v" (click)="actFilter.set(f.v)">{{ f.l }}</button> }
          </div>
        </div>
        <ul class="flex flex-col px-4 pb-4">
          @for (a of activityShown(); track a.id) {
            <li class="act">
              <span class="o-dot" [class.warning]="a.level === 'warn'" [class.danger]="a.level === 'error'" [class.success]="a.level === 'info'"></span>
              <span class="o-badge mono">{{ a.scope }}</span>
              <span class="flex-1 min-w-0 text-body-sm">{{ a.message }}</span>
              <span class="text-label-sm o-faint whitespace-nowrap">{{ rel(a.createdAt) }}</span>
            </li>
          } @empty { <li class="o-empty">Chưa có hoạt động</li> }
        </ul>
      </section>
    </div>
  `,
  styles: [
    `.kpi { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
     .kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; }
     .kpi-val { font-size: 1.75rem; line-height: 2.1rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
     .kpi-unit { font-size: .75rem; font-weight: 500; color: rgb(var(--c-on-surface-variant)); letter-spacing: 0; }
     .gh-row { display: grid; grid-template-columns: 1fr 1.4fr auto; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 8px; }
     .gh-row.hot { background: rgb(var(--c-success) / 0.07); }
     .day-strip { display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; }
     .hcell { height: 18px; border-radius: 3px; background: rgb(var(--c-tertiary)); }
     .lane { display: flex; flex-direction: column; gap: 8px; padding: 14px; }
     .act { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid rgb(var(--c-overlay) / 0.04); }
     .act:first-child { border-top: 0; }`,
  ],
})
export class DashboardPageComponent {
  private readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  readonly router = inject(Router);

  readonly platforms = PLATFORM_ORDER;
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly activityFilters = [
    { v: 'all', l: 'Tất cả' },
    { v: 'warn', l: 'Cảnh báo' },
    { v: 'error', l: 'Lỗi' },
  ];

  readonly s = signal<Summary | null>(null);
  readonly error = signal<string | null>(null);
  readonly alerts = signal<any[]>([]);
  readonly top = signal<any[] | null>(null);
  readonly daemon = signal<any>(null);
  readonly lastSync = signal<any>(null);
  readonly activity = signal<any[]>([]);
  readonly syncing = signal(false);
  readonly range = signal('30');
  readonly table = signal(false);
  readonly actFilter = signal('all');

  readonly int = fmtInt;
  readonly pct = (n: any) => fmtPct(n);
  readonly spct = fmtSignedPct;
  readonly compact = fmtCompact;
  readonly rel = fmtRelative;
  readonly dt = fmtDateTime;

  readonly activeWs = computed(() => this.shell.activeWorkspace());
  readonly slots = computed<Slot[]>(() => {
    const a = this.activeWs();
    return a ? [...(a['goldenHours'] ?? [])].sort((x: Slot, y: Slot) => x.start.localeCompare(y.start)) : mergeSlots(this.shell.workspaces());
  });
  readonly maxW = computed(() => Math.max(0.01, ...this.slots().map((s) => s.weight)));
  readonly hot = computed(() => new Set([...this.slots()].sort((a, b) => b.weight - a.weight).slice(0, 2).map((s) => s.start)));

  readonly chart = computed(() => {
    const pts = (this.s()?.reach.series ?? []).slice(-Number(this.range()));
    const series: ChartSeries[] = PLATFORM_ORDER.map((p) => ({ key: p, label: PLATFORM_META[p].label, color: PLATFORM_META[p].series, values: pts.map((d) => d.byPlatform?.[p] ?? 0) }));
    return { x: pts.map((p) => p.day), series };
  });

  readonly daemonActive = computed(() => {
    const d = this.daemon();
    return d ? (d.render?.running ?? 0) + (d.publish?.next24h ?? 0) + (d.autoReply?.enabledRules ?? 0) > 0 : false;
  });

  readonly activityShown = computed(() => {
    const f = this.actFilter();
    return this.activity().filter((a) => f === 'all' || a.level === f).slice(0, 20);
  });

  constructor() {
    effect(() => {
      // tải lại khi đổi workspace hoặc có invalidate
      this.api.activeWorkspaceId();
      this.shell.ver('workspace');
      this.shell.ver('dashboard');
      void this.load();
    });
  }

  meta(p: string) {
    return PLATFORM_META[p] ?? { label: p, short: (p ?? '?').slice(0, 2).toUpperCase(), color: '', series: 'rgb(var(--c-outline))' };
  }
  platformRow(p: string) {
    return this.s()?.reach.platforms.find((x) => x.platform === p) ?? null;
  }
  hourWeight(h: number) {
    const hh = String(h).padStart(2, '0') + ':30';
    const slot = this.slots().find((s) => s.start <= hh && hh < s.end);
    return slot ? slot.weight / this.maxW() : 0;
  }
  sevIcon(s: string) {
    return SEV_ICON[s] ?? 'info';
  }

  async load() {
    const workspaceId = this.api.activeWorkspaceId();
    const [sum, al, top, dm, ls, act] = await Promise.all([
      this.api.invokeRaw('dashboard.summary', { workspaceId }),
      this.api.invokeRaw('alerts.open'),
      this.api.invokeRaw('dashboard.topChannels', { workspaceId, limit: 3 }),
      this.api.invokeRaw('dashboard.daemon', { workspaceId }),
      this.api.invokeRaw('insights.last'),
      this.api.invokeRaw('activity.recent', { limit: 40 }),
    ]);
    if (sum.ok) {
      this.s.set(normSummary(sum.data));
      this.error.set(null);
    } else this.error.set(errOf(sum));
    this.alerts.set(asList(al.ok ? al.data : []));
    this.top.set(top.ok ? asList(top.data) : []);
    this.daemon.set(dm.ok ? normDaemon(dm.data) : null);
    this.lastSync.set(ls.ok ? ls.data : null);
    this.activity.set(asList(act.ok ? act.data : []));
  }

  async runSync() {
    this.syncing.set(true);
    const r = await this.api.invokeRaw<any>('insights.sync');
    this.syncing.set(false);
    if (!r.ok) return this.api.toast('Đồng bộ thất bại', errOf(r), 'error');
    const d = r.data ?? {};
    const errors: string[] = d.errors ?? [];
    if (!d.channels && !errors.length) this.api.toast('Chưa có kênh nào kết nối API', 'Vào Tài khoản & Kênh → Kết nối Facebook', 'info');
    else this.api.toast(`Đã đồng bộ số liệu ${d.channels ?? 0} kênh`, undefined, 'success');
    for (const e of [...errors, ...(d.notes ?? [])].slice(0, 3)) this.api.toast('Lưu ý đồng bộ', e, 'warn');
    this.shell.bump('dashboard', 'accounts', 'channels', 'analytics');
  }

  async resolve(id: string) {
    const r = await this.api.invokeRaw('alerts.resolve', { id });
    if (!r.ok) return this.api.toast('Không xử lý được cảnh báo', errOf(r), 'error');
    this.alerts.update((l) => l.filter((a) => a.id !== id));
    void this.shell.loadBadges();
  }
}
