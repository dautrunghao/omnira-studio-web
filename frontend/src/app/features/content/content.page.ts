import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { pickFiles } from '../../shared/file-pick';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, asList, errOf, fmtCompact, fmtDateTime, fmtRelative, splitTags, toLocalInput } from '../../shared/util';

const STATUS: { v: string; l: string; tone: string }[] = [
  { v: 'draft', l: 'Nháp', tone: '' },
  { v: 'ready', l: 'Sẵn sàng', tone: 'secondary' },
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'primary' },
  { v: 'published', l: 'Đã đăng', tone: 'success' },
  { v: 'failed', l: 'Lỗi', tone: 'danger' },
];
const KINDS: { v: string; l: string; icon: string }[] = [
  { v: 'video', l: 'Video', icon: 'video' },
  { v: 'reel', l: 'Reel / Short', icon: 'film' },
  { v: 'image', l: 'Ảnh', icon: 'image' },
  { v: 'carousel', l: 'Carousel', icon: 'images' },
  { v: 'text', l: 'Bài viết', icon: 'edit' },
];
const ASPECTS = ['9:16', '1:1', '4:5', '16:9'];

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="o-page">
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="folder" [size]="20" /></div>
        <div class="min-w-0">
          <h1 class="o-page-title">Kho nội dung</h1>
          <p class="o-page-desc">{{ stats()?.total ?? items().length }} nội dung · {{ stats()?.ready ?? countStatus('ready') }} sẵn sàng đăng · {{ stats()?.createdToday ?? 0 }} tạo hôm nay</p>
        </div>
        <div class="o-page-actions">
          <button class="o-btn o-btn-primary" (click)="openEditor(null)"><o-icon name="plus" [size]="15" /> Tạo nội dung</button>
        </div>
      </div>

      <div class="o-grid-kpi">
        @for (k of kinds; track k.v) {
          <button class="o-tile kt" [class.on]="kind() === k.v" (click)="kind.set(kind() === k.v ? '' : k.v)">
            <o-icon [name]="k.icon" [size]="16" class="o-secondary" /><span class="flex-1 text-left text-body-sm">{{ k.l }}</span><b class="font-mono">{{ byKind(k.v) }}</b>
          </button>
        }
      </div>

      <!-- Bộ lọc -->
      <div class="flex flex-wrap items-center gap-2">
        <button class="o-chip" [class.active]="!status().length" (click)="status.set([])">Tất cả</button>
        @for (s of statuses; track s.v) {
          <button class="o-chip" [class.active]="status().includes(s.v)" (click)="toggleStatus(s.v)">{{ s.l }} <span class="o-badge mono">{{ countStatus(s.v) }}</span></button>
        }
        <div class="relative ml-auto" style="width: 280px">
          <o-icon name="search" [size]="14" class="o-muted" style="position: absolute; left: 10px; top: 11px" />
          <input class="o-input" style="padding-left: 30px" placeholder="Tìm tiêu đề, caption, hashtag…" [ngModel]="search()" (ngModelChange)="onSearch($event)" />
        </div>
        <div class="o-seg">
          <button [class.active]="layout() === 'grid'" (click)="layout.set('grid')" aria-label="Lưới"><o-icon name="grid" [size]="13" /></button>
          <button [class.active]="layout() === 'list'" (click)="layout.set('list')" aria-label="Danh sách"><o-icon name="list" [size]="13" /></button>
        </div>
      </div>

      <!-- Thanh hàng loạt -->
      @if (checked().size) {
        <div class="o-banner primary bulk">
          <b>{{ checked().size }} đã chọn</b>
          <button class="o-btn o-btn-sm" (click)="spinOpen.set(true)"><o-icon name="sparkles" [size]="13" /> AI Spin biến thể</button>
          <button class="o-btn o-btn-sm" [disabled]="busy()" (click)="hashtags()"><o-icon name="hash" [size]="13" /> Gợi ý hashtag AI</button>
          <button class="o-btn o-btn-sm" (click)="autoOpen.set(true)"><o-icon name="zap" [size]="13" /> Tự xếp lịch giờ vàng</button>
          <select class="o-select" style="width: 200px; height: 28px" #mv (change)="bulkMove(mv.value); mv.value = '__'">
            <option value="__">Chuyển sang Pocket…</option>
            <option value="">— Không thuộc Pocket —</option>
            @for (w of shell.workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }
          </select>
          <button class="o-btn o-btn-sm o-btn-danger" (click)="bulkDelete()"><o-icon name="trash" [size]="13" /> Xóa</button>
          <button class="o-btn o-btn-sm o-btn-subtle ml-auto" (click)="checked.set(emptySet())">Bỏ chọn</button>
        </div>
      }

      @if (loading()) {
        <div class="o-grid-cards">@for (i of [0, 1, 2, 3, 4, 5]; track i) { <div class="o-skel" style="height: 260px"></div> }</div>
      } @else if (layout() === 'grid') {
        <div class="o-grid-cards">
          @for (c of shown(); track c.id) {
            <article class="o-card cc" [class.sel]="checked().has(c.id)">
              <div class="thumb" (click)="openEditor(c)">
                @if (thumb(c); as t) { <img [src]="t" alt="" loading="lazy" /> } @else { <o-icon [name]="kindIcon(c.kind)" [size]="28" class="o-faint" /> }
                <span class="o-badge kind">{{ kindLabel(c.kind) }} @if (c.aspect) { · {{ c.aspect }} }</span>
                @if (c.durationSec) { <span class="o-badge mono dur">{{ c.durationSec }}s</span> }
                @if (c.hookScore?.score != null) { <span class="ring" [class]="'ring ' + scoreTone(c.hookScore.score)" title="Điểm Hook">{{ c.hookScore.score }}</span> }
              </div>
              <div class="p-3 flex flex-col gap-2 flex-1">
                <div class="flex items-start gap-2">
                  <input type="checkbox" [checked]="checked().has(c.id)" (change)="toggle(c.id)" [attr.aria-label]="'Chọn ' + c.title" />
                  <div class="min-w-0 flex-1 cursor-pointer" (click)="openEditor(c)">
                    <div class="font-semibold line2">{{ c.title }}</div>
                    @if (c.caption) { <div class="text-body-sm o-muted line2">{{ c.caption }}</div> }
                  </div>
                </div>
                <div class="flex flex-wrap gap-1">
                  <span class="o-badge" [class]="'o-badge ' + statusTone(c.status)">{{ statusLabel(c.status) }}</span>
                  @if ((c.spinVariants ?? c.variantCount ?? 0) > 0) { <span class="o-badge secondary">{{ c.spinVariants ?? c.variantCount }} biến thể</span> }
                  @if (c.aiReviewed) { <span class="o-badge success">AI đã duyệt</span> }
                  @for (h of (c.hashtags ?? []).slice(0, 3); track h) { <span class="o-badge">{{ h }}</span> }
                </div>
                <div class="flex-1"></div>
                <div class="flex items-center gap-1">
                  <span class="text-label-sm o-faint flex-1">{{ rel(c.updatedAt ?? c.createdAt) }}</span>
                  <button class="o-icon-btn" title="Chấm điểm Hook" (click)="openHook(c)"><o-icon name="target" [size]="15" /></button>
                  <button class="o-icon-btn" title="Biến thể AI" (click)="openVariants(c)"><o-icon name="sparkles" [size]="15" /></button>
                  <button class="o-icon-btn" title="Lên lịch đăng" (click)="openSchedule(c)"><o-icon name="calendar" [size]="15" /></button>
                  <button class="o-icon-btn" title="Xóa" (click)="del(c)"><o-icon name="trash" [size]="15" /></button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="o-card o-empty" style="grid-column: 1 / -1; padding: 48px"><o-icon name="folder" [size]="28" />Chưa có nội dung khớp bộ lọc.<button class="o-btn o-btn-primary mt-2" (click)="openEditor(null)"><o-icon name="plus" [size]="15" /> Tạo nội dung</button></div>
          }
        </div>
      } @else {
        <section class="o-card">
          <div class="o-table-wrap" style="border: 0">
            <table class="o-table">
              <thead><tr><th style="width: 32px"><input type="checkbox" [checked]="allChecked()" (change)="toggleAll()" aria-label="Chọn tất cả" /></th><th>Tiêu đề</th><th>Loại</th><th>Trạng thái</th><th class="text-right">Hook</th><th>Hashtag</th><th>Cập nhật</th><th></th></tr></thead>
              <tbody>
                @for (c of shown(); track c.id) {
                  <tr [class.selected]="checked().has(c.id)">
                    <td><input type="checkbox" [checked]="checked().has(c.id)" (change)="toggle(c.id)" /></td>
                    <td style="max-width: 380px" class="cursor-pointer" (click)="openEditor(c)"><div class="font-semibold truncate">{{ c.title }}</div><div class="text-body-sm o-muted truncate">{{ c.caption }}</div></td>
                    <td><span class="o-badge">{{ kindLabel(c.kind) }}</span></td>
                    <td><span class="o-badge" [class]="'o-badge ' + statusTone(c.status)">{{ statusLabel(c.status) }}</span></td>
                    <td class="text-right font-mono" [class]="'text-right font-mono o-' + scoreTone(c.hookScore?.score)">{{ c.hookScore?.score ?? '—' }}</td>
                    <td class="text-body-sm o-muted truncate" style="max-width: 200px">{{ (c.hashtags ?? []).join(' ') }}</td>
                    <td class="text-label-sm o-faint whitespace-nowrap">{{ rel(c.updatedAt ?? c.createdAt) }}</td>
                    <td class="text-right whitespace-nowrap">
                      <button class="o-icon-btn" title="Chấm điểm Hook" (click)="openHook(c)"><o-icon name="target" [size]="14" /></button>
                      <button class="o-icon-btn" title="Biến thể" (click)="openVariants(c)"><o-icon name="sparkles" [size]="14" /></button>
                      <button class="o-icon-btn" title="Lên lịch" (click)="openSchedule(c)"><o-icon name="calendar" [size]="14" /></button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="8"><div class="o-empty">Chưa có nội dung khớp bộ lọc.</div></td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    <!-- ContentEditor -->
    <o-modal [open]="editorOpen()" [drawer]="true" [title]="ed.id ? 'Sửa nội dung' : 'Tạo nội dung'" [subtitle]="ed.id ? 'Cập nhật ' + rel(ed.updatedAt) : ''" (closed)="editorOpen.set(false)">
      <div class="o-seg">@for (k of kinds; track k.v) { <button [class.active]="ed.kind === k.v" (click)="ed.kind = k.v">{{ k.l }}</button> }</div>
      <label class="o-field"><span class="o-label">Tiêu đề</span><input class="o-input" [(ngModel)]="ed.title" maxlength="300" /></label>
      <label class="o-field"><span class="o-label">Caption</span><textarea class="o-textarea" rows="7" [(ngModel)]="ed.caption" maxlength="5000"></textarea><span class="o-hint">{{ (ed.caption ?? '').length }}/5000</span></label>
      <label class="o-field"><span class="o-label">Hashtag (cách nhau bằng dấu cách hoặc phẩy)</span><input class="o-input" [(ngModel)]="ed.hashtags" /></label>
      <label class="o-field"><span class="o-label">Bình luận đầu tiên (Facebook, Instagram)</span><textarea class="o-textarea" rows="2" [(ngModel)]="ed.firstComment" maxlength="2000" placeholder="Tự đăng ngay sau khi bài lên – VD: link sản phẩm"></textarea></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Tỉ lệ khung hình</span><select class="o-select" [(ngModel)]="ed.aspect"><option [ngValue]="null">—</option>@for (a of aspects; track a) { <option [value]="a">{{ a }}</option> }</select></label>
        <label class="o-field"><span class="o-label">Trạng thái</span><select class="o-select" [(ngModel)]="ed.status"><option value="draft">Nháp</option><option value="ready">Sẵn sàng</option></select></label>
        <label class="o-field"><span class="o-label">Pocket</span><select class="o-select" [(ngModel)]="ed.workspaceId"><option [ngValue]="null">— Không thuộc Pocket —</option>@for (w of shell.workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }</select></label>
      </div>
      <div class="o-field">
        <div class="flex items-center justify-between"><span class="o-label">Tệp đính kèm ({{ ed.mediaPaths.length }}/10)</span><button class="o-btn o-btn-sm" (click)="addMedia()" [disabled]="ed.mediaPaths.length >= 10"><o-icon name="upload" [size]="13" /> Thêm ảnh / video</button></div>
        <div class="flex flex-wrap gap-2">
          @for (m of ed.mediaPaths; track m; let i = $index) {
            <div class="media">
              @if (isVideo(m)) { <o-icon name="video" [size]="20" class="o-muted" /> } @else { <img [src]="m" alt="" /> }
              <button class="o-icon-btn rm" (click)="ed.mediaPaths.splice(i, 1)" aria-label="Bỏ tệp"><o-icon name="x" [size]="12" /></button>
            </div>
          }
        </div>
      </div>
      <div modal-footer>
        @if (ed.id) {
          <button class="o-btn o-btn-subtle" style="margin-right: auto" (click)="openHook(ed)"><o-icon name="target" [size]="14" /> Chấm Hook</button>
          <button class="o-btn" (click)="openSchedule(ed)"><o-icon name="calendar" [size]="14" /> Lên lịch</button>
        }
        <button class="o-btn o-btn-subtle" (click)="editorOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !ed.title.trim()" (click)="saveEditor()">Lưu</button>
      </div>
    </o-modal>

    <!-- HookPanel -->
    <o-modal [open]="!!hookFor()" title="Chấm điểm Hook AI" [subtitle]="hookFor()?.title ?? ''" [wide]="true" (closed)="hookFor.set(null)">
      <div class="flex flex-wrap items-center gap-2">
        <span class="o-label">Nền tảng:</span>
        <div class="o-seg">
          <button [class.active]="!hookPlatform()" (click)="hookPlatform.set(null)">Tự đoán</button>
          @for (p of ['facebook', 'tiktok', 'instagram', 'youtube']; track p) { <button [class.active]="hookPlatform() === p" (click)="hookPlatform.set(p)">{{ meta(p).label }}</button> }
        </div>
        <button class="o-btn o-btn-sm o-btn-primary ml-auto" [disabled]="scoring()" (click)="score(true)">@if (scoring()) { <o-icon name="loader" [size]="13" class="o-spin" /> } Chấm lại</button>
      </div>
      @if (scoring() && !hook()) { <div class="o-skel" style="height: 200px"></div> }
      @if (hook(); as h) {
        <div class="hook-top">
          <div class="score" [class]="'score ' + scoreTone(h.score)"><b>{{ h.score }}</b><span>/100</span></div>
          <div class="flex-1 min-w-0 flex flex-col gap-1">
            <div class="text-body-sm o-muted">Kỹ thuật {{ h.codeScore ?? '–' }} · AI giám khảo {{ h.aiScore ?? '–' }} · {{ meta(h.platform).label || h.platform }} @if (h.model) { · {{ h.model }} }</div>
            @if (h.hook) { <div class="o-tile text-body-sm">“{{ h.hook }}”</div> }
            @if (h.verdict) { <p class="text-body-md">{{ h.verdict }}</p> }
          </div>
        </div>
        @if (h.suggestions?.length) {
          <div class="o-field"><span class="o-label">Gợi ý câu mở đầu tốt hơn</span>
            @for (s of h.suggestions; track s) {
              <div class="o-tile flex items-center gap-2"><o-icon name="sparkles" [size]="14" class="o-primary" /><span class="flex-1 text-body-sm">{{ s }}</span><button class="o-btn o-btn-sm o-btn-subtle" (click)="useHook(s)">Dùng</button></div>
            }
          </div>
        }
        <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))">
          @for (c of h.checks ?? []; track c.id) {
            <div class="o-tile flex items-start gap-2">
              <o-icon [name]="c.points >= 0 ? 'check' : 'x'" [size]="14" [class.o-tertiary]="c.points >= 0" [class.o-error]="c.points < 0" />
              <div class="min-w-0 flex-1"><div class="text-label-md">{{ c.label }} <span class="o-badge mono">{{ c.points > 0 ? '+' : '' }}{{ c.points }}</span> <span class="o-badge">{{ c.source === 'ai' ? 'AI' : 'Kỹ thuật' }}</span></div>@if (c.evidence) { <div class="text-body-sm o-muted">{{ c.evidence }}</div> }</div>
            </div>
          }
        </div>
        @if (healthIssues(h).length) {
          <div class="o-field"><span class="o-label">Sức khỏe nội dung & chính sách nền tảng</span>
            @for (p of healthIssues(h); track $index) {
              <div class="o-banner warning flex-col" style="align-items: flex-start">
                <div class="flex items-center gap-2"><o-icon name="shield" [size]="14" class="o-warning" /><b>{{ p.category ?? p.label ?? 'Rủi ro' }}</b></div>
                @if (p.quote || p.evidence) { <div class="text-body-sm">“{{ p.quote ?? p.evidence }}”</div> }
                @if (p.why) { <div class="text-body-sm o-muted">{{ p.why }}</div> }
                @if (p.fix) { <div class="text-body-sm o-tertiary">Gợi ý sửa: {{ p.fix }}</div> }
              </div>
            }
          </div>
        }
      }
    </o-modal>

    <!-- VariantsPanel -->
    <o-modal [open]="!!variantsFor()" title="Biến thể caption AI" [subtitle]="variantsFor()?.title ?? ''" [wide]="true" (closed)="variantsFor.set(null)">
      <div class="flex items-center gap-2">
        <span class="text-body-sm o-muted">Sinh thêm</span>
        <select class="o-select" style="width: 80px" [(ngModel)]="spinCount">@for (n of [1, 2, 3, 5, 10]; track n) { <option [ngValue]="n">{{ n }}</option> }</select>
        <span class="text-body-sm o-muted">biến thể theo Brand Voice của Pocket</span>
        <button class="o-btn o-btn-sm o-btn-primary ml-auto" [disabled]="busy()" (click)="spin([variantsFor().id], true)">@if (busy()) { <o-icon name="loader" [size]="13" class="o-spin" /> } <o-icon name="sparkles" [size]="13" /> AI Spin</button>
      </div>
      @for (v of variants(); track v.id) {
        <div class="o-tile flex flex-col gap-2">
          <p class="text-body-md" style="white-space: pre-line">{{ v.caption }}</p>
          <div class="flex flex-wrap gap-1">@for (h of v.hashtags ?? []; track h) { <span class="o-badge">{{ h }}</span> }</div>
          <div class="flex items-center gap-2"><span class="text-label-sm o-faint flex-1">{{ v.model }} · {{ rel(v.createdAt) }}</span>
            <button class="o-btn o-btn-sm" (click)="applyVariant(v)"><o-icon name="check" [size]="13" /> Dùng làm caption chính</button>
            <button class="o-icon-btn" (click)="deleteVariant(v)" aria-label="Xóa biến thể"><o-icon name="trash" [size]="14" /></button>
          </div>
        </div>
      } @empty { <div class="o-empty">Chưa có biến thể – bấm AI Spin để sinh caption khác nhau cho từng kênh, tránh trùng lặp.</div> }
    </o-modal>

    <!-- ScheduleDialog -->
    <o-modal [open]="!!schedFor()" title="Lên lịch đăng" [subtitle]="schedFor()?.title ?? ''" (closed)="schedFor.set(null)">
      <div class="o-field"><span class="o-label">Kênh đăng (chọn nhiều)</span>
        <div class="flex flex-col gap-1 o-scroll" style="max-height: 260px">
          @for (c of channels(); track c.id) {
            <label class="o-list-item" [class.active]="sched.channels.has(c.id)">
              <input type="checkbox" [checked]="sched.channels.has(c.id)" (change)="toggleSchedChannel(c.id)" [disabled]="c.quotaBlocked" />
              <span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span>
              <span class="flex-1 truncate">{{ c.name }}</span>
              @if (c.quotaBlocked) { <span class="o-badge warning">Ngoài hạn mức</span> } @else if (c.tokenStatus !== 'valid') { <span class="o-badge warning">Chưa kết nối API</span> }
              <span class="text-label-sm o-muted">{{ compact(c.followers) }}</span>
            </label>
          } @empty { <div class="o-empty">Chưa có kênh – vào Tài khoản & Trang để thêm.</div> }
        </div>
      </div>
      <label class="o-field"><span class="o-label">Thời gian đăng</span><input class="o-input" type="datetime-local" [(ngModel)]="sched.at" /></label>
      <div class="flex flex-wrap gap-1">
        @for (q of quickTimes(); track q.label) { <button class="o-chip" (click)="sched.at = q.value">{{ q.label }}</button> }
      </div>
      <p class="text-label-sm o-faint">Nhiều kênh cùng giờ sẽ được giãn cách tự động theo cài đặt ở Lịch đăng bài.</p>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="schedFor.set(null)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !sched.channels.size" (click)="doSchedule()">Lên lịch {{ sched.channels.size }} kênh</button>
      </div>
    </o-modal>

    <!-- Spin (bulk) -->
    <o-modal [open]="spinOpen()" title="AI Spin hàng loạt" [subtitle]="checked().size + ' nội dung đã chọn'" (closed)="spinOpen.set(false)">
      <label class="o-field"><span class="o-label">Số biến thể mỗi nội dung</span><select class="o-select" [(ngModel)]="spinCount">@for (n of [1, 2, 3, 5, 10]; track n) { <option [ngValue]="n">{{ n }}</option> }</select></label>
      <p class="text-body-sm o-muted">AI viết lại caption + hashtag theo Brand Voice, chạy tuần tự từng nội dung. Chi phí tính vào ngân sách AI của Pocket.</p>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="spinOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy()" (click)="spin([...checked()], false)">@if (busy()) { <o-icon name="loader" [size]="13" class="o-spin" /> } Bắt đầu</button>
      </div>
    </o-modal>

    <!-- AutoSchedule -->
    <o-modal [open]="autoOpen()" title="Tự xếp lịch theo giờ vàng" [subtitle]="checked().size + ' nội dung đã chọn'" (closed)="autoOpen.set(false)">
      <p class="text-body-sm o-muted">Mỗi nội dung → kênh phù hợp định dạng (ít bài nhất 7 ngày tới) trong Pocket của nó, vào khung giờ vàng sớm nhất còn trống.</p>
      <label class="o-field"><span class="o-label">Khoảng cách tối thiểu giữa 2 bài cùng kênh: {{ spacing }} giờ</span><input class="o-range" type="range" min="1" max="24" [(ngModel)]="spacing" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="autoOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy()" (click)="autoSchedule()"><o-icon name="zap" [size]="13" /> Xếp lịch</button>
      </div>
    </o-modal>
  `,
  styles: [
    `.kt { display: flex; align-items: center; gap: 10px; border: 1px solid transparent; cursor: pointer; color: inherit; font: inherit; }
     .kt.on { border-color: rgb(var(--c-primary) / 0.5); background: rgb(var(--c-primary) / 0.08); }
     .bulk { flex-wrap: wrap; position: sticky; top: 0; z-index: 5; }
     .cc { display: flex; flex-direction: column; overflow: hidden; }
     .cc.sel { border-color: rgb(var(--c-primary) / 0.55); }
     .thumb { position: relative; height: 150px; background: rgb(var(--c-surface-container-lowest)); display: flex; align-items: center; justify-content: center; cursor: pointer; }
     .thumb img { width: 100%; height: 100%; object-fit: cover; }
     .thumb .kind { position: absolute; left: 8px; top: 8px; background: rgb(0 0 0 / 0.55); color: #fff; }
     .thumb .dur { position: absolute; right: 8px; bottom: 8px; background: rgb(0 0 0 / 0.55); color: #fff; }
     .ring { position: absolute; right: 8px; top: 8px; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .75rem; background: rgb(0 0 0 / 0.6); color: #fff; border: 2px solid rgb(var(--c-outline)); }
     .ring.tertiary { border-color: rgb(var(--c-success)); } .ring.warning { border-color: rgb(var(--c-warning)); } .ring.error { border-color: rgb(var(--c-danger)); }
     .line2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
     .media { position: relative; width: 72px; height: 72px; border-radius: 10px; overflow: hidden; background: rgb(var(--c-surface-container-lowest)); display: flex; align-items: center; justify-content: center; }
     .media img { width: 100%; height: 100%; object-fit: cover; }
     .media .rm { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgb(0 0 0 / 0.6); color: #fff; }
     .hook-top { display: flex; gap: 16px; align-items: flex-start; }
     .score { width: 92px; height: 92px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid rgb(var(--c-outline)); flex-shrink: 0; }
     .score b { font-size: 1.75rem; line-height: 1; } .score span { font-size: .6875rem; color: rgb(var(--c-on-surface-variant)); }
     .score.tertiary { border-color: rgb(var(--c-success)); } .score.warning { border-color: rgb(var(--c-warning)); } .score.error { border-color: rgb(var(--c-danger)); }`,
  ],
})
export class ContentPageComponent {
  private readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly statuses = STATUS;
  readonly kinds = KINDS;
  readonly aspects = ASPECTS;
  readonly items = signal<any[]>([]);
  readonly stats = signal<any>(null);
  readonly loading = signal(true);
  readonly status = signal<string[]>([]);
  readonly kind = signal('');
  readonly search = signal('');
  readonly layout = signal<'grid' | 'list'>('grid');
  readonly checked = signal<Set<string>>(new Set());
  readonly busy = signal(false);
  readonly editorOpen = signal(false);
  readonly hookFor = signal<any>(null);
  readonly hook = signal<any>(null);
  readonly hookPlatform = signal<string | null>(null);
  readonly scoring = signal(false);
  readonly variantsFor = signal<any>(null);
  readonly variants = signal<any[]>([]);
  readonly schedFor = signal<any>(null);
  readonly channels = signal<any[]>([]);
  readonly spinOpen = signal(false);
  readonly autoOpen = signal(false);
  spinCount = 3;
  spacing = 4;
  ed: any = this.blank();
  sched = { channels: new Set<string>(), at: toLocalInput(Date.now() + 3600000) };
  private searchTimer: any;

  readonly compact = fmtCompact;
  readonly rel = fmtRelative;
  readonly dt = fmtDateTime;

  readonly shown = computed(() => {
    const k = this.kind();
    const st = this.status();
    return this.items().filter((c) => (!k || c.kind === k) && (!st.length || st.includes(c.status)));
  });
  readonly allChecked = computed(() => this.shown().length > 0 && this.shown().every((c) => this.checked().has(c.id)));

  constructor() {
    effect(() => {
      this.api.activeWorkspaceId();
      this.search();
      this.shell.ver('workspace');
      this.shell.ver('content');
      void this.load();
    });
    this.route.queryParamMap.subscribe((q) => {
      if (q.get('new')) this.openEditor(null);
      const id = q.get('id');
      if (id) this.pendingOpen = id;
    });
  }
  private pendingOpen: string | null = null;

  private blank() {
    return { id: null, kind: 'reel', title: '', caption: '', hashtags: '', firstComment: '', aspect: '9:16', status: 'draft', workspaceId: this.api.activeWorkspaceId(), mediaPaths: [] as string[], updatedAt: null };
  }

  emptySet() {
    return new Set<string>();
  }
  meta(p: string) {
    return PLATFORM_META[p] ?? { label: p ?? '', short: (p ?? '?').slice(0, 2).toUpperCase() };
  }
  statusLabel(s: string) {
    return STATUS.find((x) => x.v === s)?.l ?? s;
  }
  statusTone(s: string) {
    return STATUS.find((x) => x.v === s)?.tone ?? '';
  }
  kindLabel(k: string) {
    return KINDS.find((x) => x.v === k)?.l ?? k;
  }
  kindIcon(k: string) {
    return KINDS.find((x) => x.v === k)?.icon ?? 'file';
  }
  scoreTone(s: number | null | undefined) {
    return s == null ? 'muted' : s >= 75 ? 'tertiary' : s >= 50 ? 'warning' : 'error';
  }
  countStatus(s: string) {
    const st = this.stats()?.byStatus?.[s];
    return st ?? this.items().filter((c) => c.status === s).length;
  }
  byKind(k: string) {
    return this.stats()?.byKind?.[k] ?? this.items().filter((c) => c.kind === k).length;
  }
  thumb(c: any): string | null {
    const t = c.thumbnailPath ?? c.thumbnailUrl ?? (c.mediaPaths ?? []).find((m: string) => !this.isVideo(m));
    return t && /^(https?:|data:|\/)/.test(t) ? t : null;
  }
  isVideo(p: string) {
    return /\.(mp4|mov|webm|mkv|m4v)(\?|$)/i.test(p) || p.startsWith('data:video');
  }
  healthIssues(h: any): any[] {
    const hh = h.health;
    if (!hh) return [];
    return [...asList(hh.policy), ...asList(hh.issues ?? hh)].slice(0, 8);
  }

  onSearch(v: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search.set(v), 300);
  }
  toggleStatus(s: string) {
    this.status.update((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
  }
  toggle(id: string) {
    const s = new Set(this.checked());
    s.has(id) ? s.delete(id) : s.add(id);
    this.checked.set(s);
  }
  toggleAll() {
    this.checked.set(this.allChecked() ? new Set() : new Set(this.shown().map((c) => c.id)));
  }

  async load() {
    const workspaceId = this.api.activeWorkspaceId();
    const [l, s] = await Promise.all([this.api.invokeRaw('content.list', { workspaceId, search: this.search() || undefined }), this.api.invokeRaw('content.stats', { workspaceId })]);
    this.loading.set(false);
    if (!l.ok) return this.api.toast('Không tải được kho nội dung', errOf(l), 'error');
    this.items.set(asList(l.data));
    this.stats.set(s.ok ? s.data : null);
    if (this.pendingOpen) {
      const c = this.items().find((x) => x.id === this.pendingOpen);
      this.pendingOpen = null;
      if (c) this.openEditor(c);
    }
  }

  openEditor(c: any) {
    this.ed = c
      ? { ...this.blank(), ...c, hashtags: (c.hashtags ?? []).join(' '), caption: c.caption ?? '', firstComment: c.firstComment ?? '', mediaPaths: [...(c.mediaPaths ?? [])], status: c.status === 'draft' || c.status === 'ready' ? c.status : 'ready' }
      : this.blank();
    this.editorOpen.set(true);
  }

  async addMedia() {
    const files = await pickFiles({ accept: 'image/*,video/*', multiple: true, maxMb: 200 });
    if (!files.length) return;
    const r = await this.api.invokeRaw<any>('system.pickMedia', { files: files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })) });
    if (!r.ok) return this.api.toast('Không tải được tệp lên', errOf(r), 'error');
    const paths: string[] = asList(r.data?.paths ?? r.data).filter((x: any) => typeof x === 'string');
    this.ed.mediaPaths = [...this.ed.mediaPaths, ...(paths.length ? paths : files.map((f) => f.dataUrl))].slice(0, 10);
  }

  async saveEditor() {
    this.busy.set(true);
    const body = {
      workspaceId: this.ed.workspaceId || null,
      kind: this.ed.kind,
      title: this.ed.title.trim(),
      caption: this.ed.caption || null,
      hashtags: splitTags(this.ed.hashtags ?? ''),
      aspect: this.ed.aspect || null,
      status: this.ed.status,
      firstComment: this.ed.firstComment || null,
      mediaPaths: this.ed.mediaPaths,
    };
    const r = this.ed.id ? await this.api.invokeRaw('content.update', { id: this.ed.id, patch: body }) : await this.api.invokeRaw<any>('content.create', body);
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không lưu được nội dung', errOf(r), 'error');
    this.editorOpen.set(false);
    this.api.toast(this.ed.id ? 'Đã lưu nội dung' : 'Đã tạo nội dung', body.title, 'success');
    this.shell.bump('dashboard');
    await this.load();
  }

  async del(c: any) {
    if (!confirm(`Xóa “${c.title}” cùng lịch đăng liên quan?`)) return;
    const r = await this.api.invokeRaw('content.delete', { id: c.id });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.api.toast('Đã xóa nội dung', undefined, 'success');
    await this.load();
  }

  async bulkDelete() {
    const ids = [...this.checked()];
    if (!confirm(`Xóa ${ids.length} nội dung đã chọn cùng lịch đăng liên quan?`)) return;
    const r = await this.api.invokeRaw('content.bulkDelete', { ids });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.checked.set(new Set());
    this.api.toast(`Đã xóa ${ids.length} nội dung`, undefined, 'success');
    await this.load();
  }

  async bulkMove(ws: string) {
    if (ws === '__') return;
    const ids = [...this.checked()];
    const r = await this.api.invokeRaw('content.bulkMove', { ids, workspaceId: ws || null });
    if (!r.ok) return this.api.toast('Không chuyển được', errOf(r), 'error');
    this.checked.set(new Set());
    this.api.toast(`Đã chuyển ${ids.length} nội dung`, this.shell.workspaces().find((w) => w.id === ws)?.name ?? 'Không thuộc Pocket', 'success');
    await this.load();
  }

  async spin(ids: string[], single: boolean) {
    this.busy.set(true);
    const r = await this.api.invokeRaw<any>('content.spin', { ids, count: this.spinCount });
    this.busy.set(false);
    this.spinOpen.set(false);
    if (!r.ok) return this.api.toast('AI Spin thất bại', errOf(r), 'error');
    const failed = asList(r.data?.failed);
    this.api.toast('Đã sinh biến thể', `${r.data?.done ?? ids.length - failed.length}/${ids.length} nội dung${failed.length ? ` · lỗi ${failed.length}` : ''}`, failed.length ? 'warn' : 'success');
    if (single && this.variantsFor()) await this.loadVariants(this.variantsFor().id);
    await this.load();
  }

  async hashtags() {
    const ids = [...this.checked()];
    this.busy.set(true);
    const r = await this.api.invokeRaw<any>('content.hashtags', { ids });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không gợi ý được hashtag', errOf(r), 'error');
    this.api.toast('Đã cập nhật hashtag AI', `${r.data?.done ?? ids.length} nội dung`, 'success');
    await this.load();
  }

  async openHook(c: any) {
    this.hookFor.set(c);
    this.hook.set(c.hookScore?.score != null ? c.hookScore : null);
    this.hookPlatform.set(null);
    if (!this.hook()) await this.score(false);
  }

  async score(force: boolean) {
    const c = this.hookFor();
    if (!c?.id) return;
    this.scoring.set(true);
    const r = await this.api.invokeRaw<any>('content.hookScore', { id: c.id, platform: this.hookPlatform() ?? undefined, force });
    this.scoring.set(false);
    if (!r.ok) return this.api.toast('Không chấm được Hook', errOf(r), 'error');
    const s = r.data?.score && typeof r.data.score === 'object' ? r.data.score : r.data;
    this.hook.set(s);
    this.items.update((l) => l.map((x) => (x.id === c.id ? { ...x, hookScore: s } : x)));
  }

  async useHook(s: string) {
    const c = this.hookFor();
    const caption = c.caption ? `${s}\n\n${c.caption.split('\n').slice(1).join('\n')}`.trim() : s;
    const r = await this.api.invokeRaw('content.update', { id: c.id, patch: { caption } });
    if (!r.ok) return this.api.toast('Không cập nhật được', errOf(r), 'error');
    this.hookFor.set({ ...c, caption });
    this.api.toast('Đã thay câu mở đầu', 'Bấm Chấm lại để xem điểm mới', 'success');
    await this.load();
  }

  async openVariants(c: any) {
    this.variantsFor.set(c);
    await this.loadVariants(c.id);
  }
  private async loadVariants(id: string) {
    const r = await this.api.invokeRaw('content.variants', { id });
    this.variants.set(asList(r.ok ? r.data : []));
  }
  async applyVariant(v: any) {
    const r = await this.api.invokeRaw('content.applyVariant', { id: v.id });
    if (!r.ok) return this.api.toast('Không áp dụng được', errOf(r), 'error');
    this.api.toast('Đã dùng biến thể làm caption chính', undefined, 'success');
    await this.load();
  }
  async deleteVariant(v: any) {
    const r = await this.api.invokeRaw('content.deleteVariant', { id: v.id });
    if (!r.ok) return this.api.toast('Không xóa được', errOf(r), 'error');
    this.variants.update((l) => l.filter((x) => x.id !== v.id));
  }

  async openSchedule(c: any) {
    this.schedFor.set(c);
    this.sched = { channels: new Set(), at: toLocalInput(Date.now() + 3600000) };
    const r = await this.api.invokeRaw('channels.list', { workspaceId: c.workspaceId ?? this.api.activeWorkspaceId() });
    this.channels.set(asList(r.ok ? r.data : []).map((x: any) => x.channel ?? x));
  }
  toggleSchedChannel(id: string) {
    this.sched.channels.has(id) ? this.sched.channels.delete(id) : this.sched.channels.add(id);
    this.sched = { ...this.sched, channels: new Set(this.sched.channels) };
  }
  quickTimes() {
    const out: { label: string; value: string }[] = [];
    const now = new Date();
    const slots = (this.shell.workspaces().find((w) => w.id === this.schedFor()?.workspaceId)?.['goldenHours'] ?? []) as { start: string }[];
    for (let d = 0; d < 2; d++) {
      for (const s of slots) {
        const [h, m] = s.start.split(':').map(Number);
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m);
        if (t.getTime() > Date.now() + 10 * 60000) out.push({ label: `${d ? 'Mai' : 'Hôm nay'} ${s.start} (giờ vàng)`, value: toLocalInput(t) });
      }
    }
    out.push({ label: 'Sau 1 giờ', value: toLocalInput(Date.now() + 3600000) });
    return out.slice(0, 5);
  }
  async doSchedule() {
    const c = this.schedFor();
    const at = new Date(this.sched.at).getTime();
    if (!at || at < Date.now()) return this.api.toast('Chọn thời gian trong tương lai', undefined, 'warn');
    this.busy.set(true);
    let ok = 0;
    for (const channelId of this.sched.channels) {
      const r = await this.api.invokeRaw<any>('posts.schedule', { contentItemId: c.id, channelId, scheduledAt: at });
      if (r.ok) ok++;
      else this.api.toast('Không lên lịch được', errOf(r), 'error');
    }
    this.busy.set(false);
    if (ok) {
      this.api.toast(`Đã lên lịch ${ok} kênh`, this.dt(at), 'success');
      this.schedFor.set(null);
      this.shell.bump('calendar', 'dashboard');
      await this.load();
    }
  }

  async autoSchedule() {
    const ids = [...this.checked()];
    this.busy.set(true);
    const r = await this.api.invokeRaw<any>('posts.autoSchedule', { contentIds: ids, spacingHours: +this.spacing });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không tự xếp lịch được', errOf(r), 'error');
    this.autoOpen.set(false);
    this.checked.set(new Set());
    const n = asList(r.data?.scheduled ?? r.data).length || r.data?.count || ids.length;
    const skipped = asList(r.data?.skipped);
    this.api.toast(`Đã xếp lịch ${n} bài vào giờ vàng`, skipped.length ? `${skipped.length} nội dung chưa có kênh phù hợp` : undefined, skipped.length ? 'warn' : 'success');
    this.shell.bump('calendar', 'dashboard');
    void this.router.navigate(['/calendar']);
  }
}
