import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { asList, dayKey, errOf, fmtUsd } from '../../shared/util';
import { CONTENT_FORMATS, FORMAT_GROUP_LABEL, IDEA_STATUS, formatById } from './formats';

interface Idea {
  id: string;
  workspaceId?: string | null;
  plannedDate?: string | null;
  title: string;
  format?: string;
  hook?: string | null;
  description?: string | null;
  status?: string;
  projectId?: string | null;
  contentItemId?: string | null;
  imageProjectId?: string | null;
  source?: string;
}

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="lightbulb" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Kế hoạch nội dung</h1>
          <p class="o-page-desc">Lập lịch ý tưởng theo ngày – AI đề xuất theo ngách, bài hiệu quả và xu hướng tìm kiếm; 1 chạm thành video, ảnh hoặc bài viết</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn" (click)="openIdea(null, todayKey)"><o-icon name="plus" [size]="15" /> Thêm ý tưởng</button>
          <button class="o-btn o-btn-primary" (click)="genOpen.set(true)"><o-icon name="sparkles" [size]="15" /> AI lập kế hoạch</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="o-icon-btn" (click)="shift(-1)" aria-label="Trước"><o-icon name="chevronleft" [size]="16" /></button>
        <button class="o-btn o-btn-sm" (click)="goToday()">Hôm nay</button>
        <button class="o-icon-btn" (click)="shift(1)" aria-label="Sau"><o-icon name="chevronright" [size]="16" /></button>
        <b class="text-headline-sm ml-1">{{ rangeLabel() }}</b>
        <div class="o-seg ml-auto">
          <button [class.active]="mode() === 'month'" (click)="mode.set('month')"><o-icon name="calendar" [size]="13" /> Tháng</button>
          <button [class.active]="mode() === 'week'" (click)="mode.set('week')">Tuần</button>
          <button [class.active]="mode() === 'list'" (click)="mode.set('list')"><o-icon name="list" [size]="13" /> Danh sách</button>
        </div>
        <select class="o-select" style="width: 170px" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
          <option value="">Mọi trạng thái</option>
          @for (s of statuses; track s.v) { <option [value]="s.v">{{ s.l }}</option> }
        </select>
      </div>

      <div class="o-grid-kpi">
        @for (s of statuses; track s.v) {
          <div class="o-tile flex items-center justify-between"><span class="text-body-sm o-muted">{{ s.l }}</span><b class="font-mono">{{ countBy(s.v) }}</b></div>
        }
      </div>

      @if (mode() !== 'list') {
        <div class="cal" [class.week]="mode() === 'week'">
          @for (w of weekdays; track w) { <div class="wd">{{ w }}</div> }
          @for (d of days(); track d.key) {
            <div class="day" [class.out]="!d.inMonth" [class.today]="d.key === todayKey" [class.over]="dragOver() === d.key"
                 (dragover)="$event.preventDefault(); dragOver.set(d.key)" (dragleave)="dragOver.set(null)" (drop)="drop(d.key)">
              <div class="flex items-center justify-between">
                <span class="dn">{{ d.date.getDate() }}</span>
                <button class="o-icon-btn add" style="width: 22px; height: 22px" (click)="openIdea(null, d.key)" [attr.aria-label]="'Thêm ý tưởng ngày ' + d.key"><o-icon name="plus" [size]="12" /></button>
              </div>
              @for (i of byDay().get(d.key) ?? []; track i.id) {
                <div class="chip" draggable="true" (dragstart)="dragId = i.id" (click)="openIdea(i)" [class]="'chip st-' + (i.status ?? 'idea')" [title]="i.hook ?? i.title">
                  <span class="truncate">{{ i.title }}</span>
                </div>
              }
            </div>
          }
        </div>
        <p class="text-label-sm o-faint">Kéo thả ý tưởng sang ngày khác để dời lịch. Bấm vào ý tưởng để sửa hoặc chuyển thành video / ảnh / bài viết.</p>
      } @else {
        <section class="o-card">
          <div class="flex items-center gap-2 p-3">
            <label class="o-check"><input type="checkbox" [checked]="allChecked()" (change)="toggleAll()" /> Chọn tất cả</label>
            @if (checked().size) {
              <span class="o-badge primary">{{ checked().size }} đã chọn</span>
              <button class="o-btn o-btn-sm o-btn-danger" (click)="deleteMany()"><o-icon name="trash" [size]="13" /> Xóa</button>
            }
          </div>
          <div class="o-table-wrap" style="border: 0; border-radius: 0">
            <table class="o-table">
              <thead><tr><th style="width: 32px"></th><th>Ngày</th><th>Ý tưởng</th><th>Định dạng</th><th>Trạng thái</th><th>Liên kết</th><th></th></tr></thead>
              <tbody>
                @for (i of shown(); track i.id) {
                  <tr [class.selected]="checked().has(i.id)">
                    <td><input type="checkbox" [checked]="checked().has(i.id)" (change)="toggle(i.id)" /></td>
                    <td class="font-mono whitespace-nowrap">{{ i.plannedDate ?? '—' }}</td>
                    <td style="max-width: 420px"><div class="font-semibold truncate">{{ i.title }}</div>@if (i.hook) { <div class="text-body-sm o-muted truncate">“{{ i.hook }}”</div> }</td>
                    <td><span class="o-badge">{{ fmt(i.format).label }}</span></td>
                    <td><span class="o-badge" [class]="'o-badge ' + statusTone(i.status)">{{ statusLabel(i.status) }}</span></td>
                    <td class="text-label-sm">
                      @if (i.projectId) { <span class="o-badge secondary">Video</span> }
                      @if (i.imageProjectId) { <span class="o-badge secondary">Ảnh</span> }
                      @if (i.contentItemId) { <span class="o-badge secondary">Bài viết</span> }
                    </td>
                    <td class="text-right whitespace-nowrap"><button class="o-btn o-btn-sm o-btn-subtle" (click)="openIdea(i)">Mở</button></td>
                  </tr>
                } @empty { <tr><td colspan="7"><div class="o-empty"><o-icon name="lightbulb" [size]="24" />Chưa có ý tưởng trong khoảng này – bấm “AI lập kế hoạch”.</div></td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    <!-- IdeaDialog -->
    <o-modal [open]="ideaOpen()" [title]="cur.id ? 'Ý tưởng nội dung' : 'Thêm ý tưởng'" (closed)="ideaOpen.set(false)">
      <label class="o-field"><span class="o-label">Tiêu đề</span><input class="o-input" [(ngModel)]="cur.title" maxlength="200" /></label>
      <label class="o-field"><span class="o-label">Câu hook mở đầu</span><input class="o-input" [(ngModel)]="cur.hook" maxlength="300" placeholder="Câu đầu tiên giữ chân người xem trong 3 giây" /></label>
      <label class="o-field"><span class="o-label">Mô tả / dàn ý</span><textarea class="o-textarea" rows="4" [(ngModel)]="cur.description" maxlength="1000"></textarea></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Ngày dự kiến</span><input class="o-input" type="date" [(ngModel)]="cur.plannedDate" /></label>
        <label class="o-field"><span class="o-label">Định dạng</span>
          <select class="o-select" [(ngModel)]="cur.format">
            @for (g of formatGroups; track g.key) { <optgroup [label]="g.label">@for (f of g.items; track f.id) { <option [value]="f.id">{{ f.label }}</option> }</optgroup> }
          </select>
        </label>
        <label class="o-field"><span class="o-label">Trạng thái</span><select class="o-select" [(ngModel)]="cur.status">@for (s of statuses; track s.v) { <option [value]="s.v">{{ s.l }}</option> }</select></label>
      </div>
      @if (cur.id) {
        <div class="o-tile flex flex-col gap-2">
          <div class="o-label">Chuyển thành</div>
          <div class="flex flex-wrap gap-2">
            @if (fmt(cur.format).kind === 'video') {
              <button class="o-btn o-btn-sm" [disabled]="busy()" (click)="convert('toVideo')"><o-icon name="clapperboard" [size]="13" /> {{ cur.projectId ? 'Mở dự án video' : 'Tạo video (Xưởng Video AI)' }}</button>
            } @else {
              <button class="o-btn o-btn-sm" [disabled]="busy()" (click)="convert('toPost')"><o-icon name="edit" [size]="13" /> {{ cur.contentItemId ? 'Mở bài viết' : 'Tạo bài viết' }}</button>
            }
            <button class="o-btn o-btn-sm" [disabled]="busy()" (click)="convert('toImage')"><o-icon name="images" [size]="13" /> {{ cur.imageProjectId ? 'Mở dự án ảnh' : 'Tạo ảnh quảng cáo' }}</button>
            @if (fmt(cur.format).kind === 'video') { <button class="o-btn o-btn-sm o-btn-subtle" [disabled]="busy()" (click)="convert('toPost')"><o-icon name="edit" [size]="13" /> Tạo bài viết</button> }
          </div>
        </div>
      }
      <div modal-footer>
        @if (cur.id) { <button class="o-btn o-btn-danger" style="margin-right: auto" (click)="remove()"><o-icon name="trash" [size]="14" /> Xóa</button> }
        <button class="o-btn o-btn-subtle" (click)="ideaOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !cur.title.trim()" (click)="saveIdea()">Lưu</button>
      </div>
    </o-modal>

    <!-- AI generate -->
    <o-modal [open]="genOpen()" title="AI lập kế hoạch nội dung" subtitle="Đề xuất theo ngách của Pocket, bài hiệu quả của page và (tùy chọn) xu hướng tìm kiếm Google Trends VN" [wide]="true" (closed)="genOpen.set(false)">
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Bắt đầu từ ngày</span><input class="o-input" type="date" [(ngModel)]="gen.startDate" /></label>
        <label class="o-field"><span class="o-label">Số ngày (1–30)</span><input class="o-input" type="number" min="1" max="30" [(ngModel)]="gen.days" /></label>
        <label class="o-field"><span class="o-label">Ý tưởng mỗi ngày (1–3)</span><input class="o-input" type="number" min="1" max="3" [(ngModel)]="gen.perDay" /></label>
      </div>
      <div class="o-field">
        <span class="o-label">Định dạng ưu tiên (bỏ trống = AI tự chọn)</span>
        @for (g of formatGroups; track g.key) {
          <div class="flex flex-wrap items-center gap-1.5 mt-1"><span class="text-label-sm o-faint" style="width: 72px">{{ g.label }}</span>
            @for (f of g.items; track f.id) { <button class="o-chip" [class.active]="gen.formats.includes(f.id)" (click)="toggleFormat(f.id)">{{ f.label }}</button> }
          </div>
        }
      </div>
      <label class="o-check"><input type="checkbox" [(ngModel)]="gen.useTrends" /> Kết hợp xu hướng tìm kiếm đang lên (Google Trends VN)</label>
      <div class="o-banner text-body-sm"><o-icon name="info" [size]="14" class="o-secondary" />Pocket: <b>{{ shell.activeWorkspace()?.name ?? 'Tất cả (đa chủ đề)' }}</b> · Sẽ tạo khoảng {{ gen.days * gen.perDay }} ý tưởng.</div>
      @if (genResult(); as g) { <div class="o-banner success text-body-sm"><o-icon name="checkcheck" [size]="14" class="o-tertiary" />Đã tạo {{ g.count }} ý tưởng @if (g.cost != null) { · chi phí {{ usd(g.cost) }} } @if (g.model) { · {{ g.model }} }</div> }
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="genOpen.set(false)">Đóng</button>
        <button class="o-btn o-btn-primary" [disabled]="generating()" (click)="generate()">@if (generating()) { <o-icon name="loader" [size]="14" class="o-spin" /> Đang lập kế hoạch… } @else { <o-icon name="sparkles" [size]="14" /> Lập kế hoạch } </button>
      </div>
    </o-modal>
  `,
  styles: [
    `.cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
     .wd { font-size: .6875rem; font-weight: 600; color: rgb(var(--c-outline)); text-transform: uppercase; padding: 0 6px; }
     .day { min-height: 118px; background: rgb(var(--c-surface-container-low)); border: 1px solid rgb(var(--c-overlay) / 0.05); border-radius: 12px; padding: 6px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
     .cal.week .day { min-height: 360px; }
     .day.out { opacity: .45; }
     .day.today { border-color: rgb(var(--c-primary) / 0.55); }
     .day.over { background: rgb(var(--c-primary) / 0.08); }
     .day .add { opacity: 0; }
     .day:hover .add { opacity: 1; }
     .dn { font-size: .75rem; font-weight: 600; font-family: 'JetBrains Mono Variable', monospace; }
     .chip { display: flex; align-items: center; padding: 3px 7px; border-radius: 7px; font-size: .6875rem; cursor: pointer; background: rgb(var(--c-surface-container-high)); border-left: 3px solid rgb(var(--c-outline)); min-width: 0; }
     .chip:hover { filter: brightness(1.15); }
     .chip.st-in_progress { border-left-color: rgb(var(--c-secondary)); }
     .chip.st-done { border-left-color: rgb(var(--c-success)); opacity: .8; }
     .chip.st-dropped { border-left-color: rgb(var(--c-danger)); text-decoration: line-through; opacity: .6; }
     @media (max-width: 900px) { .cal { grid-template-columns: repeat(2, minmax(0, 1fr)); } .wd { display: none; } }`,
  ],
})
export class PlanPageComponent {
  private readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly weekdays = WD;
  readonly statuses = IDEA_STATUS;
  readonly todayKey = dayKey(new Date());
  readonly formatGroups = (Object.keys(FORMAT_GROUP_LABEL) as (keyof typeof FORMAT_GROUP_LABEL)[]).map((key) => ({ key, label: FORMAT_GROUP_LABEL[key], items: CONTENT_FORMATS.filter((f) => f.group === key) }));
  readonly usd = (n: number | null | undefined) => fmtUsd(n, 4);
  readonly fmt = formatById;

  readonly mode = signal<'month' | 'week' | 'list'>('month');
  readonly anchor = signal(new Date());
  readonly ideas = signal<Idea[]>([]);
  readonly statusFilter = signal('');
  readonly checked = signal<Set<string>>(new Set());
  readonly dragOver = signal<string | null>(null);
  readonly ideaOpen = signal(false);
  readonly genOpen = signal(false);
  readonly generating = signal(false);
  readonly genResult = signal<{ count: number; cost?: number; model?: string } | null>(null);
  readonly busy = signal(false);
  dragId: string | null = null;
  cur: Idea = this.blank();
  gen = { startDate: dayKey(new Date()), days: 7, perDay: 1, formats: [] as string[], useTrends: false };

  readonly days = computed(() => {
    const a = this.anchor();
    if (this.mode() === 'week') {
      const s = this.monday(a);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        return { date: d, key: dayKey(d), inMonth: true };
      });
    }
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const start = this.monday(first);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, key: dayKey(d), inMonth: d.getMonth() === a.getMonth() };
    });
  });

  readonly range = computed(() => {
    const d = this.days();
    return { from: d[0].key, to: d[d.length - 1].key };
  });

  readonly rangeLabel = computed(() => {
    const a = this.anchor();
    if (this.mode() === 'week') {
      const r = this.range();
      return `Tuần ${r.from.slice(8)}/${r.from.slice(5, 7)} – ${r.to.slice(8)}/${r.to.slice(5, 7)}/${r.to.slice(0, 4)}`;
    }
    return `Tháng ${a.getMonth() + 1}/${a.getFullYear()}`;
  });

  readonly shown = computed(() => {
    const f = this.statusFilter();
    return this.ideas()
      .filter((i) => !f || (i.status ?? 'idea') === f)
      .sort((a, b) => (a.plannedDate ?? '9').localeCompare(b.plannedDate ?? '9'));
  });

  readonly byDay = computed(() => {
    const m = new Map<string, Idea[]>();
    for (const i of this.shown()) {
      if (!i.plannedDate) continue;
      if (!m.has(i.plannedDate)) m.set(i.plannedDate, []);
      m.get(i.plannedDate)!.push(i);
    }
    return m;
  });

  readonly allChecked = computed(() => this.shown().length > 0 && this.shown().every((i) => this.checked().has(i.id)));

  constructor() {
    effect(() => {
      this.range();
      this.api.activeWorkspaceId();
      this.shell.ver('workspace');
      this.shell.ver('plan');
      void this.load();
    });
    this.route.queryParamMap.subscribe((q) => q.get('generate') && this.genOpen.set(true));
  }

  private monday(d: Date) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  private blank(date: string | null = null): Idea {
    return { id: undefined, title: '', hook: '', description: '', plannedDate: date, format: 'free', status: 'idea', projectId: null, contentItemId: null, imageProjectId: null };
  }

  countBy(s: string) {
    return this.ideas().filter((i) => (i.status ?? 'idea') === s).length;
  }
  statusLabel(s?: string) {
    return IDEA_STATUS.find((x) => x.v === (s ?? 'idea'))?.l ?? s;
  }
  statusTone(s?: string) {
    return IDEA_STATUS.find((x) => x.v === (s ?? 'idea'))?.tone ?? '';
  }

  shift(n: number) {
    const a = new Date(this.anchor());
    if (this.mode() === 'week') a.setDate(a.getDate() + 7 * n);
    else a.setMonth(a.getMonth() + n);
    this.anchor.set(a);
  }
  goToday() {
    this.anchor.set(new Date());
  }

  async load() {
    const { from, to } = this.range();
    const r = await this.api.invokeRaw('plan.list', { workspaceId: this.api.activeWorkspaceId(), from, to });
    if (!r.ok) return this.api.toast('Không tải được kế hoạch', errOf(r), 'error');
    this.ideas.set(asList<Idea>(r.data));
  }

  openIdea(i: Idea | null, date: string | null = null) {
    this.cur = i ? { ...this.blank(), ...i, hook: i.hook ?? '', description: i.description ?? '' } : this.blank(date);
    this.ideaOpen.set(true);
  }

  async saveIdea() {
    this.busy.set(true);
    const r = await this.api.invokeRaw<Idea>('plan.save', {
      id: this.cur.id ?? undefined,
      workspaceId: this.cur.workspaceId ?? this.api.activeWorkspaceId(),
      plannedDate: this.cur.plannedDate || null,
      title: this.cur.title.trim(),
      format: this.cur.format || 'free',
      hook: this.cur.hook?.trim() || null,
      description: this.cur.description?.trim() || null,
      status: this.cur.status,
    });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không lưu được ý tưởng', errOf(r), 'error');
    this.ideaOpen.set(false);
    this.api.toast('Đã lưu ý tưởng', this.cur.title, 'success');
    await this.load();
  }

  async remove() {
    if (!confirm(`Xóa ý tưởng “${this.cur.title}”?`)) return;
    const r = await this.api.invokeRaw('plan.delete', { id: this.cur.id });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.ideaOpen.set(false);
    await this.load();
  }

  async drop(day: string) {
    this.dragOver.set(null);
    const i = this.ideas().find((x) => x.id === this.dragId);
    this.dragId = null;
    if (!i || i.plannedDate === day) return;
    this.ideas.update((l) => l.map((x) => (x.id === i.id ? { ...x, plannedDate: day } : x)));
    const r = await this.api.invokeRaw('plan.save', { id: i.id, workspaceId: i.workspaceId ?? null, plannedDate: day, title: i.title, format: i.format ?? 'free', hook: i.hook ?? null, description: i.description ?? null, status: i.status });
    if (!r.ok) {
      this.api.toast('Không dời được lịch', errOf(r), 'error');
      await this.load();
    }
  }

  async convert(kind: 'toVideo' | 'toImage' | 'toPost') {
    this.busy.set(true);
    const r = await this.api.invokeRaw<DynamicEntity>(`plan.${kind}`, { id: this.cur.id });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không chuyển được', errOf(r), 'error');
    this.ideaOpen.set(false);
    this.shell.bump('plan');
    if (kind === 'toVideo') void this.router.navigate(['/studio'], { queryParams: { id: r.data?.projectId } });
    else if (kind === 'toImage') void this.router.navigate(['/image-studio'], { queryParams: { id: r.data?.projectId } });
    else void this.router.navigate(['/content'], { queryParams: { id: r.data?.contentItemId } });
  }

  toggleFormat(id: string) {
    const i = this.gen.formats.indexOf(id);
    i >= 0 ? this.gen.formats.splice(i, 1) : this.gen.formats.push(id);
  }

  async generate() {
    this.generating.set(true);
    this.genResult.set(null);
    const r = await this.api.invokeRaw<DynamicEntity>('plan.generate', {
      workspaceId: this.api.activeWorkspaceId(),
      startDate: this.gen.startDate,
      days: Math.max(1, Math.min(30, +this.gen.days || 7)),
      perDay: Math.max(1, Math.min(3, +this.gen.perDay || 1)),
      formats: this.gen.formats.filter((f) => !f.startsWith('post_')),
      useTrends: this.gen.useTrends,
    });
    this.generating.set(false);
    if (!r.ok) return this.api.toast('AI chưa lập được kế hoạch', errOf(r), 'error');
    const items = asList(r.data?.ideas ?? r.data);
    this.genResult.set({ count: items.length || r.data?.created || 0, cost: r.data?.costUsd ?? r.data?.meta?.costUsd, model: r.data?.model ?? r.data?.meta?.model });
    this.anchor.set(new Date(this.gen.startDate + 'T00:00:00'));
    this.api.toast('Đã lập kế hoạch nội dung', `${items.length || ''} ý tưởng mới`, 'success');
    await this.load();
  }

  toggle(id: string) {
    const s = new Set(this.checked());
    s.has(id) ? s.delete(id) : s.add(id);
    this.checked.set(s);
  }
  toggleAll() {
    this.checked.set(this.allChecked() ? new Set() : new Set(this.shown().map((i) => i.id)));
  }
  async deleteMany() {
    const ids = [...this.checked()];
    if (!confirm(`Xóa ${ids.length} ý tưởng đã chọn?`)) return;
    const r = await this.api.invokeRaw('plan.deleteMany', { ids });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.checked.set(new Set());
    this.api.toast(`Đã xóa ${ids.length} ý tưởng`, undefined, 'success');
    await this.load();
  }
}
