import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Header & Current License Banner -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">💳</span> Gói & Thanh toán
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Quản lý bản quyền Omnira Studio, nâng cấp gói cước bằng mã QR ngân hàng tự động, quản lý thiết bị và nhận thưởng giới thiệu.
          </p>
        </div>

        @if (license()) {
          <div class="flex items-center gap-3 rounded-xl border border-tertiary/30 bg-tertiary/10 px-4 py-2.5">
            <div>
              <div class="text-xs uppercase tracking-wider text-tertiary font-semibold">Gói hiện tại đang kích hoạt</div>
              <div class="text-title-sm font-bold text-on-surface">{{ license().planName || 'Omnira Studio Pro' }}</div>
              <div class="font-mono text-xs text-on-surface-variant">
                Hạn dùng: {{ license().expiresAt | date:'dd/MM/yyyy' }} · Tối đa {{ license().maxDevices || 5 }} thiết bị
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Promotions Banner -->
      @for (promo of promotions(); track promo.id) {
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 px-space-md py-3">
          <div class="flex items-center gap-2 text-body-sm text-on-surface">
            <span class="text-lg">🎁</span>
            <strong>{{ promo.title }}</strong>
            <span class="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-surface">Mã: {{ promo.code }}</span>
          </div>
          <span class="text-xs text-on-surface-variant">Giảm ngay {{ promo.discountPct }}% khi thanh toán trực tuyến</span>
        </div>
      }

      @if (toastMsg()) {
        <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
          <span>{{ toastMsg() }}</span>
          <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
        </div>
      }

      <!-- Pricing Plans Grid -->
      <div class="grid grid-cols-1 gap-space-md lg:grid-cols-3">
        @for (p of plans(); track p.code) {
          <div
            class="relative flex flex-col justify-between rounded-2xl border p-space-lg transition"
            [ngClass]="p.code === 'STUDIO_PRO' ? 'border-secondary bg-surface-container-high shadow-xl' : 'border-overlay/[0.08] bg-surface-container'">
            @if (p.badge) {
              <span
                class="absolute right-4 top-4 rounded-full px-3 py-0.5 text-label-sm font-semibold"
                [ngClass]="p.code === 'STUDIO_PRO' ? 'bg-secondary text-surface' : 'bg-primary/20 text-primary'">
                {{ p.badge }}
              </span>
            }

            <div class="flex flex-col gap-3">
              <div>
                <h2 class="text-title-md font-bold text-on-surface">{{ p.name }}</h2>
                <div class="mt-2 flex items-baseline gap-2">
                  <span class="text-headline-lg font-extrabold text-on-surface">{{ p.priceVnd | number }}đ</span>
                  <span class="text-label-sm text-outline line-through">{{ p.originalPriceVnd | number }}đ</span>
                  <span class="text-label-sm text-on-surface-variant">/ {{ p.periodMonths }} tháng</span>
                </div>
              </div>

              <div class="flex gap-2 font-mono text-xs text-secondary">
                <span>📺 {{ p.maxChannels }} kênh</span>
                <span>·</span>
                <span>💻 {{ p.maxDevices }} thiết bị</span>
              </div>

              <ul class="mt-2 flex flex-col gap-2 text-body-sm text-on-surface-variant">
                @for (h of p.highlights; track h) {
                  <li class="flex items-start gap-2">
                    <span class="text-tertiary">✓</span>
                    <span>{{ h }}</span>
                  </li>
                }
              </ul>
            </div>

            <button
              type="button"
              (click)="createOrder(p)"
              class="mt-6 w-full rounded-xl py-2.5 text-label-md font-semibold transition"
              [ngClass]="p.code === 'STUDIO_PRO' ? 'bg-secondary text-surface hover:opacity-90' : 'bg-primary text-on-primary hover:opacity-90'">
              Chọn gói & Tạo mã VietQR
            </button>
          </div>
        }
      </div>

      <!-- Active Order QR Modal / Section + License Key Activation + Devices + Referral -->
      <div class="grid grid-cols-1 gap-space-md xl:grid-cols-2">
        <!-- Left: License Key Activation & Connected Devices -->
        <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
          <h3 class="text-title-sm font-semibold text-on-surface">🔑 Kích hoạt mã bản quyền (License Key)</h3>
          <div class="flex gap-2">
            <input
              [(ngModel)]="licenseKeyInput"
              placeholder="Nhập mã kích hoạt (VD: OMNI-PRO-2026-XXXX)…"
              class="min-w-0 flex-1 rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface" />
            <button
              type="button"
              (click)="activateKey()"
              class="rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary">
              Kích hoạt
            </button>
          </div>

          <div class="border-t border-overlay/[0.06] pt-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-label-md font-semibold text-on-surface">
                💻 Thiết bị đang đăng nhập ({{ devices().length }}/{{ license()?.maxDevices || 5 }})
              </span>
            </div>
            <ul class="flex flex-col gap-2">
              @for (d of devices(); track d.id) {
                <li class="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                  <div>
                    <div class="font-medium text-body-sm text-on-surface">
                      {{ d.name }}
                      @if (d.current) {
                        <span class="ml-1.5 rounded bg-tertiary/15 px-2 py-0.5 text-[10px] text-tertiary">Thiết bị này</span>
                      }
                    </div>
                    <div class="font-mono text-xs text-outline">{{ d.os || 'macOS / Web' }} · Hoạt động gần nhất hôm nay</div>
                  </div>
                  @if (!d.current) {
                    <button
                      type="button"
                      (click)="removeDevice(d.id)"
                      class="rounded bg-error/15 px-2.5 py-1 text-xs text-error hover:bg-error/25">
                      Gỡ thiết bị
                    </button>
                  }
                </li>
              }
            </ul>
          </div>
        </div>

        <!-- Right: Referral Program & Order History -->
        <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
          @if (referral()) {
            <div class="rounded-xl bg-surface-container-lowest p-3.5 border border-overlay/[0.06] flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-title-sm font-semibold text-on-surface">🤝 Giới thiệu bạn bè – Nhận 20% hoa hồng</span>
                <span class="rounded-full bg-secondary/20 px-3 py-0.5 font-mono text-label-sm font-bold text-secondary">
                  {{ referral().points | number }} điểm thưởng
                </span>
              </div>
              <p class="text-xs text-on-surface-variant">
                Chia sẻ mã giới thiệu của bạn. Người nhập được giảm 10% đơn đầu tiên, bạn nhận 20% giá trị đơn hàng.
              </p>
              <div class="flex items-center gap-2">
                <code class="rounded-lg bg-surface-container px-3 py-1.5 font-mono text-body-sm font-bold text-primary">
                  {{ referral().code }}
                </code>
                <button
                  type="button"
                  (click)="copyReferral(referral().code)"
                  class="rounded-lg bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface">
                  📋 Sao chép mã
                </button>
                <span class="ml-auto text-xs text-outline">
                  Đã mời {{ referral().totalInvited }} người ({{ referral().paidInvited }} đã mua)
                </span>
              </div>
            </div>
          }

          <div>
            <h3 class="mb-2 text-title-sm font-semibold text-on-surface">🧾 Lịch sử đơn hàng ({{ orders().length }})</h3>
            <ul class="flex flex-col gap-2 max-h-56 overflow-y-auto">
              @for (o of orders(); track o.id) {
                <li class="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06] text-body-sm">
                  <div>
                    <div class="font-semibold text-on-surface">{{ o.planName }} ({{ o.code }})</div>
                    <div class="font-mono text-xs text-outline">{{ o.amountVnd | number }}đ · {{ o.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      class="rounded px-2 py-0.5 text-xs font-medium"
                      [ngClass]="o.status === 'paid' ? 'bg-tertiary/15 text-tertiary' : 'bg-secondary/15 text-secondary'">
                      {{ o.status === 'paid' ? 'Đã thanh toán' : 'Chờ chuyển khoản' }}
                    </span>
                    @if (o.qrUrl) {
                      <button
                        type="button"
                        (click)="activeQrOrder.set(o)"
                        class="rounded bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                        Mã QR
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- VietQR Payment Modal -->
    @if (activeQrOrder()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" (click)="activeQrOrder.set(null)">
        <div class="w-full max-w-md rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col items-center gap-3 text-center" (click)="$event.stopPropagation()">
          <h3 class="text-headline-sm font-bold text-on-surface">Quét mã VietQR để thanh toán</h3>
          <p class="text-xs text-on-surface-variant">Hệ thống tự động kích hoạt gói trong 15 giây sau khi chuyển khoản.</p>
          <img [src]="activeQrOrder().qrUrl" alt="VietQR" class="h-60 w-60 rounded-xl bg-white p-2 object-contain" />
          <div class="w-full rounded-xl bg-surface-container p-3 text-left font-mono text-xs text-on-surface flex flex-col gap-1">
            <div>Ngân hàng: <strong>{{ activeQrOrder().bankName }}</strong></div>
            <div>Số tài khoản: <strong>{{ activeQrOrder().accountNumber }}</strong></div>
            <div>Số tiền: <strong class="text-secondary">{{ activeQrOrder().amountVnd | number }} VNĐ</strong></div>
            <div>Nội dung CK: <strong class="text-primary">{{ activeQrOrder().transferContent }}</strong></div>
          </div>
          <button
            type="button"
            (click)="activeQrOrder.set(null)"
            class="w-full rounded-xl bg-primary py-2.5 text-label-md font-semibold text-on-primary">
            Đã hiểu / Đóng
          </button>
        </div>
      </div>
    }
  `,
})
export class BillingPage implements OnInit {
  private readonly api = inject(OmniApiService);

  readonly license = signal<any | null>(null);
  readonly plans = signal<any[]>([]);
  readonly promotions = signal<any[]>([]);
  readonly orders = signal<any[]>([]);
  readonly devices = signal<any[]>([]);
  readonly referral = signal<any | null>(null);
  readonly activeQrOrder = signal<any | null>(null);
  readonly toastMsg = signal('');

  licenseKeyInput = '';

  async ngOnInit() {
    await this.loadAll();
  }

  async loadAll() {
    const [lic, pl, pr, ord, dev, ref] = await Promise.all([
      this.api.invoke<any>('license.state', {}),
      this.api.invoke<any[]>('billing.plans', {}),
      this.api.invoke<any[]>('billing.promotions', {}),
      this.api.invoke<any[]>('billing.orders', {}),
      this.api.invoke<any>('license.devices', {}),
      this.api.invoke<any>('billing.referral', {}),
    ]);
    this.license.set(lic);
    this.plans.set(pl || []);
    this.promotions.set(pr || []);
    this.orders.set(ord || []);
    this.devices.set(dev?.devices || []);
    this.referral.set(ref);
  }

  async createOrder(plan: any) {
    const ord = await this.api.invoke<any>('billing.createOrder', {
      planCode: plan.code,
      months: plan.periodMonths,
    });
    this.orders.set([ord, ...this.orders()]);
    this.activeQrOrder.set(ord);
  }

  async activateKey() {
    if (!this.licenseKeyInput.trim()) return;
    const lic = await this.api.invoke<any>('license.activate', { key: this.licenseKeyInput.trim() });
    this.license.set(lic);
    this.licenseKeyInput = '';
    this.toastMsg.set('Đã kích hoạt bản quyền Omnira Studio Pro thành công!');
  }

  async removeDevice(id: string) {
    const res = await this.api.invoke<any>('license.removeDevice', { id });
    this.devices.set(res?.devices || []);
    this.toastMsg.set('Đã gỡ thiết bị khỏi danh sách kích hoạt.');
  }

  async copyReferral(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      this.toastMsg.set(`Đã sao chép mã giới thiệu ${code} vào clipboard!`);
    } catch {
      this.toastMsg.set(`Mã giới thiệu của bạn: ${code}`);
    }
  }
}
export { BillingPage as BillingPageComponent };
