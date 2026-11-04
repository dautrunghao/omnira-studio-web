import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { pickFiles } from '../../shared/file-pick';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, PLATFORM_ORDER, asList, downloadText, errOf, fmtDate, fmtUsd } from '../../shared/util';

interface Slot {
  start: string;
  end: string;
  weight: number;
}

interface Draft {
  name: string;
  color: string;
  icon: string;
  description: string;
  tags: string;
  brandVoice: string;
  knowledge: string;
  goldenHours: Slot[];
  aiBudgetUsd: string;
  aiTokenQuota: string;
  watermarkPath: string | null;
  watermarkPosition: 'tl' | 'tr' | 'bl' | 'br' | 'center';
  watermarkX: number;
  watermarkY: number;
  watermarkOpacity: number;
}

const COLORS = ['#c0c1ff', '#4cd7f6', '#4edea3', '#ffb68b', '#f59e0b', '#ef4444', '#e879f9', '#60a5fa', '#a3e635', '#f472b6'];
const POS: { v: Draft['watermarkPosition']; l: string; x: number; y: number }[] = [
  { v: 'tl', l: 'Góc trái trên', x: 0.1, y: 0.08 },
  { v: 'tr', l: 'Góc phải trên', x: 0.9, y: 0.08 },
  { v: 'center', l: 'Chính giữa', x: 0.5, y: 0.5 },
  { v: 'bl', l: 'Góc trái dưới', x: 0.1, y: 0.92 },
  { v: 'br', l: 'Góc phải dưới', x: 0.9, y: 0.92 },
];
const DEFAULT_SLOTS: Slot[] = [
  { start: '11:00', end: '13:00', weight: 0.35 },
  { start: '19:30', end: '22:00', weight: 0.45 },
];

function toDraft(ws: any): Draft {
  return {
    name: ws.name ?? '',
    color: ws.color ?? COLORS[0],
    icon: ws.icon ?? '',
    description: ws.description ?? '',
    tags: (ws.tags ?? []).join(', '),
    brandVoice: ws.brandVoice ?? '',
    knowledge: ws.knowledge ?? '',
    goldenHours: (ws.goldenHours ?? []).map((s: Slot) => ({ ...s })),
    aiBudgetUsd: ws.aiBudgetUsd != null ? String(ws.aiBudgetUsd) : '',
    aiTokenQuota: ws.aiTokenQuota != null ? String(ws.aiTokenQuota) : '',
    watermarkPath: ws.watermarkPath ?? null,
    watermarkPosition: ws.watermarkPosition ?? 'br',
    watermarkX: ws.watermarkX ?? 0.9,
    watermarkY: ws.watermarkY ?? 0.92,
    watermarkOpacity: ws.watermarkOpacity ?? 0.85,
  };
}

