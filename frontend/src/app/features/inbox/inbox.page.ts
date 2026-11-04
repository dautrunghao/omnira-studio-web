import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OmniApiService } from '../../core/omni-api.service';
import { ShellStore } from '../../layout/shell.store';
import { pickFiles } from '../../shared/file-pick';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PLATFORM_META, asList, errOf, fmtRelative, fmtTime, initials, toDate } from '../../shared/util';

const SOURCE_LABEL: Record<string, string> = { dm: 'Tin nhắn', comment: 'Bình luận', mention: 'Nhắc tên' };
const CONV_STATUS = [
  { v: 'open', l: 'Đang mở' },
  { v: 'pending', l: 'Chờ khách' },
  { v: 'resolved', l: 'Đã xong' },
];
const ACTIONS = [
  { v: 'reply_comment', l: 'Trả lời bình luận' },
  { v: 'send_dm', l: 'Nhắn tin riêng (DM)' },
  { v: 'hide_comment', l: 'Ẩn bình luận' },
];

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [IconComponent, ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inbox">
      <!-- ConversationList -->
      <section class="col list">
        <div class="p-3 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <h1 class="text-headline-sm flex-1">Hộp thư hợp nhất</h1>
            <button class="o-icon-btn" title="Đồng bộ ngay" [disabled]="syncing()" (click)="sync()"><o-icon name="refresh" [size]="15" [class.o-spin]="syncing()" /></button>
            <button class="o-icon-btn" [class.active]="side() === 'settings'" title="Quy tắc & AI" (click)="side.set(side() === 'settings' ? 'meta' : 'settings')"><o-icon name="settings" [size]="15" /></button>
          </div>
          <div class="flex flex-wrap gap-1">
            <button class="o-chip" [class.active]="!platform()" (click)="platform.set(null)">Tất cả <span class="o-badge mono">{{ stats()?.total ?? convs().length }}</span></button>
            @for (p of ['facebook', 'instagram', 'tiktok', 'youtube']; track p) {
              <button class="o-chip" [class.active]="platform() === p" (click)="platform.set(p)"><span class="o-plat" [class]="'o-plat ' + p">{{ meta(p).short }}</span>{{ stats()?.byPlatform?.[p] ?? '' }}</button>
            }
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1"><o-icon name="search" [size]="14" class="o-muted" style="position: absolute; left: 10px; top: 11px" /><input class="o-input" style="padding-left: 30px" placeholder="Tìm khách, nội dung…" [ngModel]="q()" (ngModelChange)="q.set($event)" /></div>
            <label class="o-check text-label-sm"><input type="checkbox" [ngModel]="unreadOnly()" (ngModelChange)="unreadOnly.set($event)" /> Chưa đọc</label>
          </div>
          <div class="o-seg">
            <button [class.active]="!statusF()" (click)="statusF.set('')">Tất cả</button>
            @for (s of convStatus; track s.v) { <button [class.active]="statusF() === s.v" (click)="statusF.set(s.v)">{{ s.l }}</button> }
          </div>
        </div>
        <ul class="o-scroll flex-1 px-2 pb-2">
          @for (c of shownConvs(); track c.id) {
            <li class="o-list-item conv" [class.active]="selId() === c.id" (click)="open(c)">
              <div class="relative">
                <div class="o-avatar">@if (c.customerAvatarUrl) { <img [src]="c.customerAvatarUrl" alt="" /> } @else { {{ ini(c.customerName) }} }</div>
                <span class="o-plat pl" [class]="'o-plat pl ' + c.platform">{{ meta(c.platform).short }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1"><span class="truncate" [class.font-semibold]="c.unreadCount > 0">{{ c.customerName }}</span><span class="text-label-sm o-faint ml-auto whitespace-nowrap">{{ rel(c.lastMessageAt) }}</span></div>
                <div class="text-body-sm truncate" [class.o-muted]="!c.unreadCount">{{ c.lastMessagePreview }}</div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="o-badge">{{ srcLabel(c.source) }}</span>
                  @if (c.hasDraft || c.draftCount) { <span class="o-badge secondary"><o-icon name="sparkles" [size]="10" /> Nháp AI</span> }
                  @for (t of (c.tags ?? []).slice(0, 2); track t) { <span class="o-badge">{{ t }}</span> }
                  @if (c.unreadCount > 0) { <span class="unread ml-auto">{{ c.unreadCount }}</span> }
                </div>
              </div>
            </li>
          } @empty { <li class="o-empty"><o-icon name="inbox" [size]="22" />Không có hội thoại</li> }
        </ul>
      </section>

      <!-- Thread -->
      <section class="col thread">
        @if (conv(); as c) {
          <header class="th-head">
            <div class="o-avatar">{{ ini(c.customerName) }}</div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">{{ c.customerName }}</div>
              <div class="text-label-sm o-muted truncate"><span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span> {{ srcLabel(c.source) }} · {{ channelName(c.channelId) }} @if (c.contextPostTitle) { · bài “{{ c.contextPostTitle }}” }</div>
            </div>
            <select class="o-select" style="width: 130px; height: 30px" [ngModel]="c.status" (ngModelChange)="setStatus(c, $event)">@for (s of convStatus; track s.v) { <option [value]="s.v">{{ s.l }}</option> }</select>
          </header>
          <div #scroller class="msgs o-scroll">
            @for (m of msgs(); track m.id) {
              @if (m.deliveryStatus === 'draft') {
                <div class="draft">
                  <div class="flex items-center gap-1 text-label-sm o-secondary" style="text-transform: uppercase; letter-spacing: .05em"><o-icon name="sparkles" [size]="12" /> AI soạn sẵn – chờ duyệt</div>
                  @if (editDraft() === m.id) { <textarea class="o-textarea" rows="4" [(ngModel)]="draftText" maxlength="4000" aria-label="Sửa câu trả lời"></textarea> } @else { <div class="text-body-md" style="white-space: pre-wrap">{{ m.body }}</div> }
                  @if (m.aiNote) { <div class="text-label-sm o-muted">{{ m.aiNote }}</div> }
                  <div class="flex flex-wrap justify-end gap-1">
                    <button class="o-btn o-btn-sm o-btn-subtle" [disabled]="busy()" (click)="discard(m)"><o-icon name="trash" [size]="12" /> Bỏ</button>
                    @if (editDraft() !== m.id) { <button class="o-btn o-btn-sm o-btn-subtle" (click)="editDraft.set(m.id); draftText = m.body"><o-icon name="edit" [size]="12" /> Sửa</button> }
                    <button class="o-btn o-btn-sm o-btn-primary" [disabled]="busy()" (click)="approve(m)"><o-icon name="send" [size]="12" /> Duyệt & gửi</button>
                  </div>
                </div>
              } @else {
                <div class="bubble-row" [class.out]="m.direction === 'out'">
                  <div class="bubble" [class.out]="m.direction === 'out'">
                    @if (m.direction === 'out' && (m.ruleId || m.author === 'AI')) { <div class="text-label-sm o-secondary mb-1">{{ m.ruleId ? 'Luật tự động' : 'AI Omnira' }}</div> }
                    <div style="white-space: pre-wrap">{{ m.body }}</div>
                    @for (a of m.attachments ?? []; track a) { <img class="att" [src]="attUrl(a)" alt="Tệp đính kèm" /> }
                    <div class="meta">
                      <span>{{ time(m.createdAt) }}</span>
                      @if (m.direction === 'out') {
                        @switch (m.deliveryStatus) {
                          @case ('pending') { <span class="o-warning flex items-center gap-0.5" [title]="m.error ?? ''"><o-icon name="clock" [size]="10" /> {{ m.error ? 'Đang thử lại' : laterLabel(m) }}</span> }
                          @case ('failed') { <span class="o-error flex items-center gap-1" [title]="m.error ?? ''">Gửi lỗi <button class="linkbtn" (click)="resend(m)"><o-icon name="undo" [size]="10" /> Gửi lại</button></span> }
                          @default { <span class="o-tertiary flex items-center gap-0.5"><o-icon name="checkcheck" [size]="10" /> {{ m.action === 'hide' ? 'Đã ẩn' : 'Đã gửi qua ' + meta(c.platform).label }}</span> }
                        }
                      }
                    </div>
                  </div>
                </div>
              }
            } @empty { <div class="o-empty">Chưa có tin nhắn</div> }
          </div>
          <!-- Composer -->
          <footer class="composer">
            @if (suggestion(); as s) {
              <div class="o-banner primary text-body-sm" style="align-items: flex-start">
                <o-icon name="sparkles" [size]="14" class="o-primary" />
                <div class="flex-1"><div style="white-space: pre-wrap">{{ s.body ?? s.text ?? s }}</div>@if (s.note) { <div class="text-label-sm o-muted mt-1">{{ s.note }}</div> }</div>
                <button class="o-btn o-btn-sm" (click)="text = s.body ?? s.text ?? s; suggestion.set(null)">Dùng</button>
                <button class="o-icon-btn" (click)="suggestion.set(null)" aria-label="Bỏ gợi ý"><o-icon name="x" [size]="13" /></button>
              </div>
            }
            @if (qrOpen()) {
              <div class="qr-pop o-scroll">
                @for (r of filteredQr(); track r.id) {
                  <button class="o-pop-item" (click)="useQr(r)"><span class="o-code o-primary">{{ r.shortcut }}</span><span class="flex-1 min-w-0"><span class="block font-semibold">{{ r.title }}</span><span class="block text-label-sm o-muted truncate">{{ r.body }}</span></span></button>
                } @empty { <div class="o-empty" style="padding: 12px">Không có mẫu trả lời nhanh</div> }
              </div>
            }
            @if (attachments().length) {
              <div class="flex flex-wrap gap-2">@for (a of attachments(); track a; let i = $index) { <span class="o-badge"><o-icon name="paperclip" [size]="11" /> Tệp {{ i + 1 }} <button class="linkbtn" (click)="removeAtt(i)" aria-label="Bỏ tệp"><o-icon name="x" [size]="10" /></button></span> }</div>
            }
            <div class="flex items-end gap-2">
              <button class="o-icon-btn" title="Đính kèm ảnh" (click)="attach()"><o-icon name="paperclip" [size]="16" /></button>
              <button class="o-icon-btn" [class.active]="qrOpen()" title="Mẫu trả lời nhanh (gõ /)" (click)="qrOpen.set(!qrOpen())"><o-icon name="zap" [size]="16" /></button>
              <textarea class="o-textarea flex-1" rows="2" [(ngModel)]="text" (ngModelChange)="onType($event)" (keydown)="onKey($event)" placeholder="Nhập trả lời… (Enter gửi, Shift+Enter xuống dòng, / mẫu nhanh)" maxlength="4000"></textarea>
              <button class="o-btn" [disabled]="suggesting()" (click)="suggest()" title="AI Co-Pilot gợi ý câu trả lời"><o-icon [name]="suggesting() ? 'loader' : 'sparkles'" [size]="14" [class.o-spin]="suggesting()" /> Gợi ý AI</button>
              <button class="o-btn o-btn-primary" [disabled]="busy() || (!text.trim() && !attachments().length)" (click)="send()"><o-icon name="send" [size]="14" /> Gửi</button>
            </div>
          </footer>
        } @else {
          <div class="o-empty" style="flex: 1"><o-icon name="message" [size]="30" />Chọn một hội thoại để xem và trả lời khách.</div>
        }
      </section>

      <!-- InboxSidePanel -->
      <aside class="col side o-scroll">
        @if (side() === 'meta' && conv(); as c) {
          <div class="p-4 flex flex-col gap-3">
            <div class="text-label-md o-muted" style="text-transform: uppercase; letter-spacing: .05em">Thông tin khách</div>
            <div class="flex items-center gap-3"><div class="o-avatar" style="width: 48px; height: 48px">{{ ini(c.customerName) }}</div><div><div class="font-semibold">{{ c.customerName }}</div><div class="text-label-sm o-muted o-code">{{ c.customerExternalId }}</div></div></div>
            <div class="o-field"><span class="o-label">Nhãn</span>
              <div class="flex flex-wrap gap-1">@for (t of c.tags ?? []; track t) { <span class="o-badge">{{ t }} <button class="linkbtn" (click)="removeTag(c, t)" [attr.aria-label]="'Bỏ nhãn ' + t"><o-icon name="x" [size]="10" /></button></span> }</div>
              <div class="flex gap-1"><input class="o-input" style="height: 30px" [(ngModel)]="newTag" (keydown.enter)="addTag(c)" placeholder="Thêm nhãn…" maxlength="40" /><button class="o-btn o-btn-sm" (click)="addTag(c)">Thêm</button></div>
              <div class="flex flex-wrap gap-1">@for (t of suggestedTags; track t) { <button class="o-chip" style="height: 24px" (click)="newTag = t; addTag(c)">+ {{ t }}</button> }</div>
            </div>
            @if (c.contextPostTitle) { <div class="o-tile text-body-sm"><div class="o-label">Bài viết liên quan</div>{{ c.contextPostTitle }}</div> }
            <div class="o-tile text-body-sm flex flex-col gap-1"><div class="flex justify-between"><span class="o-muted">Kênh</span><b>{{ channelName(c.channelId) }}</b></div><div class="flex justify-between"><span class="o-muted">Bắt đầu</span><span>{{ rel(c.createdAt) }}</span></div><div class="flex justify-between"><span class="o-muted">Số tin</span><span>{{ msgs().length }}</span></div></div>
          </div>
        } @else {
          <div class="p-4 flex flex-col gap-4">
            <!-- AiReplyCard -->
            <div class="o-card p-3 flex flex-col gap-2">
              <div class="flex items-center gap-2 text-label-md o-muted" style="text-transform: uppercase"><o-icon name="sparkles" [size]="14" class="o-secondary" /> AI trả lời khách</div>
              @if (ai(); as a) {
                <div class="o-seg">@for (m of [['off', 'Tắt'], ['draft', 'Soạn nháp'], ['auto', 'Tự gửi']]; track m[0]) { <button [class.active]="a.mode === m[0]" (click)="setAi({ mode: m[0] })">{{ m[1] }}</button> }</div>
                <p class="text-label-sm o-muted">{{ a.mode === 'off' ? 'AI không soạn trả lời. Luật từ khóa vẫn chạy.' : a.mode === 'draft' ? 'AI soạn sẵn câu trả lời cho mọi tin mới, bạn bấm Duyệt & gửi.' : 'AI tự gửi khi chắc chắn ≥ ' + pct(a.minConfidence) + '% và câu trả lời có trong kiến thức; câu khó, khiếu nại vào hàng chờ duyệt.' }}</p>
                @if (a.mode !== 'off') {
                  <div class="flex flex-col gap-2 o-tile">
                    <label class="flex items-center justify-between text-body-sm">Trả lời bình luận <button class="o-switch" [class.on]="a.comments" (click)="setAi({ comments: !a.comments })"></button></label>
                    <label class="flex items-center justify-between text-body-sm">Trả lời tin nhắn <button class="o-switch" [class.on]="a.messages" (click)="setAi({ messages: !a.messages })"></button></label>
                    <label class="flex items-center justify-between text-body-sm">Page tự thích bình luận <button class="o-switch" [class.on]="a.autoLike" (click)="setAi({ autoLike: !a.autoLike })"></button></label>
                    <label class="flex items-center justify-between text-body-sm">Gắn nhãn khách tiềm năng <button class="o-switch" [class.on]="a.tagLeads" (click)="setAi({ tagLeads: !a.tagLeads })"></button></label>
                    @if (a.mode === 'auto') {
                      <label class="o-field"><span class="o-label">Độ chắc chắn tối thiểu: {{ pct(a.minConfidence) }}%</span><input class="o-range" type="range" min="0.5" max="1" step="0.05" [ngModel]="a.minConfidence" (change)="setAi({ minConfidence: +$any($event.target).value })" /></label>
                    }
                    <div class="grid grid-cols-3 gap-2">
                      <label class="o-field"><span class="o-label">Trễ min (s)</span><input class="o-input" type="number" min="0" max="600" [ngModel]="a.minDelaySec" (change)="setAi({ minDelaySec: +$any($event.target).value })" /></label>
                      <label class="o-field"><span class="o-label">Trễ max (s)</span><input class="o-input" type="number" min="0" max="900" [ngModel]="a.maxDelaySec" (change)="setAi({ maxDelaySec: +$any($event.target).value })" /></label>
                      <label class="o-field"><span class="o-label">Tối đa / giờ</span><input class="o-input" type="number" min="1" max="500" [ngModel]="a.maxPerHour" (change)="setAi({ maxPerHour: +$any($event.target).value })" /></label>
                    </div>
                  </div>
                }
                <p class="text-label-sm o-faint">AI dùng Brand Voice + Kiến thức của Pocket (Không gian làm việc).</p>
              } @else { <div class="o-skel" style="height: 120px"></div> }
            </div>

            <!-- Đồng bộ -->
            <div class="o-card p-3 flex items-center gap-3">
              <o-icon name="refresh" [size]="16" class="o-secondary" />
              <div class="flex-1"><div class="text-label-md">Tự đồng bộ hộp thư</div><div class="text-label-sm o-muted">{{ worker()?.lastSyncAt ? 'Lần cuối ' + rel(worker().lastSyncAt) : 'Lấy tin mới từ Facebook / Instagram định kỳ' }}</div></div>
              <button class="o-switch" [class.on]="autoSync()" (click)="toggleAutoSync()" aria-label="Tự đồng bộ"></button>
            </div>

            <!-- RulesPanel -->
            <div class="o-card p-3 flex flex-col gap-2">
              <div class="flex items-center gap-2"><o-icon name="bot" [size]="14" class="o-tertiary" /><span class="text-label-md flex-1" style="text-transform: uppercase">Luật trả lời tự động</span><button class="o-btn o-btn-sm" (click)="openRule(null)"><o-icon name="plus" [size]="12" /> Thêm</button></div>
              @for (r of rules(); track r.id) {
                <div class="o-tile flex flex-col gap-1">
                  <div class="flex items-center gap-2"><span class="flex-1 min-w-0 truncate font-semibold text-body-sm">{{ r.name }}</span><button class="o-switch" [class.on]="r.enabled" (click)="toggleRule(r)"></button></div>
                  <div class="flex flex-wrap gap-1">@for (k of (r.keywords ?? []).slice(0, 5); track k) { <span class="o-badge">{{ k }}</span> }</div>
                  <div class="flex items-center gap-1 text-label-sm o-muted"><span class="flex-1">{{ actionLabel(r.action) }} · trễ {{ r.minDelaySec }}–{{ r.maxDelaySec }}s @if (r.channelId) { · {{ channelName(r.channelId) }} }</span>
                    <button class="o-icon-btn" style="width: 24px; height: 24px" (click)="openRule(r)" aria-label="Sửa luật"><o-icon name="edit" [size]="12" /></button>
                    <button class="o-icon-btn" style="width: 24px; height: 24px" (click)="deleteRule(r)" aria-label="Xóa luật"><o-icon name="trash" [size]="12" /></button>
                  </div>
                </div>
              } @empty { <div class="text-body-sm o-muted">Chưa có luật – VD: bình luận chứa “giá”, “ib” → tự trả lời + nhắn tin báo giá.</div> }
            </div>

            <!-- Quick replies -->
            <div class="o-card p-3 flex flex-col gap-2">
              <div class="flex items-center gap-2"><o-icon name="zap" [size]="14" class="o-primary" /><span class="text-label-md flex-1" style="text-transform: uppercase">Mẫu trả lời nhanh</span></div>
              @for (r of quick(); track r.id) {
                <div class="text-body-sm"><span class="o-code o-primary">{{ r.shortcut }}</span> <b>{{ r.title }}</b><div class="o-muted line2">{{ r.body }}</div></div>
              } @empty { <div class="text-body-sm o-muted">Chưa có mẫu trả lời nhanh.</div> }
            </div>

            @if (stats(); as s) {
              <div class="o-card p-3 grid grid-cols-2 gap-2 text-body-sm">
                <div><div class="o-label">Chưa đọc</div><b class="font-mono">{{ s.unread ?? 0 }}</b></div>
                <div><div class="o-label">Phản hồi TB (30 ngày)</div><b class="font-mono">{{ s.avgResponseMin != null ? s.avgResponseMin + ' phút' : '—' }}</b></div>
                <div><div class="o-label">Tỷ lệ phản hồi</div><b class="font-mono">{{ s.responseRate != null ? s.responseRate + '%' : '—' }}</b></div>
                <div><div class="o-label">Nháp AI chờ duyệt</div><b class="font-mono">{{ s.drafts ?? s.pendingDrafts ?? 0 }}</b></div>
              </div>
            }
          </div>
        }
        @if (conv() && side() === 'settings') { <div class="px-4 pb-4"><button class="o-btn o-btn-sm o-btn-subtle" (click)="side.set('meta')"><o-icon name="chevronleft" [size]="13" /> Thông tin khách</button></div> }
      </aside>
    </div>

    <!-- RuleDialog -->
    <o-modal [open]="ruleOpen()" [title]="rule.id ? 'Sửa luật tự động' : 'Luật trả lời tự động'" subtitle="Khi bình luận / tin nhắn chứa từ khóa → hành động sau thời gian trễ ngẫu nhiên" (closed)="ruleOpen.set(false)">
      <label class="o-field"><span class="o-label">Tên luật</span><input class="o-input" [(ngModel)]="rule.name" maxlength="80" /></label>
      <label class="o-field"><span class="o-label">Từ khóa (cách nhau bằng dấu phẩy)</span><input class="o-input" [(ngModel)]="rule.keywords" placeholder="giá, ib, inbox, còn không" /></label>
      <div class="o-form-grid">
        <label class="o-field"><span class="o-label">Hành động</span><select class="o-select" [(ngModel)]="rule.action">@for (a of actions; track a.v) { <option [value]="a.v">{{ a.l }}</option> }</select></label>
        <label class="o-field"><span class="o-label">Áp dụng cho kênh</span><select class="o-select" [(ngModel)]="rule.channelId"><option value="">Mọi kênh của Pocket</option>@for (c of channels(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select></label>
        <label class="o-field"><span class="o-label">Trễ tối thiểu (giây)</span><input class="o-input" type="number" min="0" max="600" [(ngModel)]="rule.minDelaySec" /></label>
        <label class="o-field"><span class="o-label">Trễ tối đa (giây)</span><input class="o-input" type="number" min="0" max="600" [(ngModel)]="rule.maxDelaySec" /></label>
      </div>
      @if (rule.action !== 'hide_comment') {
        <label class="o-field"><span class="o-label">Mẫu trả lời ({{ '{' }}{{ '{' }}name{{ '}' }}{{ '}' }} = tên khách)</span><textarea class="o-textarea" rows="4" [(ngModel)]="rule.template" maxlength="1000"></textarea></label>
      }
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="ruleOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !rule.name.trim() || !rule.keywords.trim()" (click)="saveRule()">Lưu luật</button>
      </div>
    </o-modal>
  `,
  styles: [
    `:host { display: block; height: 100%; }
     .inbox { display: grid; grid-template-columns: 340px minmax(0, 1fr) 320px; height: 100%; min-height: 0; }
     @media (max-width: 1280px) { .inbox { grid-template-columns: 300px minmax(0, 1fr); } .side { display: none; } }
     @media (max-width: 760px) { .inbox { grid-template-columns: 1fr; } .list { display: none; } }
     .col { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
     .list { border-right: 1px solid rgb(var(--c-overlay) / 0.06); background: rgb(var(--c-surface-container-lowest) / 0.5); }
     .side { border-left: 1px solid rgb(var(--c-overlay) / 0.06); background: rgb(var(--c-surface-container-lowest) / 0.5); }
     .conv { align-items: flex-start; }
     .pl { position: absolute; right: -4px; bottom: -4px; height: 14px; font-size: 8px; padding: 0 3px; }
     .unread { min-width: 18px; height: 18px; border-radius: 999px; background: rgb(var(--c-primary-container)); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
     .th-head { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid rgb(var(--c-overlay) / 0.06); }
     .msgs { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
     .bubble-row { display: flex; }
     .bubble-row.out { justify-content: flex-end; }
     .bubble { max-width: min(78%, 520px); padding: 8px 12px; border-radius: 16px 16px 16px 4px; background: rgb(var(--c-surface-container-high)); font-size: .875rem; }
     .bubble.out { border-radius: 16px 16px 4px 16px; background: rgb(var(--c-primary-container) / 0.25); }
     .bubble .meta { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; font-size: .625rem; color: rgb(var(--c-on-surface-variant)); }
     .att { max-width: 220px; border-radius: 10px; margin-top: 6px; display: block; }
     .draft { margin-left: auto; width: min(78%, 520px); display: flex; flex-direction: column; gap: 8px; border: 1px dashed rgb(var(--c-secondary) / 0.5); background: rgb(var(--c-secondary) / 0.06); border-radius: 16px 4px 16px 16px; padding: 12px; }
     .composer { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid rgb(var(--c-overlay) / 0.06); }
     .qr-pop { position: absolute; bottom: calc(100% - 4px); left: 16px; right: 16px; max-height: 260px; background: rgb(var(--c-surface-container-high)); border: 1px solid rgb(var(--c-overlay) / 0.08); border-radius: 12px; box-shadow: 0 12px 32px rgb(0 0 0 / 0.35); padding: 6px; z-index: 5; }
     .linkbtn { background: none; border: 0; padding: 0 2px; color: rgb(var(--c-primary)); cursor: pointer; display: inline-flex; align-items: center; gap: 2px; font-size: inherit; }
     .line2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`,
  ],
})
export class InboxPageComponent {
  private readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly convStatus = CONV_STATUS;
  readonly actions = ACTIONS;
  readonly suggestedTags = ['Hỏi giá', 'Chốt đơn', 'VIP', 'Khiếu nại', 'Khách tiềm năng'];
  readonly convs = signal<any[]>([]);
  readonly msgs = signal<any[]>([]);
  readonly selId = signal<string | null>(null);
  readonly platform = signal<string | null>(null);
  readonly unreadOnly = signal(false);
  readonly statusF = signal('');
  readonly q = signal('');
  readonly stats = signal<any>(null);
  readonly rules = signal<any[]>([]);
  readonly quick = signal<any[]>([]);
  readonly ai = signal<any>(null);
  readonly worker = signal<any>(null);
  readonly autoSync = signal(true);
  readonly channels = signal<any[]>([]);
  readonly side = signal<'meta' | 'settings'>('settings');
  readonly syncing = signal(false);
  readonly busy = signal(false);
  readonly suggesting = signal(false);
  readonly suggestion = signal<any>(null);
  readonly qrOpen = signal(false);
  readonly qrFilter = signal('');
  readonly editDraft = signal<string | null>(null);
  readonly attachments = signal<string[]>([]);
  readonly ruleOpen = signal(false);
  text = '';
  draftText = '';
  newTag = '';
  rule: any = { name: '', keywords: '', action: 'reply_comment', template: '', minDelaySec: 15, maxDelaySec: 45, channelId: '', enabled: true };

  readonly rel = fmtRelative;
  readonly time = fmtTime;
  readonly ini = initials;

  readonly conv = computed(() => this.convs().find((c) => c.id === this.selId()) ?? null);
  readonly shownConvs = computed(() => {
    const q = this.q().trim().toLowerCase();
    const st = this.statusF();
    return this.convs()
      .filter((c) => (!st || c.status === st) && (!q || `${c.customerName} ${c.lastMessagePreview} ${(c.tags ?? []).join(' ')}`.toLowerCase().includes(q)))
      .sort((a, b) => (toDate(b.lastMessageAt)?.getTime() ?? 0) - (toDate(a.lastMessageAt)?.getTime() ?? 0));
  });
  readonly filteredQr = computed(() => {
    const f = this.qrFilter().toLowerCase();
    return this.quick().filter((r) => !f || `${r.shortcut} ${r.title}`.toLowerCase().includes(f));
  });

  constructor() {
    effect(() => {
      this.api.activeWorkspaceId();
      this.platform();
      this.unreadOnly();
      this.shell.ver('workspace');
      this.shell.ver('inbox');
      void this.loadConvs();
    });
    effect(() => {
      this.api.activeWorkspaceId();
      void this.loadSide();
    });
    const t = setInterval(() => {
      void this.loadConvs(true);
      if (this.selId()) void this.loadMsgs(this.selId()!, true);
    }, 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  meta(p: string) {
    return PLATFORM_META[p] ?? { label: p, short: '?' };
  }
  srcLabel(s: string) {
    return SOURCE_LABEL[s] ?? s;
  }
  actionLabel(a: string) {
    return ACTIONS.find((x) => x.v === a)?.l ?? a;
  }
  pct(n: number) {
    return Math.round((n ?? 0.8) * 100);
  }
  channelName(id: string) {
    return this.channels().find((c) => c.id === id)?.name ?? '';
  }
  attUrl(a: any) {
    return typeof a === 'string' ? a : a?.url ?? a?.path ?? '';
  }
  laterLabel(m: any) {
    const t = toDate(m.sendAfter);
    return t && t.getTime() > Date.now() + 1500 ? `Gửi lúc ${fmtTime(t)}` : 'Đang gửi';
  }

  async loadConvs(silent = false) {
    const r = await this.api.invokeRaw('inbox.conversations', { workspaceId: this.api.activeWorkspaceId(), platform: this.platform() ?? undefined, unreadOnly: this.unreadOnly() || undefined });
    if (!r.ok) {
      if (!silent) this.api.toast('Không tải được hộp thư', errOf(r), 'error');
      return;
    }
    this.convs.set(asList(r.data).map((x: any) => x.conversation ? { ...x.conversation, channelName: x.channelName } : x));
  }

  async loadSide() {
    const ws = this.api.activeWorkspaceId();
    const [st, ru, qr, ai, ch, wk] = await Promise.all([
      this.api.invokeRaw('inbox.stats', { workspaceId: ws }),
      this.api.invokeRaw('inbox.rules', { workspaceId: ws }),
      this.api.invokeRaw('inbox.quickReplies', { workspaceId: ws }),
      this.api.invokeRaw('inbox.aiSettings'),
      this.api.invokeRaw('channels.list', { workspaceId: ws }),
      this.api.invokeRaw<any>('inbox.worker'),
    ]);
    this.stats.set(st.ok ? st.data : null);
    this.rules.set(asList(ru.ok ? ru.data : []));
    this.quick.set(asList(qr.ok ? qr.data : []));
    const a: any = ai.ok ? ai.data ?? {} : {};
    const mode = a.mode ?? (a.enabled === false ? 'off' : a.autoSend ? 'auto' : 'draft');
    this.ai.set({ comments: true, messages: true, minConfidence: 0.85, minDelaySec: 20, maxDelaySec: 90, maxPerHour: 60, autoLike: false, tagLeads: true, ...a, mode });
    this.channels.set(asList(ch.ok ? ch.data : []).map((x: any) => x.channel ?? x));
    if (wk.ok) {
      this.worker.set(wk.data);
      this.autoSync.set(wk.data?.autoSync ?? wk.data?.enabled ?? true);
    }
  }

  async open(c: any) {
    this.selId.set(c.id);
    this.side.set('meta');
    this.suggestion.set(null);
    this.text = '';
    this.attachments.set([]);
    await this.loadMsgs(c.id);
    if (c.unreadCount > 0) {
      const r = await this.api.invokeRaw('inbox.markRead', { conversationId: c.id });
      if (r.ok) {
        this.convs.update((l) => l.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x)));
        void this.shell.loadBadges();
      }
    }
  }

  async loadMsgs(id: string, silent = false) {
    const r = await this.api.invokeRaw('inbox.messages', { conversationId: id });
    if (this.selId() !== id) return;
    if (!r.ok) {
      if (!silent) this.api.toast('Không tải được tin nhắn', errOf(r), 'error');
      return;
    }
    const prev = this.msgs().length;
    this.msgs.set(asList(r.data).sort((a: any, b: any) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0)));
    if (!silent || this.msgs().length !== prev) setTimeout(() => this.scroller()?.nativeElement.scrollTo({ top: 1e9 }), 0);
  }

  onType(v: string) {
    if (v.startsWith('/')) {
      this.qrOpen.set(true);
      this.qrFilter.set(v.slice(1).split(/\s/)[0] ?? '');
    } else if (this.qrOpen() && !v) this.qrOpen.set(false);
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (this.qrOpen() && this.filteredQr()[0] && this.text.startsWith('/')) return this.useQr(this.filteredQr()[0]);
      void this.send();
    } else if (e.key === 'Escape') this.qrOpen.set(false);
  }

  useQr(r: any) {
    const name = this.conv()?.customerName ?? '';
    this.text = String(r.body ?? '').replace(/\{\{\s*name\s*\}\}/g, name);
    this.qrOpen.set(false);
    this.qrFilter.set('');
  }

  async attach() {
    const files = await pickFiles({ accept: 'image/*', multiple: true, maxMb: 8 });
    if (!files.length) return;
    const r = await this.api.invokeRaw<any>('inbox.pickAttachments', { images: true, multiple: true, files: files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })) });
    const paths: string[] = r.ok ? asList(r.data?.paths ?? r.data).filter((x: any) => typeof x === 'string') : [];
    if (!r.ok) this.api.toast('Không tải được tệp', errOf(r), 'error');
    this.attachments.update((l) => [...l, ...paths].slice(0, 5));
  }
  removeAtt(i: number) {
    this.attachments.update((l) => l.filter((_, j) => j !== i));
  }

  async send() {
    const c = this.conv();
    if (!c) return;
    const body = this.text.trim();
    if (!body && !this.attachments().length) return;
    this.busy.set(true);
    const r = await this.api.invokeRaw('inbox.send', { conversationId: c.id, body, attachments: this.attachments() });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không gửi được', errOf(r), 'error');
    this.text = '';
    this.attachments.set([]);
    await this.loadMsgs(c.id);
    void this.loadConvs(true);
  }

  async suggest() {
    const c = this.conv();
    if (!c) return;
    this.suggesting.set(true);
    const r = await this.api.invokeRaw<any>('inbox.suggestReply', { conversationId: c.id });
    this.suggesting.set(false);
    if (!r.ok) return this.api.toast('AI chưa gợi ý được', errOf(r), 'error');
    const d = r.data;
    this.suggestion.set(typeof d === 'string' ? { body: d } : { body: d?.body ?? d?.reply ?? d?.text ?? d?.suggestion, note: d?.note ?? d?.reason });
  }

  async approve(m: any) {
    this.busy.set(true);
    const body = this.editDraft() === m.id ? this.draftText.trim() : null;
    const r = await this.api.invokeRaw('inbox.approveDraft', { id: m.id, body });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không duyệt được', errOf(r), 'error');
    this.editDraft.set(null);
    this.api.toast('Đã duyệt & gửi câu trả lời', undefined, 'success');
    await this.loadMsgs(this.selId()!);
  }

  async discard(m: any) {
    const r = await this.api.invokeRaw('inbox.discardDraft', { id: m.id });
    if (!r.ok) return this.api.toast('Không bỏ được', errOf(r), 'error');
    this.msgs.update((l) => l.filter((x) => x.id !== m.id));
  }

  async resend(m: any) {
    const r = await this.api.invokeRaw('inbox.resend', { id: m.id });
    if (!r.ok) return this.api.toast('Không gửi lại được', errOf(r), 'error');
    await this.loadMsgs(this.selId()!);
  }

  private async updateConv(c: any, patch: { tags?: string[]; status?: string }) {
    const r = await this.api.invokeRaw('inbox.update', { conversationId: c.id, ...patch });
    if (!r.ok) return this.api.toast('Không cập nhật được', errOf(r), 'error');
    this.convs.update((l) => l.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
  }
  setStatus(c: any, status: string) {
    void this.updateConv(c, { status });
  }
  addTag(c: any) {
    const t = this.newTag.trim();
    this.newTag = '';
    if (!t || (c.tags ?? []).includes(t)) return;
    void this.updateConv(c, { tags: [...(c.tags ?? []), t].slice(0, 12) });
  }
  removeTag(c: any, t: string) {
    void this.updateConv(c, { tags: (c.tags ?? []).filter((x: string) => x !== t) });
  }

  async sync() {
    this.syncing.set(true);
    const r = await this.api.invokeRaw<any>('inbox.sync', {});
    this.syncing.set(false);
    if (!r.ok) return this.api.toast('Đồng bộ thất bại', errOf(r), 'error');
    this.api.toast('Đã đồng bộ hộp thư', r.data?.newMessages != null ? `${r.data.newMessages} tin mới` : undefined, 'success');
    await this.loadConvs();
    void this.shell.loadBadges();
  }

  async toggleAutoSync() {
    const next = !this.autoSync();
    const r = await this.api.invokeRaw('inbox.setAutoSync', { enabled: next });
    if (!r.ok) return this.api.toast('Không đổi được', errOf(r), 'error');
    this.autoSync.set(next);
  }

  async setAi(patch: any) {
    const prev = this.ai();
    this.ai.set({ ...prev, ...patch });
    const r = await this.api.invokeRaw('inbox.setAiSettings', patch);
    if (!r.ok) {
      this.ai.set(prev);
      this.api.toast('Không lưu được cài đặt AI', errOf(r), 'error');
    }
  }

  openRule(r: any) {
    this.rule = r
      ? { ...r, keywords: (r.keywords ?? []).join(', '), template: r.template ?? '', channelId: r.channelId ?? '' }
      : { id: undefined, name: '', keywords: '', action: 'reply_comment', template: 'Dạ {{name}} kiểm tra tin nhắn chờ giúp em nha, em vừa gửi chi tiết rồi ạ ❤️', minDelaySec: 15, maxDelaySec: 45, channelId: '', enabled: true };
    this.ruleOpen.set(true);
  }

  async saveRule() {
    const min = Math.max(0, Math.min(600, +this.rule.minDelaySec || 0));
    const max = Math.max(min, Math.min(600, +this.rule.maxDelaySec || 0));
    this.busy.set(true);
    const r = await this.api.invokeRaw('inbox.saveRule', {
      id: this.rule.id,
      workspaceId: this.rule.workspaceId ?? this.api.activeWorkspaceId(),
      channelId: this.rule.channelId || null,
      name: this.rule.name.trim(),
      keywords: this.rule.keywords.split(',').map((k: string) => k.trim()).filter(Boolean).slice(0, 30),
      action: this.rule.action,
      template: this.rule.action === 'hide_comment' ? null : this.rule.template?.trim() || null,
      minDelaySec: min,
      maxDelaySec: max,
      enabled: this.rule.enabled ?? true,
    });
    this.busy.set(false);
    if (!r.ok) return this.api.toast('Không lưu được luật', errOf(r), 'error');
    this.ruleOpen.set(false);
    this.api.toast('Đã lưu luật tự động', this.rule.name, 'success');
    void this.loadSide();
  }

  async toggleRule(r: any) {
    const res = await this.api.invokeRaw('inbox.toggleRule', { id: r.id, enabled: !r.enabled });
    if (!res.ok) return this.api.toast('Không đổi được', errOf(res), 'error');
    this.rules.update((l) => l.map((x) => (x.id === r.id ? { ...x, enabled: !r.enabled } : x)));
  }

  async deleteRule(r: any) {
    if (!confirm(`Xóa luật “${r.name}”?`)) return;
    const res = await this.api.invokeRaw('inbox.deleteRule', { id: r.id });
    if (!res.ok) return this.api.toast('Không xóa được', errOf(res), 'error');
    this.rules.update((l) => l.filter((x) => x.id !== r.id));
  }
}
