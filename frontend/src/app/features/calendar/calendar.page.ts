import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, asList, dayKey, downloadText, errOf, fmtCompact, fmtDateTime, fmtRelative, fmtTime, toCsv, toDate, toLocalInput } from '../../shared/util';

interface PostRow {
  id: string;
  contentItemId: string;
  channelId: string;
  scheduledAt: number;
  status: string;
  isGoldenHour?: boolean;
  attempts?: number;
  publishedAt?: any;
  permalink?: string | null;
  error?: string | null;
  note?: string | null;
  views?: number | null;
  reach?: number | null;
  engagements?: number | null;
  earlyFlag?: string | null;
  title: string;
  kind?: string;
  channelName: string;
  platform: string;
  tokenStatus?: string;
  thumbnailPath?: string | null;
}

const STATUS: Record<string, { l: string; tone: string }> = {
  queued: { l: 'Chờ đăng', tone: 'primary' },
  publishing: { l: 'Đang đăng', tone: 'secondary' },
  published: { l: 'Đã đăng', tone: 'success' },
  failed: { l: 'Lỗi', tone: 'danger' },
  cancelled: { l: 'Đã hủy', tone: '' },
  canceled: { l: 'Đã hủy', tone: '' },
};
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function normRow(r: any): PostRow {
  const p = r.post ?? r;
  return {
    ...p,
    scheduledAt: toDate(p.scheduledAt)?.getTime() ?? 0,
    title: r.contentTitle ?? r.title ?? p.title ?? 'Bài đăng',
    kind: r.contentKind ?? r.kind ?? p.kind,
    channelName: r.channelName ?? p.channelName ?? 'Kênh',
    platform: r.platform ?? p.platform ?? 'facebook',
    tokenStatus: r.tokenStatus ?? p.tokenStatus,
    thumbnailPath: r.thumbnailPath ?? p.thumbnailPath ?? null,
  };
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="calendar" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Lịch đăng bài</h1>
          <p class="o-page-desc">{{ countBy('queued') }} bài chờ đăng · {{ countBy('published') }} đã đăng · {{ countBy('failed') }} lỗi trong khoảng đang xem</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn" (click)="exportCsv()"><o-icon name="download" [size]="15" /> Xuất CSV</button>
          <button class="o-btn" (click)="staggerOpen.set(true)"><o-icon name="settings" [size]="15" /> Giãn cách</button>
          <button class="o-btn" (click)="openAuto()"><o-icon name="zap" [size]="15" /> Tự xếp theo giờ vàng</button>
          <button class="o-btn o-btn-primary" (click)="openManual(null)"><o-icon name="plus" [size]="15" /> Lên lịch bài</button>
        </div>
      </div>

      <div class="o-banner" [class.warning]="worker() && !worker().enabled" [class.success]="worker()?.enabled">
        <span class="o-dot" [class.success]="worker()?.enabled" [class.live]="worker()?.running" [class.warning]="worker() && !worker().enabled"></span>
        <span class="flex-1">
          <b>Trình đăng bài tự động {{ worker()?.enabled ? 'đang bật' : 'đang tắt' }}</b>
          @if (worker()?.enabled) { · bài đến giờ sẽ tự đăng qua API chính thức @if (worker()?.nextAt) { · bài tiếp theo {{ rel(worker().nextAt) }} } } @else { · bài đến giờ sẽ chờ cho đến khi bật lại }
        </span>
        <button class="o-switch" [class.on]="worker()?.enabled" (click)="toggleWorker()" aria-label="Bật/tắt trình đăng bài"></button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="o-icon-btn" (click)="shift(-1)" aria-label="Trước"><o-icon name="chevronleft" [size]="16" /></button>
        <button class="o-btn o-btn-sm" (click)="goToday()">Hôm nay</button>
        <button class="o-icon-btn" (click)="shift(1)" aria-label="Sau"><o-icon name="chevronright" [size]="16" /></button>
        <b class="text-headline-sm ml-1">{{ rangeLabel() }}</b>
        <div class="flex gap-1 ml-3">
          @for (p of platformKeys; track p) { <button class="o-chip" [class.active]="platforms().has(p)" (click)="togglePlatform(p)"><span class="o-plat" [class]="'o-plat ' + p">{{ meta(p).short }}</span></button> }
        </div>
        <div class="o-seg ml-auto">
          <button [class.active]="mode() === 'week'" (click)="mode.set('week')">Tuần</button>
          <button [class.active]="mode() === 'month'" (click)="mode.set('month')">Tháng</button>
        </div>
      </div>

      <div class="layout">
        <!-- CalendarGrid -->
        <div class="min-w-0">
          @if (mode() === 'week') {
            <div class="week o-card o-scroll">
              <div class="wh"></div>
              @for (d of weekDays(); track d.key) { <div class="wh" [class.today]="d.key === todayKey"><span style="margin-right: 4px">{{ wd[$index] }}</span><b>{{ d.date.getDate() }}/{{ d.date.getMonth() + 1 }}</b></div> }
              @for (h of hours; track h) {
                <div class="hl font-mono">{{ pad(h) }}:00</div>
                @for (d of weekDays(); track d.key) {
                  <div class="cell" [class.gold]="isGolden(h)" [class.over]="over() === d.key + h" (dragover)="$event.preventDefault(); over.set(d.key + h)" (dragleave)="over.set(null)" (drop)="dropAt(d.date, h)" (dblclick)="openManual(slotTime(d.date, h))">
                    @for (p of cellPosts(d.key, h); track p.id) {
                      <div class="pc" [class]="'pc st-' + p.status" [draggable]="p.status === 'queued' || p.status === 'failed'" (dragstart)="dragId = p.id" (click)="sel.set(p)" [title]="p.title + ' · ' + p.channelName">
                        <span class="o-plat" [class]="'o-plat ' + p.platform">{{ meta(p.platform).short }}</span>
                        <span class="truncate">{{ time(p.scheduledAt) }} {{ p.title }}</span>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          } @else {
            <div class="month">
              @for (w of wd; track w) { <div class="mwd">{{ w }}</div> }
              @for (d of monthDays(); track d.key) {
                <div class="mday" [class.out]="!d.inMonth" [class.today]="d.key === todayKey" [class.over]="over() === d.key" (dragover)="$event.preventDefault(); over.set(d.key)" (dragleave)="over.set(null)" (drop)="dropAt(d.date, null)" (dblclick)="openManual(slotTime(d.date, 19))">
                  <div class="flex justify-between"><span class="dn">{{ d.date.getDate() }}</span>@if ((byDay().get(d.key) ?? []).length; as n) { <span class="o-badge mono">{{ n }}</span> }</div>
                  @for (p of (byDay().get(d.key) ?? []).slice(0, 4); track p.id) {
                    <div class="pc" [class]="'pc st-' + p.status" [draggable]="p.status === 'queued' || p.status === 'failed'" (dragstart)="dragId = p.id" (click)="sel.set(p)">
                      <span class="o-plat" [class]="'o-plat ' + p.platform">{{ meta(p.platform).short }}</span><span class="truncate">{{ time(p.scheduledAt) }} {{ p.title }}</span>
                    </div>
                  }
                  @if ((byDay().get(d.key) ?? []).length > 4) { <span class="text-label-sm o-muted">+{{ (byDay().get(d.key) ?? []).length - 4 }} bài</span> }
                </div>
              }
            </div>
          }
          <p class="text-label-sm o-faint mt-2">Ô vàng = khung giờ vàng của Pocket đang chọn. Kéo thả bài để dời lịch, nhấp đúp vào ô trống để lên lịch nhanh.</p>
        </div>

        <!-- QueueSidebar -->
        <aside class="o-card side">
          @if (sel(); as p) {
            <div class="o-card-head">
              <span class="o-plat" [class]="'o-plat ' + p.platform">{{ meta(p.platform).short }}</span>
              <div class="flex-1 min-w-0"><div class="o-card-title line2">{{ p.title }}</div><div class="o-card-sub">{{ p.channelName }}</div></div>
              <button class="o-icon-btn" (click)="sel.set(null)" aria-label="Đóng"><o-icon name="x" [size]="15" /></button>
            </div>
            <div class="flex flex-col gap-3 px-4 pb-4">
              <div class="flex flex-wrap gap-1">
                <span class="o-badge" [class]="'o-badge ' + st(p.status).tone">{{ st(p.status).l }}</span>
                @if (p.isGoldenHour) { <span class="o-badge warning">Giờ vàng</span> }
                @if (p.attempts) { <span class="o-badge">Thử {{ p.attempts }} lần</span> }
                @if (p.tokenStatus && p.tokenStatus !== 'valid') { <span class="o-badge danger">Kênh chưa kết nối API</span> }
                @if (p.earlyFlag) { <span class="o-badge" [class.success]="p.earlyFlag === 'hot'" [class.warning]="p.earlyFlag !== 'hot'">Early reach: {{ p.earlyFlag }}</span> }
              </div>
              <div class="text-body-sm"><span class="o-muted">Lịch:</span> <b>{{ dt(p.scheduledAt) }}</b> ({{ rel(p.scheduledAt) }})</div>
              @if (p.publishedAt) { <div class="text-body-sm"><span class="o-muted">Đã đăng:</span> {{ dt(p.publishedAt) }}</div> }
              @if (p.error) { <div class="o-banner danger text-body-sm"><o-icon name="alert" [size]="14" class="o-error" />{{ p.error }}</div> }
              @if (p.note) { <div class="text-body-sm o-muted">{{ p.note }}</div> }
              @if (p.status === 'published') {
                <div class="grid grid-cols-3 gap-2">
                  <div class="o-tile"><div class="text-label-sm o-muted">Lượt xem</div><b class="font-mono">{{ compact(p.views ?? p.reach) }}</b></div>
                  <div class="o-tile"><div class="text-label-sm o-muted">Tiếp cận</div><b class="font-mono">{{ compact(p.reach) }}</b></div>
                  <div class="o-tile"><div class="text-label-sm o-muted">Tương tác</div><b class="font-mono">{{ compact(p.engagements) }}</b></div>
                </div>
                @if (p.permalink) { <a class="o-btn o-btn-sm" [href]="p.permalink" target="_blank" rel="noopener"><o-icon name="external" [size]="13" /> Mở bài đã đăng</a> }
              }
              @if (p.status === 'queued' || p.status === 'failed') {
                <label class="o-field"><span class="o-label">Dời lịch</span><input class="o-input" type="datetime-local" [(ngModel)]="resched" (focus)="resched = resched || local(p.scheduledAt)" /></label>
                <div class="flex flex-wrap gap-2">
                  <button class="o-btn o-btn-sm" [disabled]="!resched || busy()" (click)="reschedule(p, resched)"><o-icon name="clock" [size]="13" /> Dời</button>
                  <button class="o-btn o-btn-sm o-btn-primary" [disabled]="busy()" (click)="publishNow(p)"><o-icon name="send" [size]="13" /> {{ p.status === 'failed' ? 'Thử lại ngay' : 'Đăng ngay' }}</button>
                  <button class="o-btn o-btn-sm o-btn-danger" [disabled]="busy()" (click)="cancel(p)"><o-icon name="x" [size]="13" /> Hủy lịch</button>
                </div>
              }
              <a class="o-btn o-btn-sm o-btn-subtle self-start" routerLink="/content" [queryParams]="{ id: p.contentItemId }"><o-icon name="folder" [size]="13" /> Mở nội dung</a>
            </div>
          } @else {
            <div class="o-card-head">
              <div class="o-card-ico"><o-icon name="clock" [size]="16" /></div>
              <div class="flex-1"><div class="o-card-title">Hàng đợi sắp đăng</div><div class="o-card-sub">{{ queue().length }} bài · theo thứ tự thời gian</div></div>
            </div>
            <ul class="flex flex-col gap-1 px-2 pb-3">
              @for (p of queue(); track p.id) {
                <li class="o-list-item" (click)="sel.set(p)">
                  <span class="o-plat" [class]="'o-plat ' + p.platform">{{ meta(p.platform).short }}</span>
                  <div class="min-w-0 flex-1"><div class="truncate text-body-sm font-semibold">{{ p.title }}</div><div class="text-label-sm o-muted truncate">{{ p.channelName }} · {{ dt(p.scheduledAt) }}</div></div>
                  @if (p.isGoldenHour) { <o-icon name="star" [size]="13" class="o-warning" /> }
                </li>
              } @empty { <li class="o-empty">Không có bài nào đang chờ.</li> }
            </ul>
            @if (failed().length) {
              <div class="px-4 pb-2 o-label o-error">Lỗi cần xử lý ({{ failed().length }})</div>
              <ul class="flex flex-col gap-1 px-2 pb-3">
                @for (p of failed(); track p.id) {
                  <li class="o-list-item" (click)="sel.set(p)"><o-icon name="alert" [size]="14" class="o-error" /><span class="flex-1 truncate text-body-sm">{{ p.title }}</span><button class="o-btn o-btn-sm" (click)="publishNow(p); $event.stopPropagation()">Thử lại</button></li>
                }
              </ul>
            }
          }
        </aside>
      </div>
    </div>

    <!-- ScheduleDialog (thủ công) -->
    <o-modal [open]="manualOpen()" title="Lên lịch bài đăng" subtitle="Chọn nội dung, kênh và thời gian" (closed)="manualOpen.set(false)">
      <label class="o-field"><span class="o-label">Nội dung</span>
        <select class="o-select" [(ngModel)]="man.contentId"><option value="">— Chọn nội dung —</option>@for (c of contents(); track c.id) { <option [value]="c.id">[{{ c.status }}] {{ c.title }}</option> }</select>
      </label>
      <div class="o-field"><span class="o-label">Kênh</span>
        <div class="flex flex-col gap-1 o-scroll" style="max-height: 220px">
          @for (c of channels(); track c.id) {
            <label class="o-list-item" [class.active]="man.channels.has(c.id)">
              <input type="checkbox" [checked]="man.channels.has(c.id)" (change)="toggleManChannel(c.id)" [disabled]="c.quotaBlocked" />
              <span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span><span class="flex-1 truncate">{{ c.name }}</span>
              @if (c.quotaBlocked) { <span class="o-badge warning">Ngoài hạn mức</span> } @else if (c.tokenStatus !== 'valid') { <span class="o-badge warning">Chưa kết nối API</span> }
            </label>
          } @empty { <div class="o-empty">Chưa có kênh</div> }
        </div>
      </div>
      <label class="o-field"><span class="o-label">Thời gian</span><input class="o-input" type="datetime-local" [(ngModel)]="man.at" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="manualOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !man.contentId || !man.channels.size" (click)="saveManual()">Lên lịch</button>
      </div>
    </o-modal>

    <!-- AutoSchedule -->
    <o-modal [open]="autoOpen()" title="Tự xếp lịch theo giờ vàng" subtitle="Chọn nội dung “Sẵn sàng” – hệ thống tìm kênh hợp định dạng & khung giờ vàng trống sớm nhất" [wide]="true" (closed)="autoOpen.set(false)">
      <div class="flex items-center gap-2"><label class="o-check"><input type="checkbox" [checked]="autoAll()" (change)="toggleAutoAll()" /> Chọn tất cả ({{ readyContents().length }})</label></div>
      <div class="flex flex-col gap-1 o-scroll" style="max-height: 320px">
        @for (c of readyContents(); track c.id) {
          <label class="o-list-item" [class.active]="auto.ids.has(c.id)"><input type="checkbox" [checked]="auto.ids.has(c.id)" (change)="toggleAuto(c.id)" /><span class="o-badge">{{ c.kind }}</span><span class="flex-1 truncate">{{ c.title }}</span></label>
        } @empty { <div class="o-empty">Không có nội dung ở trạng thái “Sẵn sàng”.</div> }
      </div>
      <label class="o-field"><span class="o-label">Khoảng cách tối thiểu giữa 2 bài cùng kênh: {{ auto.spacing }} giờ</span><input class="o-range" type="range" min="1" max="24" [(ngModel)]="auto.spacing" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="autoOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !auto.ids.size" (click)="runAuto()"><o-icon name="zap" [size]="13" /> Xếp {{ auto.ids.size }} bài</button>
      </div>
    </o-modal>

    <!-- StaggerControl -->
    <o-modal [open]="staggerOpen()" title="Giãn cách bài trùng giờ" subtitle="Áp dụng khi xếp / dời lịch: các kênh cùng giờ sẽ đăng lệch nhau ngẫu nhiên để tránh bị đánh dấu spam" (closed)="staggerOpen.set(false)">
      <div class="o-tile flex items-center gap-3"><span class="flex-1">Bật giãn cách tự động</span><button class="o-switch" [class.on]="stg.enabled" (click)="stg.enabled = !stg.enabled" aria-label="Bật giãn cách"></button></div>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Tối thiểu (phút)</span><input class="o-input" type="number" min="1" max="60" [(ngModel)]="stg.minMinutes" [disabled]="!stg.enabled" /></label>
        <label class="o-field"><span class="o-label">Tối đa (phút)</span><input class="o-input" type="number" min="1" max="120" [(ngModel)]="stg.maxMinutes" [disabled]="!stg.enabled" /></label>
      </div>
      <p class="text-body-sm o-muted">VD: 5–15 phút → 3 kênh cùng lịch 20:00 sẽ đăng khoảng 20:00, 20:07, 20:19.</p>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="staggerOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || stg.minMinutes > stg.maxMinutes" (click)="saveStagger()">Lưu</button>
      </div>
    </o-modal>
  `,
  styles: [
    `.layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
     @media (min-width: 1280px) { .layout { grid-template-columns: minmax(0, 1fr) 360px; } .side { position: sticky; top: 0; max-height: calc(100vh - 120px); overflow: auto; } }
     .week { display: grid; grid-template-columns: 56px repeat(7, minmax(110px, 1fr)); max-height: calc(100vh - 290px); }
     .wh { position: sticky; top: 0; z-index: 2; background: rgb(var(--c-surface-container)); padding: 8px; font-size: .75rem; color: rgb(var(--c-on-surface-variant)); border-bottom: 1px solid rgb(var(--c-overlay) / 0.06); }
     .wh.today { color: rgb(var(--c-primary)); }
     .hl { font-size: .625rem; color: rgb(var(--c-outline)); padding: 4px 6px; border-top: 1px solid rgb(var(--c-overlay) / 0.04); }
     .cell { min-height: 40px; padding: 2px; border-top: 1px solid rgb(var(--c-overlay) / 0.04); border-left: 1px solid rgb(var(--c-overlay) / 0.04); display: flex; flex-direction: column; gap: 2px; min-width: 0; }
     .cell.gold { background: rgb(var(--c-warning) / 0.05); }
     .cell.over, .mday.over { background: rgb(var(--c-primary) / 0.12); }
     .pc { display: flex; align-items: center; gap: 4px; padding: 2px 4px; border-radius: 6px; font-size: .6875rem; background: rgb(var(--c-surface-container-high)); cursor: pointer; min-width: 0; border-left: 3px solid rgb(var(--c-primary)); }
     .pc .o-plat { height: 14px; font-size: 8px; padding: 0 3px; }
     .pc.st-published { border-left-color: rgb(var(--c-success)); }
     .pc.st-failed { border-left-color: rgb(var(--c-danger)); background: rgb(var(--c-danger) / 0.1); }
     .pc.st-cancelled, .pc.st-canceled { opacity: .45; text-decoration: line-through; }
     .month { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
     .mwd { font-size: .6875rem; font-weight: 600; color: rgb(var(--c-outline)); padding: 0 6px; }
     .mday { min-height: 120px; background: rgb(var(--c-surface-container-low)); border: 1px solid rgb(var(--c-overlay) / 0.05); border-radius: 12px; padding: 6px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
     .mday.out { opacity: .45; } .mday.today { border-color: rgb(var(--c-primary) / 0.55); }
     .dn { font-size: .75rem; font-weight: 600; font-family: 'JetBrains Mono Variable', monospace; }
     .line2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`,
  ],
})
export class CalendarPageComponent {
  private readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  readonly wd = WD;
  readonly hours = HOURS;
  readonly platformKeys = ['facebook', 'tiktok', 'instagram', 'youtube'];
  readonly todayKey = dayKey(new Date());
  readonly mode = signal<'week' | 'month'>('week');
  readonly anchor = signal(new Date());
  readonly posts = signal<PostRow[]>([]);
  readonly platforms = signal<Set<string>>(new Set(['facebook', 'tiktok', 'instagram', 'youtube']));
  readonly sel = signal<PostRow | null>(null);
  readonly over = signal<string | null>(null);
  readonly worker = signal<any>(null);
  readonly busy = signal(false);
  readonly manualOpen = signal(false);
  readonly autoOpen = signal(false);
  readonly staggerOpen = signal(false);
  readonly contents = signal<any[]>([]);
  readonly channels = signal<any[]>([]);
  dragId: string | null = null;
  resched = '';
  man = { contentId: '', channels: new Set<string>(), at: toLocalInput(Date.now() + 3600000) };
  auto = { ids: new Set<string>(), spacing: 4 };
  stg = { enabled: true, minMinutes: 5, maxMinutes: 15 };

  readonly compact = fmtCompact;
  readonly rel = fmtRelative;
  readonly dt = fmtDateTime;
  readonly time = fmtTime;
  readonly local = toLocalInput;

  private monday(d: Date) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  readonly weekDays = computed(() => {
    const s = this.monday(this.anchor());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return { date: d, key: dayKey(d) };
    });
  });
  readonly monthDays = computed(() => {
    const a = this.anchor();
    const start = this.monday(new Date(a.getFullYear(), a.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, key: dayKey(d), inMonth: d.getMonth() === a.getMonth() };
    });
  });
  readonly range = computed(() => {
    const days = this.mode() === 'week' ? this.weekDays() : this.monthDays();
    const from = new Date(days[0].date);
    const to = new Date(days[days.length - 1].date);
    to.setDate(to.getDate() + 1);
    return { from: from.getTime(), to: to.getTime() };
  });
  readonly rangeLabel = computed(() => {
    if (this.mode() === 'month') return `Tháng ${this.anchor().getMonth() + 1}/${this.anchor().getFullYear()}`;
    const w = this.weekDays();
    return `${w[0].date.getDate()}/${w[0].date.getMonth() + 1} – ${w[6].date.getDate()}/${w[6].date.getMonth() + 1}/${w[6].date.getFullYear()}`;
  });
  readonly shown = computed(() => this.posts().filter((p) => this.platforms().has(p.platform)));
  readonly byDay = computed(() => {
    const m = new Map<string, PostRow[]>();
    for (const p of this.shown()) {
      const k = dayKey(new Date(p.scheduledAt));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  });
  readonly queue = computed(() => this.posts().filter((p) => p.status === 'queued' && p.scheduledAt >= Date.now() - 3600000).sort((a, b) => a.scheduledAt - b.scheduledAt).slice(0, 30));
  readonly failed = computed(() => this.posts().filter((p) => p.status === 'failed'));
  readonly readyContents = computed(() => this.contents().filter((c) => c.status === 'ready' || c.status === 'draft'));
  readonly autoAll = computed(() => this.readyContents().length > 0 && this.readyContents().every((c) => this.auto.ids.has(c.id)));
  private readonly golden = computed(() => (this.shell.activeWorkspace()?.['goldenHours'] ?? []) as { start: string; end: string }[]);

  constructor() {
    effect(() => {
      this.range();
      this.api.activeWorkspaceId();
      this.shell.ver('workspace');
      this.shell.ver('calendar');
      void this.load();
    });
    void this.loadMeta();
  }

  meta(p: string) {
    return PLATFORM_META[p] ?? { short: '?' };
  }
  st(s: string) {
    return STATUS[s] ?? { l: s, tone: '' };
  }
  pad(n: number) {
    return String(n).padStart(2, '0');
  }
  countBy(s: string) {
    return this.posts().filter((p) => p.status === s).length;
  }
  isGolden(h: number) {
    const hh = `${this.pad(h)}:30`;
    return this.golden().some((g) => g.start <= hh && hh < g.end);
  }
  cellPosts(day: string, h: number) {
    return (this.byDay().get(day) ?? []).filter((p) => new Date(p.scheduledAt).getHours() === h);
  }
  slotTime(d: Date, h: number) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0).getTime();
  }
  togglePlatform(p: string) {
    const s = new Set(this.platforms());
    s.has(p) ? s.delete(p) : s.add(p);
    this.platforms.set(s);
  }
  goToday() {
    this.anchor.set(new Date());
  }
  shift(n: number) {
    const a = new Date(this.anchor());
    this.mode() === 'week' ? a.setDate(a.getDate() + 7 * n) : a.setMonth(a.getMonth() + n);
    this.anchor.set(a);
  }

  async load() {
    const { from, to } = this.range();
    const r = await this.api.invokeRaw('posts.range', { from, to, workspaceId: this.api.activeWorkspaceId() });
    if (!r.ok) return this.api.toast('Không tải được lịch đăng', errOf(r), 'error');
    const rows = asList(r.data).map(normRow).filter((p) => p.scheduledAt >= from && p.scheduledAt < to);
    this.posts.set(rows);
    const s = this.sel();
    if (s) this.sel.set(rows.find((p) => p.id === s.id) ?? null);
  }

  private async loadMeta() {
    const [w, s] = await Promise.all([this.api.invokeRaw<any>('posts.worker'), this.api.invokeRaw<any>('posts.stagger')]);
    if (w.ok) this.worker.set(typeof w.data === 'boolean' ? { enabled: w.data } : { enabled: w.data?.enabled ?? w.data?.running ?? true, ...w.data });
    if (s.ok && s.data) {
      const d = s.data;
      this.stg = {
        enabled: d.enabled ?? true,
        minMinutes: d.minMinutes ?? Math.max(1, Math.round((d.minSec ?? 300) / 60)),
        maxMinutes: d.maxMinutes ?? Math.max(1, Math.round((d.maxSec ?? 900) / 60)),
      };
    }
  }

  private async loadPickers() {
    const ws = this.api.activeWorkspaceId();
    const [c, ch] = await Promise.all([this.api.invokeRaw('content.list', { workspaceId: ws }), this.api.invokeRaw('channels.list', { workspaceId: ws })]);
    this.contents.set(asList(c.ok ? c.data : []));
    this.channels.set(asList(ch.ok ? ch.data : []).map((x: any) => x.channel ?? x));
  }

  async toggleWorker() {
    const next = !this.worker()?.enabled;
    const r = await this.api.invokeRaw<any>('posts.setWorker', { enabled: next });
    if (!r.ok) return this.api.toast('Không đổi được trình đăng bài', errOf(r), 'error');
    this.worker.set({ ...(this.worker() ?? {}), ...(typeof r.data === 'object' ? r.data : {}), enabled: next });
    this.api.toast(next ? 'Đã bật đăng bài tự động' : 'Đã tạm dừng đăng bài tự động', undefined, next ? 'success' : 'warn');
  }

  async openManual(at: number | null) {
    this.man = { contentId: '', channels: new Set(), at: toLocalInput(at ?? Date.now() + 3600000) };
    this.manualOpen.set(true);
    await this.loadPickers();
  }
  toggleManChannel(id: string) {
    const s = new Set(this.man.channels);
    s.has(id) ? s.delete(id) : s.add(id);
    this.man = { ...this.man, channels: s };
  }
  async saveManual() {
    const at = new Date(this.man.at).getTime();
    if (!at || at < Date.now()) return this.api.toast('Chọn thời gian trong tương lai', undefined, 'warn');
    this.busy.set(true);
    let ok = 0;
    for (const channelId of this.man.channels) {
      const r = await this.api.invokeRaw<any>('posts.schedule', { contentItemId: this.man.contentId, channelId, scheduledAt: at });
      if (r.ok) ok++;
      else this.api.toast('Không lên lịch được', errOf(r), 'error');
    }
    this.busy.set(false);
    if (ok) {
      this.manualOpen.set(false);
      this.api.toast(`Đã lên lịch ${ok} bài`, this.dt(at), 'success');
      this.shell.bump('dashboard', 'content');
      await this.load();
    }
  }

  async openAuto() {
    this.auto = { ids: new Set(), spacing: 4 };
    this.autoOpen.set(true);
    await this.loadPickers();
    this.auto = { ...this.auto, ids: new Set(this.readyContents().filter((c) => c.status === 'ready').map((c) => c.id)) };
  }
  toggleAuto(id: string) {
    const s = new Set(this.auto.ids);
    s.has(id) ? s.delete(id) : s.add(id);
    this.auto = { ...this.auto, ids: s };
  }
  toggleAutoAll() {
    this.auto = { ...this.auto, ids: this.autoAll() ? new Set() : new Set(this.readyContents().map((c) => c.id)) };
  }
  async runAuto() {
    this.busy.set(true);
    const r = await this.api.invokeRaw<any>('posts.autoSchedule', { contentIds: [...this.auto.ids], spacingHours: +this.auto.spacing });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không tự xếp lịch được', errOf(r), 'error');
    this.autoOpen.set(false);
    const n = asList(r.data?.scheduled ?? r.data).length || r.data?.count || this.auto.ids.size;
    this.api.toast(`Đã xếp ${n} bài vào giờ vàng`, undefined, 'success');
    this.shell.bump('dashboard', 'content');
    await this.load();
  }

  async dropAt(d: Date, h: number | null) {
    this.over.set(null);
    const p = this.posts().find((x) => x.id === this.dragId);
    this.dragId = null;
    if (!p) return;
    const old = new Date(p.scheduledAt);
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h ?? old.getHours(), h == null ? old.getMinutes() : 0).getTime();
    if (t < Date.now()) return this.api.toast('Không thể dời về quá khứ', undefined, 'warn');
    await this.reschedule(p, toLocalInput(t));
  }

  async reschedule(p: PostRow, local: string) {
    const at = new Date(local).getTime();
    if (!at || at < Date.now()) return this.api.toast('Chọn thời gian trong tương lai', undefined, 'warn');
    this.busy.set(true);
    const r = await this.api.invokeRaw<any>('posts.reschedule', { id: p.id, scheduledAt: at });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không dời được lịch', errOf(r), 'error');
    const real = typeof r.data === 'number' ? r.data : (r.data?.scheduledAt ?? at);
    this.api.toast('Đã dời lịch', `${this.dt(real)}${real !== at ? ' (đã giãn cách)' : ''}`, 'success');
    this.resched = '';
    await this.load();
  }

  async publishNow(p: PostRow) {
    this.busy.set(true);
    const r = await this.api.invokeRaw('posts.publishNow', { id: p.id });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không đăng được', errOf(r), 'error');
    this.api.toast('Đã đưa vào hàng đăng ngay', p.title, 'success');
    this.shell.bump('dashboard');
    await this.load();
  }

  async cancel(p: PostRow) {
    if (!confirm(`Hủy lịch đăng “${p.title}” trên ${p.channelName}?`)) return;
    const r = await this.api.invokeRaw('posts.cancel', { id: p.id });
    if (!r.ok) return this.api.toast('Không hủy được', errOf(r), 'error');
    this.api.toast('Đã hủy lịch', undefined, 'success');
    this.sel.set(null);
    await this.load();
  }

  async saveStagger() {
    this.busy.set(true);
    const r = await this.api.invokeRaw('posts.setStagger', { enabled: this.stg.enabled, minMinutes: +this.stg.minMinutes, maxMinutes: +this.stg.maxMinutes, minSec: +this.stg.minMinutes * 60, maxSec: +this.stg.maxMinutes * 60 });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không lưu được', errOf(r), 'error');
    this.staggerOpen.set(false);
    this.api.toast('Đã lưu cài đặt giãn cách', `${this.stg.minMinutes}–${this.stg.maxMinutes} phút`, 'success');
  }

  exportCsv() {
    const rows = this.shown().map((p) => ({
      scheduledAt: this.dt(p.scheduledAt),
      status: this.st(p.status).l,
      platform: PLATFORM_META[p.platform]?.label ?? p.platform,
      channel: p.channelName,
      title: p.title,
      golden: p.isGoldenHour ? 'Có' : '',
      publishedAt: p.publishedAt ? this.dt(p.publishedAt) : '',
      views: p.views ?? '',
      engagements: p.engagements ?? '',
      permalink: p.permalink ?? '',
      error: p.error ?? '',
    }));
    const csv = toCsv(rows, [
      { key: 'scheduledAt', label: 'Thời gian' },
      { key: 'status', label: 'Trạng thái' },
      { key: 'platform', label: 'Nền tảng' },
      { key: 'channel', label: 'Kênh' },
      { key: 'title', label: 'Nội dung' },
      { key: 'golden', label: 'Giờ vàng' },
      { key: 'publishedAt', label: 'Đã đăng lúc' },
      { key: 'views', label: 'Lượt xem' },
      { key: 'engagements', label: 'Tương tác' },
      { key: 'permalink', label: 'Link' },
      { key: 'error', label: 'Lỗi' },
    ]);
    downloadText(`lich-dang-bai-${dayKey(new Date(this.range().from))}.csv`, csv, 'text/csv;charset=utf-8');
    this.api.toast('Đã xuất CSV', `${rows.length} bài`, 'success');
  }
}
