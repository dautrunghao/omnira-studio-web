import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="o-page">
      <!-- Header -->
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="lifebuoy" [size]="21" /></div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="o-page-title">Hỗ trợ kỹ thuật & Góp ý tính năng</h1>
            <span class="o-badge pill success"><span class="o-dot success live"></span> Trực tuyến 24/7</span>
          </div>
          <p class="o-page-desc">
            Gửi yêu cầu hỗ trợ trực tiếp tới đội ngũ kỹ sư Omnira Studio, báo lỗi hoặc đề xuất tính năng AI mới.
          </p>
        </div>

        <div class="o-page-actions">
          <button type="button" class="o-btn o-btn-primary" (click)="newModalOpen.set(true)">
            <o-icon name="plus" [size]="15" /> Tạo yêu cầu hỗ trợ mới
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <!-- Left: Ticket List -->
        <div class="o-card">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="inbox" [size]="18" /></div>
            <div class="min-w-0 flex-1">
              <div class="o-card-title">Danh sách yêu cầu ({{ tickets().length }})</div>
              <div class="o-card-sub">Theo dõi tiến độ phản hồi từ đội ngũ kỹ thuật.</div>
            </div>
          </div>

          <div class="o-card-body flex flex-col gap-2.5">
            @for (t of tickets(); track t.id) {
              <button
                type="button"
                class="o-tile flex flex-col gap-1.5 text-left cursor-pointer"
                [style.border-color]="t.id === activeTicket()?.id ? 'rgb(var(--c-primary))' : ''"
                [style.background]="t.id === activeTicket()?.id ? 'rgb(var(--c-primary) / 0.08)' : ''"
                (click)="selectedId.set(t.id)">
                <div class="flex items-center justify-between gap-2 w-full">
                  <span class="o-badge mono">#{{ t.id }}</span>
                  <span class="o-badge" [class.success]="t.status === 'answered'" [class.secondary]="t.status !== 'answered'">
                    {{ t.status === 'answered' ? 'Đã phản hồi' : 'Đang xử lý' }}
                  </span>
                </div>
                <div class="truncate font-semibold text-label-lg">{{ t.subject }}</div>
                <div class="flex items-center gap-1.5 text-label-sm o-muted">
                  <o-icon [name]="t.type === 'feature' ? 'sparkles' : 'settings'" [size]="12" />
                  <span>{{ t.type === 'feature' ? 'Đề xuất tính năng' : 'Hỗ trợ kỹ thuật' }} · {{ t.updatedAt | date:'dd/MM HH:mm' }}</span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Right: Ticket Conversation Thread -->
        @if (!activeTicket(); as t) {
          <div class="o-card o-empty">
            <o-icon name="message" [size]="28" />
            <div>Chọn một yêu cầu hỗ trợ ở bên trái để xem nội dung trao đổi.</div>
          </div>
        } @else {
          <div class="o-card flex flex-col justify-between">
            <div>
              <div class="o-card-head border-b border-overlay/[0.06]">
                <div class="o-card-ico"><o-icon name="message" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">{{ activeTicket().subject }}</div>
                  <div class="o-card-sub font-mono">
                    Mã phiếu: #{{ activeTicket().id }} · Tạo lúc {{ activeTicket().createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                <span class="o-badge pill success">Kỹ sư trực 24/7</span>
              </div>

              <div class="o-card-body pt-4 flex flex-col gap-3 max-h-[440px] o-scroll">
                @for (m of activeTicket().messages || []; track m.id) {
                  <div
                    class="o-tile flex flex-col gap-1.5 max-w-[86%]"
                    [class.self-start]="m.role === 'staff'"
                    [class.self-end]="m.role !== 'staff'"
                    [style.border-color]="m.role !== 'staff' ? 'rgb(var(--c-primary) / 0.35)' : ''"
                    [style.background]="m.role !== 'staff' ? 'rgb(var(--c-primary) / 0.1)' : ''">
                    <div class="flex items-center justify-between gap-4 text-label-sm">
                      <strong [class.o-secondary]="m.role === 'staff'" [class.o-primary]="m.role !== 'staff'">
                        {{ m.author }}
                      </strong>
                      <span class="font-mono o-muted">{{ m.createdAt | date:'dd/MM HH:mm' }}</span>
                    </div>
                    <p class="whitespace-pre-line text-body-sm">{{ m.body }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Reply Box -->
            <div class="p-4 border-t border-overlay/[0.06] flex gap-2">
              <input
                class="o-input flex-1"
                [(ngModel)]="replyText"
                (keydown.enter)="sendReply()"
                placeholder="Nhập phản hồi thêm cho kỹ thuật viên…" />
              <button type="button" class="o-btn o-btn-primary shrink-0" (click)="sendReply()">
                <o-icon name="send" [size]="14" /> Gửi phản hồi
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- New Ticket Modal -->
    @if (newModalOpen()) {
      <div class="o-backdrop" (click)="newModalOpen.set(false)"></div>
      <div class="o-modal" (click)="$event.stopPropagation()">
        <div class="o-modal-head">
          <div>
            <div class="o-card-title">Tạo yêu cầu hỗ trợ / Góp ý mới</div>
            <div class="o-card-sub">Đội ngũ kỹ sư Omnira phản hồi trung bình trong 15 phút.</div>
          </div>
          <button type="button" class="o-icon-btn" (click)="newModalOpen.set(false)"><o-icon name="x" [size]="16" /></button>
        </div>

        <div class="o-modal-body">
          <label class="o-field">
            <span class="o-label">Phân loại yêu cầu</span>
            <select class="o-select" [(ngModel)]="newForm.type">
              <option value="support">Hỗ trợ kỹ thuật / Báo lỗi</option>
              <option value="feature">Đề xuất tính năng mới</option>
              <option value="billing">Thanh toán & Bản quyền</option>
            </select>
          </label>

          <label class="o-field">
            <span class="o-label">Tiêu đề</span>
            <input class="o-input" [(ngModel)]="newForm.subject" placeholder="VD: Cần hướng dẫn tối ưu Seedance 2.0 nhiều cảnh…" />
          </label>

          <label class="o-field">
            <span class="o-label">Nội dung chi tiết</span>
            <textarea class="o-textarea" [(ngModel)]="newForm.body" rows="4" placeholder="Mô tả chi tiết yêu cầu của bạn…"></textarea>
          </label>
        </div>

        <div class="o-modal-foot">
          <button type="button" class="o-btn o-btn-subtle" (click)="newModalOpen.set(false)">Hủy</button>
          <button type="button" class="o-btn o-btn-primary" (click)="createTicket()">
            <o-icon name="send" [size]="14" /> Gửi yêu cầu
          </button>
        </div>
      </div>
    }
  `,
})
export class SupportPage implements OnInit {
  private readonly api = inject(OmniApiService);

  readonly tickets = signal<DynamicEntity[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly newModalOpen = signal(false);

  replyText = '';
  newForm = {
    type: 'support',
    subject: '',
    body: '',
  };

  readonly activeTicket = computed(
    () => this.tickets().find((t) => t.id === this.selectedId()) || this.tickets()[0] || null,
  );

  async ngOnInit() {
    await this.loadTickets();
  }

  async loadTickets() {
    const list = await this.api.invoke<DynamicEntity[]>('support.list', {});
    this.tickets.set(list || []);
    if (!this.selectedId() && list?.length) {
      this.selectedId.set(list[0].id);
    }
  }

  async sendReply() {
    const t = this.activeTicket();
    if (!t || !this.replyText.trim()) return;
    const updated = await this.api.invoke<DynamicEntity>('support.reply', {
      id: t.id,
      body: this.replyText.trim(),
    });
    this.replyText = '';
    if (updated) {
      await this.loadTickets();
    }
  }

  async createTicket() {
    if (!this.newForm.subject.trim()) return;
    const created = await this.api.invoke<DynamicEntity>('support.create', this.newForm);
    this.newForm = { type: 'support', subject: '', body: '' };
    this.newModalOpen.set(false);
    await this.loadTickets();
    if (created?.id) this.selectedId.set(created.id);
  }
}
export { SupportPage as SupportPageComponent };