@Component({
  selector: 'app-workspaces-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="layers" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Không gian làm việc (Pocket)</h1>
          <p class="o-page-desc">Nhóm kênh theo ngách / khách hàng: giọng thương hiệu, giờ vàng, watermark và ngân sách AI riêng cho từng Pocket</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn" (click)="openArchived()" title="Pocket đã lưu trữ"><o-icon name="archive" [size]="15" /> Đã lưu trữ @if (archived().length) { <span class="o-badge mono">{{ archived().length }}</span> }</button>
          <button class="o-btn" (click)="exportCfg()" [disabled]="exporting()" title="Xuất cấu hình (không gồm cookie/token/mật khẩu)"><o-icon name="download" [size]="15" /> Sao lưu & Xuất cấu hình</button>
          <button class="o-btn o-btn-primary" (click)="openCreate()"><o-icon name="plus" [size]="15" /> Tạo Pocket</button>
        </div>
      </div>

      <div class="o-grid-kpi">
        <div class="o-tile stat"><o-icon name="layers" [size]="16" class="o-primary" /><div><div class="text-label-sm o-muted">Pocket đang hoạt động</div><b class="text-headline-sm">{{ list().length }}</b></div></div>
        <div class="o-tile stat"><o-icon name="users" [size]="16" class="o-secondary" /><div><div class="text-label-sm o-muted">Tổng số kênh</div><b class="text-headline-sm">{{ totalChannels() }}</b></div></div>
        <div class="o-tile stat"><o-icon name="alert" [size]="16" class="o-warning" /><div><div class="text-label-sm o-muted">Kênh cần chú ý</div><b class="text-headline-sm">{{ totalUnhealthy() }}</b></div></div>
        <div class="o-tile stat"><o-icon name="dollar" [size]="16" class="o-tertiary" /><div><div class="text-label-sm o-muted">Chi phí AI tháng này</div><b class="text-headline-sm">{{ usd(totalSpent()) }}</b></div></div>
      </div>

      <div class="layout">
        <!-- PocketCards -->
        <div class="cards">
          @if (loading()) { @for (i of [0, 1, 2, 3]; track i) { <div class="o-skel" style="height: 210px"></div> } }
          @for (w of list(); track w.id; let i = $index) {
            <button class="o-card pocket" [class.sel]="selId() === w.id" (click)="select(w)">
              <div class="flex items-start gap-3">
                <div class="pk-ico" [style.background]="w.color || '#c0c1ff'">{{ (w.name || '?').slice(0, 1) }}</div>
                <div class="min-w-0 flex-1 text-left">
                  <div class="flex items-center gap-2"><span class="o-code o-faint">PKT-{{ pad(i + 1) }}</span>@if (api.activeWorkspaceId() === w.id) { <span class="o-badge primary">Đang chọn</span> }</div>
                  <div class="font-semibold truncate">{{ w.name }}</div>
                  @if (w.description) { <div class="text-body-sm o-muted line2">{{ w.description }}</div> }
                </div>
                <span class="o-dot" [class.success]="!w.unhealthyChannels" [class.warning]="w.unhealthyChannels > 0" [title]="w.unhealthyChannels ? w.unhealthyChannels + ' kênh cần chú ý' : 'Ổn định'"></span>
              </div>
              <div class="flex flex-wrap gap-1 mt-3">
                @for (p of platforms; track p) {
                  @if (platformCount(w, p)) { <span class="o-plat" [class]="'o-plat ' + p">{{ platformCount(w, p) }} {{ meta(p).short }}</span> }
                }
                @for (t of (w.tags ?? []).slice(0, 3); track t) { <span class="o-badge">{{ t }}</span> }
              </div>
              <div class="grid grid-cols-3 gap-2 mt-3 text-left">
                <div><div class="text-label-sm o-muted">Kênh</div><b class="font-mono">{{ w.channelCount ?? 0 }}</b></div>
                <div><div class="text-label-sm o-muted">Bài / ngày</div><b class="font-mono">{{ w.postsPerDay ?? 0 }}</b></div>
                <div><div class="text-label-sm o-muted">Sẵn sàng đăng</div><b class="font-mono">{{ w.contentReady ?? 0 }}</b></div>
              </div>
              @if (w.aiBudgetUsd != null) {
                @let used = budgetPct(w);
                <div class="mt-3 text-left">
                  <div class="flex justify-between text-label-sm"><span class="o-muted">AI {{ usd(w.aiSpentUsd ?? 0) }} / {{ usd(w.aiBudgetUsd) }}</span><span [class.o-error]="used >= 90" [class.o-muted]="used < 90">{{ used.toFixed(0) }}%</span></div>
                  <div class="o-progress mt-1" [class.danger]="used >= 90" [class.warning]="used >= 70 && used < 90"><div [style.width.%]="used"></div></div>
                </div>
              }
            </button>
          }
          @if (!loading() && !list().length) {
            <div class="o-card o-empty" style="grid-column: 1 / -1"><o-icon name="layers" [size]="28" />Chưa có Pocket nào – tạo Pocket đầu tiên để nhóm kênh theo ngách.<button class="o-btn o-btn-primary mt-2" (click)="openCreate()"><o-icon name="plus" [size]="15" /> Tạo Pocket</button></div>
          }
        </div>

        <!-- RulesPanel -->
        <aside class="o-card panel">
          @if (sel(); as ws) {
            <div class="o-card-head" style="padding-bottom: 8px">
              <div class="o-card-ico"><o-icon name="settings" [size]="16" /></div>
              <div class="flex-1 min-w-0"><div class="o-card-title">Tùy chọn Pocket</div><div class="o-card-sub truncate">{{ ws.name }}</div></div>
              <button class="o-btn o-btn-sm" [class.o-btn-primary]="api.activeWorkspaceId() !== ws.id" (click)="activate(ws.id)">{{ api.activeWorkspaceId() === ws.id ? 'Đang dùng' : 'Dùng Pocket này' }}</button>
            </div>
            <div class="o-tabs px-4">
              @for (t of tabs; track t.v) { <button [class.active]="tab() === t.v" (click)="tab.set(t.v)"><o-icon [name]="t.i" [size]="14" />{{ t.l }}</button> }
            </div>
            <div class="flex flex-col gap-4 p-4">
              @switch (tab()) {
                @case ('general') {
                  <label class="o-field"><span class="o-label">Tên Pocket</span><input class="o-input" [(ngModel)]="d.name" maxlength="80" /></label>
                  <div class="o-field"><span class="o-label">Màu nhận diện</span>
                    <div class="flex flex-wrap gap-2">@for (c of colors; track c) { <button class="sw" [style.background]="c" [class.on]="d.color === c" (click)="d.color = c" [attr.aria-label]="'Màu ' + c"></button> }<input type="color" class="sw" [(ngModel)]="d.color" title="Màu tùy chỉnh" /></div>
                  </div>
                  <label class="o-field"><span class="o-label">Mô tả</span><textarea class="o-textarea" rows="2" [(ngModel)]="d.description" maxlength="500"></textarea></label>
                  <label class="o-field"><span class="o-label">Thẻ (tối đa 10, cách nhau bằng dấu phẩy)</span><input class="o-input" [(ngModel)]="d.tags" placeholder="#Fashion, #Reels" /></label>
                  <div class="o-tile flex items-center gap-3">
                    <o-icon name="fingerprint" [size]="18" class="o-secondary" />
                    <div class="flex-1 min-w-0"><div class="text-label-md">Nhiễu Canvas cho mọi profile trình duyệt</div><div class="text-label-sm o-muted">Áp dụng cho tất cả Browser Profile thuộc Pocket</div></div>
                    <button class="o-switch" [class.on]="canvasNoise()" (click)="toggleCanvas(ws.id)" [attr.aria-pressed]="canvasNoise()" aria-label="Nhiễu Canvas"></button>
                  </div>
                }
                @case ('voice') {
                  <label class="o-field"><span class="o-label">Giọng thương hiệu (Brand Voice)</span>
                    <textarea class="o-textarea" rows="5" [(ngModel)]="d.brandVoice" maxlength="2000" placeholder="VD: Thân thiện, xưng “em” – gọi khách là “chị/nàng”, ngắn gọn, nhấn mạnh chất liệu…"></textarea>
                    <span class="o-hint">AI dùng khi viết caption, kịch bản video và trả lời bình luận / tin nhắn. {{ d.brandVoice.length }}/2000</span>
                  </label>
                  <label class="o-field"><span class="o-label">Kiến thức trả lời khách (giá, size, ship, đổi trả…)</span>
                    <textarea class="o-textarea" rows="8" [(ngModel)]="d.knowledge" maxlength="8000" placeholder="Chính sách đổi trả 7 ngày, miễn phí ship đơn từ 499k…"></textarea>
                    <span class="o-hint">Hộp thư hợp nhất dùng nội dung này để AI soạn câu trả lời chính xác. {{ d.knowledge.length }}/8000</span>
                  </label>
                }
                @case ('hours') {
                  <div class="flex items-center justify-between"><span class="o-label">Khung giờ vàng đăng bài</span><button class="o-btn o-btn-sm" (click)="addSlot()" [disabled]="d.goldenHours.length >= 8"><o-icon name="plus" [size]="13" /> Thêm khung</button></div>
                  @for (s of d.goldenHours; track $index; let i = $index) {
                    <div class="slot">
                      <input class="o-input" type="time" [(ngModel)]="s.start" aria-label="Bắt đầu" />
                      <span class="o-muted">→</span>
                      <input class="o-input" type="time" [(ngModel)]="s.end" aria-label="Kết thúc" />
                      <input class="o-range" type="range" min="0" max="1" step="0.01" [(ngModel)]="s.weight" aria-label="Trọng số" />
                      <span class="font-mono text-body-sm" style="width: 38px; text-align: right">{{ (s.weight * 100).toFixed(0) }}%</span>
                      <button class="o-icon-btn" (click)="d.goldenHours.splice(i, 1)" aria-label="Xóa khung"><o-icon name="trash" [size]="14" /></button>
                    </div>
                  } @empty { <div class="o-empty" style="padding: 16px">Chưa có khung giờ vàng – lịch đăng sẽ rải đều trong ngày.</div> }
                  @if (slotError()) { <div class="o-banner warning text-body-sm"><o-icon name="alert" [size]="14" class="o-warning" />{{ slotError() }}</div> }
                  <div class="flex gap-2">
                    <button class="o-btn o-btn-sm o-btn-subtle" (click)="d.goldenHours = defaultSlots()">Dùng mẫu gợi ý</button>
                    <button class="o-btn o-btn-sm o-btn-subtle" (click)="normalize()">Chuẩn hóa tổng = 100%</button>
                    <button class="o-btn o-btn-sm o-btn-subtle" (click)="learnHours(ws.id)" [disabled]="learning()"><o-icon name="sparkles" [size]="13" /> Học từ số liệu</button>
                  </div>
                  <div class="day-strip" aria-hidden="true">@for (h of hours; track h) { <div class="hcell" [style.opacity]="0.12 + hourW(h) * 0.88"></div> }</div>
                  <div class="flex justify-between text-label-sm o-faint font-mono"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
                }
                @case ('watermark') {
                  <div class="flex items-center gap-2 flex-wrap">
                    <button class="o-btn o-btn-sm" (click)="pickWatermark()"><o-icon name="upload" [size]="13" /> Chọn ảnh watermark</button>
                    @if (d.watermarkPath) { <button class="o-btn o-btn-sm o-btn-subtle" (click)="d.watermarkPath = null"><o-icon name="trash" [size]="13" /> Bỏ watermark</button> }
                    <div class="o-seg ml-auto">@for (a of ['9:16', '16:9']; track a) { <button [class.active]="previewAspect() === a" (click)="previewAspect.set(a)">{{ a }}</button> }</div>
                  </div>
                  <label class="o-field"><span class="o-label">Hoặc dán URL ảnh</span><input class="o-input" [(ngModel)]="d.watermarkPath" placeholder="https://…/logo.png" /></label>
                  <!-- WatermarkPlacer -->
                  <div #stage class="stage" [class.portrait]="previewAspect() === '9:16'" (pointermove)="onDrag($event)" (pointerup)="drag.set(false)" (pointerleave)="drag.set(false)">
                    <div class="stage-bg"></div>
                    @if (drag()) {
                      @if (Math.abs(d.watermarkX - 0.5) < 0.02) { <div class="guide v"></div> }
                      @if (Math.abs(d.watermarkY - 0.5) < 0.02) { <div class="guide h"></div> }
                    }
                    @if (d.watermarkPath) {
                      <img class="wm" [src]="d.watermarkPath" alt="Watermark" draggable="false" [style.left.%]="d.watermarkX * 100" [style.top.%]="d.watermarkY * 100" [style.opacity]="d.watermarkOpacity" (pointerdown)="startDrag($event)" />
                    } @else { <div class="o-empty" style="position: absolute; inset: 0">Không có watermark</div> }
                  </div>
                  <div class="flex flex-wrap gap-1">@for (p of positions; track p.v) { <button class="o-chip" [class.active]="d.watermarkPosition === p.v" (click)="setPos(p)">{{ p.l }}</button> }</div>
                  <label class="o-field"><span class="o-label">Độ đậm {{ (d.watermarkOpacity * 100).toFixed(0) }}%</span><input class="o-range" type="range" min="0.05" max="1" step="0.01" [(ngModel)]="d.watermarkOpacity" /></label>
                  <div class="text-label-sm o-faint">Kéo logo để đặt vị trí tự do – X {{ (d.watermarkX * 100).toFixed(0) }}% · Y {{ (d.watermarkY * 100).toFixed(0) }}%. Áp dụng khi render video của Pocket.</div>
                }
                @case ('budget') {
                  <label class="o-field"><span class="o-label">Ngân sách tháng (USD)</span>
                    <input class="o-input" inputmode="decimal" [(ngModel)]="d.aiBudgetUsd" placeholder="Để trống = dùng hạn mức chung ở Cài đặt" />
                    @if (capInvalid()) { <span class="o-hint o-error">Số không hợp lệ</span> }
                  </label>
                  <label class="o-field"><span class="o-label">Hạn mức token / tháng (tùy chọn)</span><input class="o-input" inputmode="numeric" [(ngModel)]="d.aiTokenQuota" placeholder="VD: 2000000" /></label>
                  @if (ws.aiBudgetUsd != null) {
                    @let used = budgetPct(ws);
                    <div class="o-tile">
                      <div class="flex justify-between text-body-sm"><span>Đã dùng {{ usd(ws.aiSpentUsd ?? 0) }} ({{ used.toFixed(0) }}%)</span><span [class.o-error]="used >= 90">Còn lại {{ usd(Math.max(0, ws.aiBudgetUsd - (ws.aiSpentUsd ?? 0))) }}</span></div>
                      <div class="o-progress mt-2" [class.danger]="used >= 90"><div [style.width.%]="used"></div></div>
                    </div>
                  }
                  @if (budget(); as b) {
                    <div class="o-tile flex flex-col gap-2">
                      <div class="flex justify-between text-label-md"><span>Toàn hệ thống – tháng {{ b.month }}</span><b>{{ usd(b.spentUsd) }} @if (b.hardCapUsd) { / {{ usd(b.hardCapUsd) }} }</b></div>
                      @for (p of b.byProvider ?? []; track p.providerId ?? p.label) {
                        <div class="flex justify-between text-body-sm"><span class="o-muted">{{ p.label }}</span><span class="font-mono">{{ usd(p.usd) }}</span></div>
                      } @empty { <div class="text-body-sm o-muted">Chưa phát sinh chi phí AI tháng này.</div> }
                    </div>
                  }
                }
              }
              <div class="o-divider"></div>
              <div class="flex flex-wrap gap-2">
                <button class="o-btn o-btn-primary" [disabled]="saving() || !dirty()" (click)="save(ws.id)">@if (saving()) { <o-icon name="loader" [size]="14" class="o-spin" /> } Lưu thay đổi</button>
                <button class="o-btn o-btn-subtle" [disabled]="!dirty()" (click)="reset(ws)">Hoàn tác</button>
                <button class="o-btn o-btn-danger ml-auto" (click)="archive(ws)"><o-icon name="archive" [size]="14" /> Lưu trữ</button>
              </div>
              <div class="text-label-sm o-faint">Tạo lúc {{ date(ws.createdAt) }} · cập nhật {{ date(ws.updatedAt) }}</div>
            </div>
          } @else {
            <div class="o-empty" style="padding: 48px 16px"><o-icon name="layers" [size]="26" />Chọn một Pocket để chỉnh giọng thương hiệu, giờ vàng, watermark và ngân sách AI.</div>
          }
        </aside>
      </div>
    </div>

    <!-- Tạo Pocket -->
    <o-modal [open]="createOpen()" title="Tạo Pocket mới" subtitle="Một Pocket = một nhóm kênh cùng ngách / khách hàng" (closed)="createOpen.set(false)">
      <label class="o-field"><span class="o-label">Tên Pocket</span><input class="o-input" [(ngModel)]="nw.name" maxlength="80" placeholder="VD: Thời trang nữ công sở" /></label>
      <div class="o-field"><span class="o-label">Màu</span><div class="flex flex-wrap gap-2">@for (c of colors; track c) { <button class="sw" [style.background]="c" [class.on]="nw.color === c" (click)="nw.color = c"></button> }</div></div>
      <label class="o-field"><span class="o-label">Mô tả</span><textarea class="o-textarea" rows="2" [(ngModel)]="nw.description"></textarea></label>
      <label class="o-field"><span class="o-label">Giọng thương hiệu</span><textarea class="o-textarea" rows="3" [(ngModel)]="nw.brandVoice"></textarea></label>
      <label class="o-field"><span class="o-label">Thẻ</span><input class="o-input" [(ngModel)]="nw.tags" placeholder="#Fashion, #Reels" /></label>
      <label class="o-check"><input type="checkbox" [(ngModel)]="nw.slots" /> Dùng khung giờ vàng gợi ý (11:00–13:00, 19:30–22:00)</label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="createOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="saving() || !nw.name.trim()" (click)="create()">Tạo Pocket</button>
      </div>
    </o-modal>

    <!-- Đã lưu trữ -->
    <o-modal [open]="archivedOpen()" title="Pocket đã lưu trữ" subtitle="Ẩn khỏi mọi danh sách – khôi phục bất cứ lúc nào" (closed)="archivedOpen.set(false)">
      @for (w of archived(); track w.id) {
        <div class="o-tile flex items-center gap-3">
          <div class="pk-ico" style="width: 32px; height: 32px" [style.background]="w.color || '#c0c1ff'">{{ (w.name || '?').slice(0, 1) }}</div>
          <div class="flex-1 min-w-0"><div class="font-semibold truncate">{{ w.name }}</div><div class="text-label-sm o-muted">{{ w.channelCount ?? 0 }} kênh · lưu trữ {{ date(w.archivedAt) }}</div></div>
          <button class="o-btn o-btn-sm" (click)="restore(w.id)"><o-icon name="undo" [size]="13" /> Khôi phục</button>
        </div>
      } @empty { <div class="o-empty">Không có Pocket nào đã lưu trữ</div> }
    </o-modal>
  `,
  styles: [
    `.stat { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
     .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
     @media (min-width: 1280px) { .layout { grid-template-columns: minmax(0, 1fr) 440px; } .panel { position: sticky; top: 0; max-height: calc(100vh - 120px); overflow: auto; } }
     .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
     .pocket { padding: 16px; cursor: pointer; text-align: left; color: inherit; font: inherit; transition: border-color .15s, transform .15s; }
     .pocket:hover { border-color: rgb(var(--c-primary) / 0.3); }
     .pocket.sel { border-color: rgb(var(--c-primary) / 0.6); box-shadow: 0 0 0 1px rgb(var(--c-primary) / 0.25); }
     .pk-ico { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: rgb(16 0 50 / 0.85); flex-shrink: 0; }
     .line2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
     .sw { width: 26px; height: 26px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; padding: 0; }
     .sw.on { border-color: rgb(var(--c-on-surface)); }
     input[type='color'].sw { background: none; }
     .slot { display: grid; grid-template-columns: 96px auto 96px 1fr auto auto; align-items: center; gap: 8px; }
     .day-strip { display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; }
     .hcell { height: 16px; border-radius: 3px; background: rgb(var(--c-tertiary)); }
     .stage { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: rgb(var(--c-surface-container-lowest)); border: 1px dashed rgb(var(--c-outline-variant)); touch-action: none; }
     .stage.portrait { aspect-ratio: 9 / 16; max-width: 240px; margin: 0 auto; }
     .stage-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgb(var(--c-primary) / 0.18), rgb(var(--c-secondary) / 0.12)), repeating-linear-gradient(45deg, transparent 0 12px, rgb(var(--c-overlay) / 0.03) 12px 24px); }
     .wm { position: absolute; transform: translate(-50%, -50%); max-width: 28%; max-height: 22%; cursor: grab; user-select: none; }
     .wm:active { cursor: grabbing; }
     .guide { position: absolute; background: rgb(var(--c-secondary)); pointer-events: none; }
     .guide.v { left: 50%; top: 0; bottom: 0; width: 1px; }
     .guide.h { top: 50%; left: 0; right: 0; height: 1px; }`,
  ],
})
export class WorkspacesPageComponent {
  readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  private readonly route = inject(ActivatedRoute);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly Math = Math;
  readonly colors = COLORS;
  readonly positions = POS;
  readonly platforms = PLATFORM_ORDER;
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly tabs = [
    { v: 'general', l: 'Chung', i: 'edit' },
    { v: 'voice', l: 'Brand Voice', i: 'message' },
    { v: 'hours', l: 'Giờ vàng', i: 'clock' },
    { v: 'watermark', l: 'Watermark', i: 'stamp' },
    { v: 'budget', l: 'Ngân sách AI', i: 'dollar' },
  ];

  readonly list = signal<any[]>([]);
  readonly archived = signal<any[]>([]);
  readonly loading = signal(true);
  readonly selId = signal<string | null>(null);
  readonly tab = signal('general');
  readonly saving = signal(false);
  readonly exporting = signal(false);
  readonly learning = signal(false);
  readonly createOpen = signal(false);
  readonly archivedOpen = signal(false);
  readonly canvasNoise = signal(true);
  readonly budget = signal<any>(null);
  readonly drag = signal(false);
  readonly previewAspect = signal('9:16');
  /** đổi để kích hoạt computed dirty() vì draft là object thường */
  private readonly tick = signal(0);
  d: Draft = toDraft({});
  private base = '';
  nw = { name: '', color: COLORS[0], description: '', brandVoice: '', tags: '', slots: true };

  readonly usd = (n: any) => fmtUsd(n);
  readonly date = fmtDate;
  readonly sel = computed(() => this.list().find((w) => w.id === this.selId()) ?? null);
  readonly totalChannels = computed(() => this.list().reduce((s, w) => s + (w.channelCount ?? 0), 0));
  readonly totalUnhealthy = computed(() => this.list().reduce((s, w) => s + (w.unhealthyChannels ?? 0), 0));
  readonly totalSpent = computed(() => this.list().reduce((s, w) => s + (w.aiSpentUsd ?? 0), 0));

  constructor() {
    void this.api.invokeRaw('settings.budget').then((r) => r.ok && this.budget.set(r.data));
    this.route.queryParamMap.subscribe((q) => q.get('new') && this.openCreate());
    effect(() => {
      this.shell.ver('workspaces');
      void this.load();
    });
  }

  meta(p: string) {
    return PLATFORM_META[p];
  }
  pad(n: number) {
    return String(n).padStart(2, '0');
  }
  platformCount(w: any, p: string): number {
    return w.platformCounts?.[p] ?? 0;
  }
  budgetPct(w: any) {
    return w.aiBudgetUsd ? Math.min(100, ((w.aiSpentUsd ?? 0) / w.aiBudgetUsd) * 100) : 0;
  }
  defaultSlots() {
    return DEFAULT_SLOTS.map((s) => ({ ...s }));
  }

  dirty() {
    this.tick();
    return JSON.stringify(this.d) !== this.base;
  }

  capInvalid() {
    const v = this.d.aiBudgetUsd.trim();
    return v !== '' && (isNaN(+v) || +v < 0 || +v > 100000);
  }

  slotError(): string | null {
    for (const s of this.d.goldenHours) if (!s.start || !s.end || s.start >= s.end) return `Khung ${s.start || '?'}–${s.end || '?'}: giờ kết thúc phải sau giờ bắt đầu`;
    const sorted = [...this.d.goldenHours].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i - 1].end) return `Khung ${sorted[i - 1].start}–${sorted[i - 1].end} chồng lên ${sorted[i].start}–${sorted[i].end}`;
    return null;
  }

  hourW(h: number) {
    const hh = String(h).padStart(2, '0') + ':30';
    const max = Math.max(0.01, ...this.d.goldenHours.map((s) => +s.weight));
    const s = this.d.goldenHours.find((x) => x.start <= hh && hh < x.end);
    return s ? +s.weight / max : 0;
  }

  async load() {
    const r = await this.api.invokeRaw('workspaces.list');
    this.loading.set(false);
    if (!r.ok) return this.api.toast('Không tải được Pocket', errOf(r), 'error');
    const l = asList(r.data);
    this.list.set(l);
    this.shell.workspaces.set(l);
    const cur = this.selId() ?? this.api.activeWorkspaceId() ?? l[0]?.id ?? null;
    const w = l.find((x) => x.id === cur) ?? l[0];
    if (w && (!this.selId() || !this.dirty())) this.select(w);
    void this.api.invokeRaw('workspaces.listArchived').then((a) => a.ok && this.archived.set(asList(a.data)));
  }

  select(w: any) {
    if (this.selId() && this.selId() !== w.id && this.dirty() && !confirm('Có thay đổi chưa lưu – bỏ qua và chuyển Pocket?')) return;
    this.selId.set(w.id);
    this.reset(w);
  }

  reset(w: any) {
    this.d = toDraft(w);
    this.base = JSON.stringify(this.d);
    this.tick.update((n) => n + 1);
  }

  activate(id: string) {
    this.api.setWorkspaceId(id);
    this.shell.bump('workspace');
    this.api.toast('Đã chuyển Pocket đang dùng', this.sel()?.name, 'success');
  }

  addSlot() {
    const last = this.d.goldenHours[this.d.goldenHours.length - 1];
    const startH = last ? Math.min(22, +last.end.slice(0, 2) + 1) : 8;
    this.d.goldenHours.push({ start: `${String(startH).padStart(2, '0')}:00`, end: `${String(Math.min(23, startH + 1)).padStart(2, '0')}:30`, weight: 0.2 });
  }

  normalize() {
    const sum = this.d.goldenHours.reduce((s, x) => s + +x.weight, 0);
    if (sum > 0) this.d.goldenHours.forEach((x) => (x.weight = Math.round((+x.weight / sum) * 100) / 100));
  }

  async learnHours(workspaceId: string) {
    this.learning.set(true);
    const r = await this.api.invokeRaw<any>('insights.bestHours', { workspaceId });
    this.learning.set(false);
    if (!r.ok) return this.api.toast('Chưa học được giờ vàng', errOf(r), 'error');
    const slots = asList<Slot>(r.data?.suggested ?? r.data?.slots ?? r.data);
    if (!slots.length) return this.api.toast('Chưa đủ số liệu', 'Cần bài đã đăng trong 90 ngày để học giờ vàng', 'info');
    this.d.goldenHours = slots.map((s) => ({ start: s.start, end: s.end, weight: s.weight }));
    this.api.toast('Đã đề xuất giờ vàng từ số liệu', 'Kiểm tra rồi bấm Lưu thay đổi', 'success');
  }

  setPos(p: (typeof POS)[number]) {
    this.d.watermarkPosition = p.v;
    this.d.watermarkX = p.x;
    this.d.watermarkY = p.y;
  }

  startDrag(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    this.drag.set(true);
  }

  onDrag(e: PointerEvent) {
    if (!this.drag()) return;
    const el = this.stage()?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    let y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (Math.abs(x - 0.5) < 0.02) x = 0.5;
    if (Math.abs(y - 0.5) < 0.02) y = 0.5;
    this.d.watermarkX = Math.round(x * 1000) / 1000;
    this.d.watermarkY = Math.round(y * 1000) / 1000;
  }

  async pickWatermark() {
    const [f] = await pickFiles({ accept: 'image/png,image/webp,image/jpeg,image/svg+xml', maxMb: 4 });
    if (!f) return;
    // Backend lưu file lên Storage và trả đường dẫn; nếu chưa hỗ trợ thì dùng tạm dataURL để xem trước
    const r = await this.api.invokeRaw<any>('system.pickImage', { files: [{ name: f.name, dataUrl: f.dataUrl }], purpose: 'watermark' });
    const path = r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data?.path ?? r.data) : null;
    this.d.watermarkPath = typeof path === 'string' && path ? path : f.dataUrl;
    this.tick.update((n) => n + 1);
  }

  private patchFromDraft() {
    const tags = this.d.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
    return {
      name: this.d.name.trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(this.d.color) ? this.d.color : undefined,
      icon: this.d.icon || null,
      description: this.d.description || null,
      brandVoice: this.d.brandVoice || null,
      knowledge: this.d.knowledge || null,
      tags,
      goldenHours: this.d.goldenHours.map((s) => ({ start: s.start, end: s.end, weight: +s.weight })),
      aiBudgetUsd: this.d.aiBudgetUsd.trim() === '' ? null : +this.d.aiBudgetUsd,
      aiTokenQuota: this.d.aiTokenQuota.trim() === '' ? null : Math.round(+this.d.aiTokenQuota),
      watermarkPath: this.d.watermarkPath || null,
      watermarkPosition: this.d.watermarkPosition,
      watermarkX: this.d.watermarkX,
      watermarkY: this.d.watermarkY,
      watermarkOpacity: Math.max(0.05, +this.d.watermarkOpacity),
    };
  }

  async save(id: string) {
    if (!this.d.name.trim()) return this.api.toast('Nhập tên Pocket', undefined, 'warn');
    if (this.capInvalid()) return this.api.toast('Ngân sách không hợp lệ', undefined, 'warn');
    const se = this.slotError();
    if (se) return this.api.toast('Giờ vàng chưa hợp lệ', se, 'warn');
    this.saving.set(true);
    const r = await this.api.invokeRaw('workspaces.update', { id, patch: this.patchFromDraft() });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không lưu được Pocket', errOf(r), 'error');
    this.api.toast('Đã lưu Pocket', this.d.name, 'success');
    this.base = JSON.stringify(this.d);
    this.tick.update((n) => n + 1);
    this.shell.bump('dashboard');
    await this.load();
  }

  openCreate() {
    this.nw = { name: '', color: COLORS[this.list().length % COLORS.length], description: '', brandVoice: '', tags: '', slots: true };
    this.createOpen.set(true);
  }

  async create() {
    this.saving.set(true);
    const r = await this.api.invokeRaw<any>('workspaces.create', {
      name: this.nw.name.trim(),
      color: this.nw.color,
      description: this.nw.description || null,
      brandVoice: this.nw.brandVoice || null,
      tags: this.nw.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10),
      goldenHours: this.nw.slots ? DEFAULT_SLOTS : [],
    });
    this.saving.set(false);
    if (!r.ok) return this.api.toast('Không tạo được Pocket', errOf(r), 'error');
    this.createOpen.set(false);
    this.api.toast('Đã tạo Pocket', this.nw.name, 'success');
    this.selId.set(r.data?.id ?? null);
    await this.load();
  }

  async archive(w: any) {
    if (!confirm(`Lưu trữ Pocket “${w.name}”? Pocket sẽ ẩn khỏi mọi danh sách, có thể khôi phục sau.`)) return;
    const r = await this.api.invokeRaw('workspaces.archive', { id: w.id });
    if (!r.ok) return this.api.toast('Không lưu trữ được', errOf(r), 'error');
    if (this.api.activeWorkspaceId() === w.id) this.api.setWorkspaceId(null);
    this.selId.set(null);
    this.api.toast('Đã lưu trữ Pocket', w.name, 'success');
    await this.load();
  }

  async openArchived() {
    this.archivedOpen.set(true);
    const a = await this.api.invokeRaw('workspaces.listArchived');
    if (a.ok) this.archived.set(asList(a.data));
  }

  async restore(id: string) {
    const r = await this.api.invokeRaw('workspaces.restore', { id });
    if (!r.ok) return this.api.toast('Không khôi phục được', errOf(r), 'error');
    this.api.toast('Đã khôi phục Pocket', undefined, 'success');
    this.archived.update((l) => l.filter((w) => w.id !== id));
    await this.load();
  }

  async toggleCanvas(id: string) {
    const next = !this.canvasNoise();
    const r = await this.api.invokeRaw('workspaces.setCanvasNoise', { id, enabled: next });
    if (!r.ok) return this.api.toast('Không đổi được', errOf(r), 'error');
    this.canvasNoise.set(next);
    this.api.toast(next ? 'Đã bật nhiễu Canvas' : 'Đã tắt nhiễu Canvas', 'Áp dụng cho mọi profile trình duyệt của Pocket', 'success');
  }

  async exportCfg() {
    this.exporting.set(true);
    const r = await this.api.invokeRaw<any>('workspaces.export');
    this.exporting.set(false);
    if (!r.ok) return this.api.toast('Không xuất được cấu hình', errOf(r), 'error');
    const data = r.data && typeof r.data === 'object' && !('path' in r.data) ? r.data : { exportedAt: new Date().toISOString(), workspaces: this.list() };
    downloadText(`omnipage-pockets-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
    this.api.toast('Đã xuất cấu hình Pocket', 'Không gồm cookie / token / mật khẩu', 'success');
  }
}
