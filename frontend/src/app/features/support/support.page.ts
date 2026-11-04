import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">💬</span> Hỗ trợ kỹ thuật & Góp ý tính năng
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Gửi yêu cầu hỗ trợ trực tiếp tới đội ngũ kỹ sư Omnira Studio, báo lỗi hoặc đề xuất tính năng AI mới.
          </p>
        </div>

        <button
          type="button"
          (click)="newModalOpen.set(true)"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90">
          ＋ Tạo yêu cầu hỗ trợ mới
        </button>
      </div>

      <div class="grid grid-cols-1 gap-space-md lg:grid-cols-[340px_1fr]">
        <!-- Left: Ticket List -->
        <div class="flex flex-col gap-2 rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
          <h2 class="text-title-sm font-semibold text-on-surface">Danh sách yêu cầu ({{ tickets().length }})</h2>

          @for (t of tickets(); track t.id) {
            <button
              type="button"
              (click)="selectedId.set(t.id)"
              class="flex flex-col gap-1 rounded-xl p-3 text-left transition"
              [ngClass]="t.id === selectedId() ? 'bg-surface-container-high border border-secondary/40' : 'bg-surface-container-lowest hover:bg-surface-container-low border border-transparent'">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs text-outline">#{{ t.id }}</span>
                <span
                  class="rounded px-2 py-0.5 text-[10px] font-semibold"
                  [ngClass]="t.status === 'answered' ? 'bg-tertiary/15 text-tertiary' : 'bg-secondary/15 text-secondary'">
                  {{ t.status === 'answered' ? 'Đã phản hồi' : 'Đang xử lý' }}
                </span>
              </div>
              <div class="truncate font-semibold text-label-md text-on-surface">{{ t.subject }}</div>
              <div class="text-xs text-outline">
                {{ t.type === 'feature' ? '💡 Đề xuất tính năng' : '🛠 Hỗ trợ kỹ thuật' }} · {{ t.updatedAt | date:'dd/MM HH:mm' }}
              </div>
            </button>
          }
        </div>

        <!-- Right: Ticket Conversation Thread -->
        @if (!activeTicket(); as t) {
          <div class="flex items-center justify-center rounded-2xl border border-overlay/[0.08] bg-surface-container p-12 text-body-sm text-outline">
            Chọn một yêu cầu hỗ trợ ở bên trái để xem nội dung trao đổi.
          </div>
        } @else {
          <div class="flex flex-col justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div>
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-overlay/[0.06] pb-3">
                <div>
                  <h2 class="text-title-md font-bold text-on-surface">{{ activeTicket().subject }}</h2>
                  <span class="font-mono text-xs text-outline">
                    Mã phiếu: #{{ activeTicket().id }} · Tạo lúc {{ activeTicket().createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
                <span class="rounded-full bg-tertiary/15 px-3 py-1 text-xs font-semibold text-tertiary">
                  Đội ngũ Omnira trực tuyến 24/7
                </span>
              </div>

              <div class="mt-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                @for (m of activeTicket().messages || []; track m.id) {
                  <div
                    class="flex flex-col gap-1 rounded-xl p-3.5 max-w-[85%]"
                    [ngClass]="m.role === 'staff' ? 'self-start bg-surface-container-high border border-secondary/30' : 'self-end bg-primary/20 border border-primary/30'">
                    <div class="flex items-center justify-between gap-4 text-xs">
                      <strong [ngClass]="m.role === 'staff' ? 'text-secondary' : 'text-primary'">
                        {{ m.author }}
                      </strong>
                      <span class="font-mono text-[11px] text-outline">{{ m.createdAt | date:'dd/MM HH:mm' }}</span>
                    </div>
                    <p class="whitespace-pre-line text-body-sm text-on-surface">{{ m.body }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Reply Box -->
            <div class="flex gap-2 border-t border-overlay/[0.06] pt-3">
              <input
                [(ngModel)]="replyText"
                (keydown.enter)="sendReply()"
                placeholder="Nhập phản hồi thêm cho kỹ thuật viên…"
                class="min-w-0 flex-1 rounded-xl border border-overlay/[0.12] bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface" />
              <button
                type="button"
                (click)="sendReply()"
                class="rounded-xl bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary">
                Gửi phản hồi
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- New Ticket Modal -->
    @if (newModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">Tạo yêu cầu hỗ trợ / Góp ý mới</h3>
            <button type="button" (click)="newModalOpen.set(false)" class="text-on-surface-variant">✕</button>
          </div>

          <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Phân loại
            <select [(ngModel)]="newForm.type" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface">
              <option value="support">🛠 Hỗ trợ kỹ thuật / Báo lỗi</option>
              <option value="feature">💡 Đề xuất tính năng mới</option>
              <option value="billing">💳 Thanh toán & Bản quyền</option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Tiêu đề
            <input [(ngModel)]="newForm.subject" placeholder="VD: Cần hướng dẫn tối ưu Seedance 2.0 nhiều cảnh…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
          </label>

          <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Nội dung chi tiết
            <textarea [(ngModel)]="newForm.body" rows="4" placeholder="Mô tả chi tiết yêu cầu của bạn…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface"></textarea>
          </label>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="newModalOpen.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="createTicket()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary">Gửi yêu cầu</button>
          </div>
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
    () => this.tickets().find((t) => t.id === this.selectedId()) || this.tickets()[0] || null
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
