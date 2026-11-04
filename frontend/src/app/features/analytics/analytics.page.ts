import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { ChartSeries, LineChartComponent } from '../../shared/line-chart.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, PLATFORM_ORDER, asList, errOf, fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtRelative, fmtSignedPct } from '../../shared/util';

const GOAL_METRICS: { v: string; l: string; unit: string; hint: string }[] = [
  { v: 'followers', l: 'Người theo dõi', unit: 'người', hint: 'Số người theo dõi hiện tại của kênh' },
  { v: 'watch_minutes_60d', l: 'Phút xem 60 ngày', unit: 'phút', hint: 'Tổng phút xem video 60 ngày gần nhất (Facebook)' },
  { v: 'views_30d', l: 'Lượt xem 30 ngày', unit: 'lượt', hint: 'Tổng lượt xem/tiếp cận 30 ngày gần nhất' },
  { v: 'videos_30d', l: 'Video đăng 30 ngày', unit: 'video', hint: 'Số video/Reels đã đăng qua app trong 30 ngày' },
  { v: 'engagements_30d', l: 'Tương tác 30 ngày', unit: 'lượt', hint: 'Tổng tương tác 30 ngày gần nhất' },
];

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [IconComponent, LineChartComponent, ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="chart" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Phân tích</h1>
          <p class="o-page-desc">Hiệu quả bài đã đăng theo định dạng, độ dài và kênh · mục tiêu kênh · khung giờ tốt nhất học từ số liệu thật</p>
        </div>
        <div class="o-page-actions">
          <select class="o-select" style="width: 240px" [ngModel]="channelId()" (ngModelChange)="channelId.set($event || null)">
            <option [ngValue]="null">Mọi kênh</option>
            @for (c of channels(); track c.id) { <option [value]="c.id">{{ meta(c.platform).short }} · {{ c.name }}</option> }
          </select>
          <div class="o-seg">@for (d of [30, 60, 90]; track d) { <button [class.active]="days() === d" (click)="days.set(d)">{{ d }} ngày</button> }</div>
          <button class="o-btn" [disabled]="syncing()" (click)="sync()"><o-icon name="refresh" [size]="15" [class.o-spin]="syncing()" /> Đồng bộ số liệu</button>
        </div>
      </div>
      @if (lastSync(); as l) { <p class="text-label-sm o-faint">Số liệu Insights đồng bộ lần cuối {{ rel(l.at) }} · tự đồng bộ mỗi 6 giờ</p> }

      <!-- Tổng quan -->
      <div class="o-grid-kpi">
        <div class="o-card kpi"><span class="o-label">Lượt xem / tiếp cận</span><div class="kv">{{ compact(ov()?.totalViews ?? summary()?.reach?.views30d) }}</div><span class="text-body-sm o-muted">{{ days() }} ngày @if (summary()?.reach?.viewsChangePct != null && days() === 30) { · <span [class.o-tertiary]="summary().reach.viewsChangePct >= 0" [class.o-error]="summary().reach.viewsChangePct < 0">{{ spct(summary().reach.viewsChangePct) }}</span> }</span></div>
        <div class="o-card kpi"><span class="o-label">Tương tác</span><div class="kv">{{ compact(ov()?.totalEngagements ?? summary()?.reach?.engagements30d) }}</div><span class="text-body-sm o-muted">Tỷ lệ {{ engRate() }}</span></div>
        <div class="o-card kpi"><span class="o-label">Người theo dõi</span><div class="kv">{{ compact(followers()) }}</div><span class="text-body-sm o-muted">{{ channels().length }} kênh</span></div>
        <div class="o-card kpi"><span class="o-label">Bài đã đăng</span><div class="kv">{{ int(ov()?.posts) }}</div><span class="text-body-sm o-muted">{{ ov()?.postsWithMetrics ?? 0 }} bài có số liệu @if (ov()?.avgRetention != null) { · giữ chân TB {{ pct(ov().avgRetention) }} }</span></div>
      </div>

      <!-- Biểu đồ theo kênh -->
      <section class="o-card">
        <div class="o-card-head">
          <div class="o-card-ico"><o-icon name="activity" [size]="16" /></div>
          <div class="flex-1"><div class="o-card-title">Lượt xem theo nền tảng</div><div class="o-card-sub">Facebook, TikTok, Instagram & YouTube – {{ seriesDays() }} ngày gần nhất</div></div>
          <div class="o-seg">
            <button [class.active]="metric() === 'views'" (click)="metric.set('views')">Lượt xem</button>
            <button [class.active]="metric() === 'engagements'" (click)="metric.set('engagements')">Tương tác</button>
          </div>
          <button class="o-icon-btn" [class.active]="table()" (click)="table.set(!table())" title="Bảng số liệu"><o-icon name="table" [size]="16" /></button>
        </div>
        <div class="mx-4 mb-4 rounded-xl p-2" style="background: rgb(var(--c-surface-container-lowest))">
          @if (summary()) { <o-line-chart [xLabels]="chart().x" [series]="chart().series" [height]="260" [showTable]="table()" ariaLabel="Lượt xem theo nền tảng" /> } @else { <div class="o-skel" style="height: 260px"></div> }
        </div>
      </section>

      <div class="o-two even">
        <!-- Theo định dạng -->
        <section class="o-card">
          <div class="o-card-head"><div class="o-card-ico"><o-icon name="grid" [size]="16" /></div><div class="flex-1"><div class="o-card-title">Hiệu quả theo định dạng</div><div class="o-card-sub">Sắp theo tương tác trung bình mỗi bài</div></div></div>
          <div class="px-4 pb-4">@for (g of ov()?.byFormat ?? []; track g.key) {
            <div class="bar-row"><span class="truncate text-body-sm">{{ g.label }} <span class="o-faint">({{ g.posts }})</span></span>
              <div class="o-progress tertiary"><div [style.width.%]="barPct(g.avgEngagements, maxFmt())"></div></div>
              <span class="font-mono text-body-sm text-right">{{ compact(g.avgEngagements) }}</span></div>
          } @empty { <div class="o-empty">Chưa đủ bài có số liệu.</div> }</div>
        </section>
        <!-- Theo độ dài -->
        <section class="o-card">
          <div class="o-card-head"><div class="o-card-ico"><o-icon name="clock" [size]="16" /></div><div class="flex-1"><div class="o-card-title">Hiệu quả theo độ dài video</div><div class="o-card-sub">Lượt xem & tỷ lệ giữ chân trung bình</div></div></div>
          <div class="px-4 pb-4">@for (g of ov()?.byLength ?? []; track g.key) {
            <div class="bar-row"><span class="truncate text-body-sm">{{ g.label }} <span class="o-faint">({{ g.posts }})</span></span>
              <div class="o-progress"><div [style.width.%]="barPct(g.avgViews, maxLen())"></div></div>
              <span class="font-mono text-body-sm text-right">{{ compact(g.avgViews) }} @if (g.avgRetention != null) { · {{ pct(g.avgRetention) }} }</span></div>
          } @empty { <div class="o-empty">Chưa có video có số liệu thời lượng.</div> }</div>
        </section>
      </div>

      <div class="o-two even">
        <!-- Khung giờ tốt nhất -->
        <section class="o-card">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="star" [size]="16" /></div>
            <div class="flex-1"><div class="o-card-title">Khung giờ tốt nhất</div><div class="o-card-sub">Học từ bài đã đăng 90 ngày (tương tác so với trung bình kênh)</div></div>
            @if (best()?.suggested?.length && shell.activeWorkspace()) { <button class="o-btn o-btn-sm" (click)="applyHours()"><o-icon name="check" [size]="13" /> Áp dụng làm giờ vàng</button> }
          </div>
          <div class="px-4 pb-4 flex flex-col gap-3">
            @if (best(); as b) {
              @if ((b.posts ?? 0) < (b.minPosts ?? 0)) { <div class="o-banner warning text-body-sm"><o-icon name="info" [size]="14" class="o-warning" />Cần ít nhất {{ b.minPosts }} bài đã đăng có số liệu (hiện có {{ b.posts }}) để học khung giờ.</div> }
              <div class="hours">@for (h of b.byHour ?? []; track h.hour) { <div class="hb" [style.height.%]="10 + barPct(h.score, maxHour()) * 0.9" [class.top]="isTop(h.hour)" [title]="h.hour + ':00 · ' + h.posts + ' bài · điểm ' + h.score"></div> }</div>
              <div class="flex justify-between text-label-sm o-faint font-mono"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
              @if (b.suggested?.length) {
                <div class="flex flex-wrap gap-2">@for (s of b.suggested; track s.start) { <span class="o-badge success mono">{{ s.start }}–{{ s.end }} · {{ pct(s.weight * 100) }}</span> }</div>
              }
            } @else { <div class="o-skel" style="height: 140px"></div> }
          </div>
        </section>

        <!-- Mục tiêu kênh -->
        <section class="o-card">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="target" [size]="16" /></div>
            <div class="flex-1"><div class="o-card-title">Mục tiêu kênh</div><div class="o-card-sub">Theo dõi tiến độ đạt mốc của từng kênh</div></div>
            <button class="o-btn o-btn-sm o-btn-primary" (click)="openGoal(null)"><o-icon name="plus" [size]="13" /> Thêm mục tiêu</button>
          </div>
          <div class="px-4 pb-4 flex flex-col gap-2">
            @for (g of goals(); track g.id) {
              <div class="o-tile flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <span class="o-plat" [class]="'o-plat ' + g.platform">{{ meta(g.platform).short }}</span>
                  <span class="flex-1 min-w-0 truncate font-semibold text-body-sm">{{ g.label || g.metricLabel || metricLabel(g.metric) }}</span>
                  <button class="o-icon-btn" style="width: 24px; height: 24px" (click)="openGoal(g)" aria-label="Sửa"><o-icon name="edit" [size]="12" /></button>
                  <button class="o-icon-btn" style="width: 24px; height: 24px" (click)="deleteGoal(g)" aria-label="Xóa"><o-icon name="trash" [size]="12" /></button>
                </div>
                <div class="text-label-sm o-muted">{{ g.channelName ?? channelName(g.channelId) }} · {{ g.metricLabel || metricLabel(g.metric) }}</div>
                <div class="o-progress" [class.tertiary]="progress(g) >= 100"><div [style.width.%]="progress(g)"></div></div>
                <div class="flex justify-between text-label-sm"><span class="font-mono">{{ int(g.current) }} / {{ int(g.target) }}</span><b [class.o-tertiary]="progress(g) >= 100">{{ pct(progress(g)) }}</b></div>
              </div>
            } @empty { <div class="o-empty">Chưa có mục tiêu – VD: “Mốc 200K người theo dõi”.</div> }
          </div>
        </section>
      </div>

      <!-- Top / bottom -->
      <div class="o-two even">
        @for (blk of [{ k: 'top', t: 'Bài hiệu quả nhất', i: 'award' }, { k: 'bottom', t: 'Bài kém nhất', i: 'alert' }]; track blk.k) {
          <section class="o-card">
            <div class="o-card-head"><div class="o-card-ico"><o-icon [name]="blk.i" [size]="16" /></div><div class="flex-1"><div class="o-card-title">{{ blk.t }}</div><div class="o-card-sub">Theo tương tác · {{ days() }} ngày</div></div></div>
            <div class="px-4 pb-4">
              <div class="o-table-wrap">
                <table class="o-table">
                  <thead><tr><th>Bài</th><th>Kênh</th><th class="text-right">Xem</th><th class="text-right">Tương tác</th><th class="text-right">Giữ chân</th></tr></thead>
                  <tbody>
                    @for (p of postsOf(blk.k); track p.id) {
                      <tr>
                        <td style="max-width: 260px"><div class="truncate font-semibold">@if (p.permalink) { <a [href]="p.permalink" target="_blank" rel="noopener" class="o-primary">{{ p.title }}</a> } @else { {{ p.title }} }</div><div class="text-label-sm o-faint">{{ p.formatLabel }} · {{ dt(p.publishedAt) }}</div></td>
                        <td class="whitespace-nowrap"><span class="o-plat" [class]="'o-plat ' + p.platform">{{ meta(p.platform).short }}</span> <span class="text-body-sm">{{ p.channelName }}</span></td>
                        <td class="text-right font-mono">{{ compact(p.views ?? p.reach) }}</td>
                        <td class="text-right font-mono">{{ compact(p.engagements) }}</td>
                        <td class="text-right font-mono">{{ p.retention != null ? pct(p.retention) : '—' }}</td>
                      </tr>
                    } @empty { <tr><td colspan="5"><div class="o-empty">Chưa có bài có số liệu</div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        }
      </div>

      <!-- Bảng kênh -->
      <section class="o-card">
        <div class="o-card-head"><div class="o-card-ico"><o-icon name="users" [size]="16" /></div><div class="flex-1"><div class="o-card-title">Hiệu quả theo kênh</div><div class="o-card-sub">30 ngày gần nhất</div></div></div>
        <div class="px-4 pb-4">
          <div class="o-table-wrap">
            <table class="o-table">
              <thead><tr><th>Kênh</th><th class="text-right">Người theo dõi</th><th class="text-right">Lượt xem 30 ngày</th><th class="text-right">Tương tác</th><th class="text-right">Tỷ lệ</th><th></th></tr></thead>
              <tbody>
                @for (c of channelRows(); track c.id) {
                  <tr [class.selected]="channelId() === c.id">
                    <td><span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span> <b>{{ c.name }}</b></td>
                    <td class="text-right font-mono">{{ compact(c.followers) }}</td>
                    <td class="text-right font-mono">{{ compact(c.views30d) }}</td>
                    <td class="text-right font-mono">{{ compact(c.engagements30d) }}</td>
                    <td class="text-right font-mono">{{ c.engagementRate != null ? pct(c.engagementRate, 1) : '—' }}</td>
                    <td class="text-right"><button class="o-btn o-btn-sm o-btn-subtle" (click)="channelId.set(c.id)">Xem</button></td>
                  </tr>
                } @empty { <tr><td colspan="6"><div class="o-empty">Chưa có số liệu kênh</div></td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- GoalDialog -->
    <o-modal [open]="goalOpen()" [title]="goal.id ? 'Sửa mục tiêu' : 'Thêm mục tiêu kênh'" (closed)="goalOpen.set(false)">
      <label class="o-field"><span class="o-label">Kênh</span><select class="o-select" [(ngModel)]="goal.channelId"><option value="">— Chọn kênh —</option>@for (c of channels(); track c.id) { <option [value]="c.id">{{ meta(c.platform).short }} · {{ c.name }}</option> }</select></label>
      <label class="o-field"><span class="o-label">Chỉ số</span><select class="o-select" [(ngModel)]="goal.metric">@for (m of metrics; track m.v) { <option [value]="m.v">{{ m.l }}</option> }</select><span class="o-hint">{{ metricHint(goal.metric) }}</span></label>
      <label class="o-field"><span class="o-label">Mục tiêu ({{ metricUnit(goal.metric) }})</span><input class="o-input" type="number" min="1" [(ngModel)]="goal.target" /></label>
      <label class="o-field"><span class="o-label">Nhãn (tùy chọn)</span><input class="o-input" [(ngModel)]="goal.label" maxlength="120" placeholder="VD: Mốc 200K người theo dõi" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="goalOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !goal.channelId || !(goal.target > 0)" (click)="saveGoal()">Lưu</button>
      </div>
    </o-modal>
  `,
  styles: [
    `.kpi { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
     .kv { font-size: 1.75rem; line-height: 2.1rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
     .bar-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 6px 0; }
     .hours { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; align-items: end; height: 120px; }
     .hb { background: rgb(var(--c-secondary) / 0.45); border-radius: 4px 4px 0 0; min-height: 4px; }
     .hb.top { background: rgb(var(--c-tertiary)); }`,
  ],
})
export class AnalyticsPageComponent {
  private readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly router = inject(Router);
  readonly metrics = GOAL_METRICS;

  readonly days = signal<30 | 60 | 90>(30);
  readonly channelId = signal<string | null>(null);
  readonly metric = signal<'views' | 'engagements'>('views');
  readonly table = signal(false);
  readonly ov = signal<any>(null);
  readonly summary = signal<any>(null);
  readonly best = signal<any>(null);
  readonly goals = signal<any[]>([]);
  readonly channels = signal<any[]>([]);
  readonly top = signal<any[]>([]);
  readonly lastSync = signal<any>(null);
  readonly syncing = signal(false);
  readonly busy = signal(false);
  readonly goalOpen = signal(false);
  goal: any = { id: undefined, channelId: '', metric: 'followers', target: 10000, label: '' };

  readonly compact = fmtCompact;
  readonly int = fmtInt;
  readonly pct = (n: any, d = 0) => fmtPct(n, d);
  readonly spct = fmtSignedPct;
  readonly rel = fmtRelative;
  readonly dt = fmtDateTime;

  readonly followers = computed(() => {
    const id = this.channelId();
    return this.channels().filter((c) => !id || c.id === id).reduce((s, c) => s + (c.followers ?? 0), 0);
  });
  readonly engRate = computed(() => {
    const v = this.ov()?.totalViews ?? this.summary()?.reach?.views30d;
    const e = this.ov()?.totalEngagements ?? this.summary()?.reach?.engagements30d;
    return v ? fmtPct((e / v) * 100, 1) : '—';
  });
  readonly seriesDays = computed(() => asList(this.summary()?.reach?.series).length);
  readonly chart = computed(() => {
    const pts = asList<any>(this.summary()?.reach?.series);
    const key = this.metric();
    const series: ChartSeries[] =
      key === 'views'
        ? PLATFORM_ORDER.map((p) => ({ key: p, label: PLATFORM_META[p].label, color: PLATFORM_META[p].series, values: pts.map((d) => d.byPlatform?.[p] ?? 0) }))
        : [{ key: 'eng', label: 'Tương tác', color: 'rgb(var(--c-tertiary))', values: pts.map((d) => d.engagements ?? 0) }];
    return { x: pts.map((p) => p.day), series };
  });
  readonly maxFmt = computed(() => Math.max(1, ...asList<any>(this.ov()?.byFormat).map((g) => g.avgEngagements ?? 0)));
  readonly maxLen = computed(() => Math.max(1, ...asList<any>(this.ov()?.byLength).map((g) => g.avgViews ?? 0)));
  readonly maxHour = computed(() => Math.max(0.01, ...asList<any>(this.best()?.byHour).map((h) => h.score ?? 0)));
  private readonly topHours = computed(() => new Set(asList<any>(this.best()?.byHour).filter((h) => h.posts).sort((a, b) => b.score - a.score).slice(0, 3).map((h) => h.hour)));
  readonly channelRows = computed(() => {
    const m = new Map(this.top().map((t) => [t.id, t]));
    return this.channels().map((c) => ({ ...c, ...(m.get(c.id) ?? {}) })).sort((a, b) => (b.views30d ?? 0) - (a.views30d ?? 0));
  });

  constructor() {
    effect(() => {
      this.days();
      this.channelId();
      this.api.activeWorkspaceId();
      this.shell.ver('workspace');
      this.shell.ver('analytics');
      void this.load();
    });
  }

  meta(p: string) {
    return PLATFORM_META[p] ?? { short: '?', label: p };
  }
  barPct(v: number | null | undefined, max: number) {
    return v ? Math.min(100, (v / max) * 100) : 0;
  }
  isTop(h: number) {
    return this.topHours().has(h);
  }
  metricLabel(m: string) {
    return GOAL_METRICS.find((x) => x.v === m)?.l ?? m;
  }
  metricUnit(m: string) {
    return GOAL_METRICS.find((x) => x.v === m)?.unit ?? '';
  }
  metricHint(m: string) {
    return GOAL_METRICS.find((x) => x.v === m)?.hint ?? '';
  }
  channelName(id: string) {
    return this.channels().find((c) => c.id === id)?.name ?? '';
  }
  progress(g: any) {
    return g.progress ?? (g.target ? Math.min(100, Math.round(((g.current ?? 0) / g.target) * 1000) / 10) : 0);
  }
  postsOf(k: string): any[] {
    return asList(this.ov()?.[k]);
  }

  async load() {
    const workspaceId = this.api.activeWorkspaceId();
    const channelId = this.channelId();
    const [ov, sum, best, goals, ch, top, ls] = await Promise.all([
      this.api.invokeRaw('analytics.overview', { workspaceId, channelId, days: this.days() }),
      this.api.invokeRaw('dashboard.summary', { workspaceId }),
      this.api.invokeRaw('insights.bestHours', { workspaceId }),
      this.api.invokeRaw('analytics.goals', { workspaceId, channelId }),
      this.api.invokeRaw('channels.list', { workspaceId }),
      this.api.invokeRaw('dashboard.topChannels', { workspaceId, limit: 20 }),
      this.api.invokeRaw('insights.last'),
    ]);
    if (!ov.ok) this.api.toast('Không tải được phân tích', errOf(ov), 'error');
    this.ov.set(ov.ok ? ov.data : null);
    this.summary.set(sum.ok ? sum.data : null);
    this.best.set(best.ok ? best.data : null);
    this.goals.set(asList(goals.ok ? goals.data : []).map((x: any) => (x.goal ? { ...x.goal, ...x } : x)));
    this.channels.set(asList(ch.ok ? ch.data : []).map((x: any) => x.channel ?? x));
    this.top.set(asList(top.ok ? top.data : []));
    this.lastSync.set(ls.ok ? ls.data : null);
  }

  async sync() {
    this.syncing.set(true);
    const r = await this.api.invokeRaw<any>('insights.sync');
    this.syncing.set(false);
    if (!r.ok) return this.api.toast('Đồng bộ thất bại', errOf(r), 'error');
    this.api.toast(`Đã đồng bộ số liệu ${r.data?.channels ?? ''} kênh`, undefined, 'success');
    for (const e of asList<string>(r.data?.errors).slice(0, 3)) this.api.toast('Lưu ý đồng bộ', e, 'warn');
    this.shell.bump('dashboard');
    await this.load();
  }

  async applyHours() {
    const ws = this.shell.activeWorkspace();
    const sug = asList<any>(this.best()?.suggested);
    if (!ws || !sug.length) return;
    if (!confirm(`Thay khung giờ vàng của Pocket “${ws.name}” bằng ${sug.map((s) => s.start + '–' + s.end).join(', ')}?`)) return;
    const r = await this.api.invokeRaw('workspaces.update', { id: ws.id, patch: { goldenHours: sug.map((s) => ({ start: s.start, end: s.end, weight: s.weight })) } });
    if (!r.ok) return this.api.toast('Không áp dụng được', errOf(r), 'error');
    this.api.toast('Đã cập nhật giờ vàng', ws.name, 'success');
    void this.shell.loadWorkspaces();
    this.shell.bump('workspaces', 'dashboard');
  }

  openGoal(g: any) {
    this.goal = g ? { id: g.id, channelId: g.channelId, metric: g.metric, target: g.target, label: g.label ?? '' } : { id: undefined, channelId: this.channelId() ?? '', metric: 'followers', target: 10000, label: '' };
    this.goalOpen.set(true);
  }

  async saveGoal() {
    this.busy.set(true);
    const r = await this.api.invokeRaw('analytics.saveGoal', { id: this.goal.id, channelId: this.goal.channelId, metric: this.goal.metric, target: Math.round(+this.goal.target), label: this.goal.label?.trim() || null });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không lưu được mục tiêu', errOf(r), 'error');
    this.goalOpen.set(false);
    this.api.toast('Đã lưu mục tiêu', undefined, 'success');
    await this.load();
  }

  async deleteGoal(g: any) {
    if (!confirm('Xóa mục tiêu này?')) return;
    const r = await this.api.invokeRaw('analytics.deleteGoal', { id: g.id });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.goals.update((l) => l.filter((x) => x.id !== g.id));
  }
}
