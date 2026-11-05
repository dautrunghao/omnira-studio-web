import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="o-page">
      <!-- Page Header -->
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="card" [size]="21" /></div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="o-page-title">Gói & Thanh toán</h1>
            <span class="o-badge pill success">VietQR Tự động</span>
          </div>
          <p class="o-page-desc">
            Quản lý bản quyền Omnira Studio, nâng cấp gói cước bằng mã QR ngân hàng tự động, quản lý thiết bị và nhận thưởng giới thiệu.
          </p>
        </div>

        @if (license(); as lic) {
          <div class="o-page-actions">
            <div class="o-tile flex items-center gap-3">
              <span class="o-avatar"><o-icon name="award" [size]="18" class="o-tertiary" /></span>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-label-lg">{{ lic.planName || 'Omnira Studio Pro' }}</span>
                  <span class="o-badge success">Đang hoạt động</span>
                </div>
                <div class="font-mono text-label-sm o-muted">
                  Hạn dùng: {{ lic.expiresAt | date:'dd/MM/yyyy' }} · Tối đa {{ lic.maxDevices || 5 }} thiết bị
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Promotions Banner -->
      @for (promo of promotions(); track promo.id) {
        <div class="o-banner primary justify-between">
          <div class="flex flex-wrap items-center gap-2.5">
            <o-icon name="gift" [size]="17" class="o-primary" />
            <strong class="text-label-lg">{{ promo.title }}</strong>
            <span class="o-badge mono primary">Mã: {{ promo.code }}</span>
          </div>
          <span class="text-label-sm o-muted">Giảm ngay {{ promo.discountPct }}% khi thanh toán trực tuyến</span>
        </div>
      }

      @if (toastMsg()) {
        <div class="o-banner success justify-between">
          <div class="flex items-center gap-2">
            <o-icon name="checkcheck" [size]="16" class="o-tertiary" />
            <span class="font-medium">{{ toastMsg() }}</span>
          </div>
          <button type="button" class="o-btn o-btn-ghost o-btn-sm" (click)="toastMsg.set('')">Đóng</button>
        </div>
      }

      <!-- Pricing Plans Grid -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        @for (p of plans(); track p.code) {
          <div
            class="o-card flex flex-col justify-between p-5"
            [style.border-color]="p.code === 'STUDIO_PRO' ? 'rgb(var(--c-primary))' : ''"
            [style.box-shadow]="p.code === 'STUDIO_PRO' ? '0 0 0 1px rgb(var(--c-primary) / 0.35), 0 14px 36px -8px rgb(var(--c-primary-container) / 0.25)' : ''">
            <div class="flex flex-col gap-3.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h2 class="text-title-md font-bold">{{ p.name }}</h2>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span class="o-badge mono secondary">{{ p.maxChannels }} kênh</span>
                    <span class="o-badge mono">{{ p.maxDevices }} thiết bị</span>
                  </div>
                </div>
                @if (p.badge) {
                  <span class="o-badge pill" [class.primary]="p.code === 'STUDIO_PRO'" [class.secondary]="p.code !== 'STUDIO_PRO'">
                    {{ p.badge }}
                  </span>
                }
              </div>

              <div class="o-tile flex items-baseline gap-2">
                <span class="text-headline-lg font-extrabold o-primary">{{ p.priceVnd | number }}đ</span>
                <span class="text-label-sm o-faint line-through">{{ p.originalPriceVnd | number }}đ</span>
                <span class="text-label-sm o-muted">/ {{ p.periodMonths }} tháng</span>
              </div>

              <ul class="flex flex-col gap-2 text-body-sm o-muted">
                @for (h of p.highlights; track h) {
                  <li class="flex items-start gap-2">
                    <o-icon name="check" [size]="15" class="o-tertiary mt-0.5" />
                    <span class="text-on-surface">{{ h }}</span>
                  </li>
                }
              </ul>
            </div>

            <button
              type="button"
              class="o-btn o-btn-lg w-full mt-5"
              [class.o-btn-primary]="p.code === 'STUDIO_PRO'"
              (click)="createOrder(p)">
              <o-icon name="qr" [size]="16" /> Chọn gói & Tạo mã VietQR
            </button>
          </div>
        }
      </div>

      <!-- License Key Activation + Devices + Referral -->
      <div class="o-two even">
        <!-- Left: License Key Activation & Connected Devices -->
        <div class="o-card">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="key" [size]="18" /></div>
            <div class="min-w-0 flex-1">
              <div class="o-card-title">Kích hoạt mã bản quyền & Thiết bị</div>
              <div class="o-card-sub">Nhập khóa kích hoạt gói doanh nghiệp hoặc quản lý thiết bị đăng nhập.</div>
            </div>
          </div>

          <div class="o-card-body flex flex-col gap-4">
            <div class="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                class="o-input font-mono flex-1"
                [(ngModel)]="licenseKeyInput"
                placeholder="Nhập mã kích hoạt (VD: OMNI-PRO-2026-XXXX)…" />
              <button type="button" class="o-btn o-btn-primary shrink-0" (click)="activateKey()">
                <o-icon name="check" [size]="14" /> Kích hoạt
              </button>
            </div>

            <div class="o-divider"></div>

            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="text-label-lg font-semibold">
                  Thiết bị đang đăng nhập ({{ devices().length }}/{{ license()?.maxDevices || 5 }})
                </span>
              </div>
              @for (d of devices(); track d.id) {
                <div class="o-tile flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="o-avatar"><o-icon name="laptop" [size]="16" class="o-primary" /></span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-body-sm truncate">{{ d.name }}</span>
                        @if (d.current) {
                          <span class="o-badge success">Thiết bị này</span>
                        }
                      </div>
                      <div class="font-mono text-label-sm o-muted truncate">{{ d.os || 'macOS / Web' }} · Hoạt động hôm nay</div>
                    </div>
                  </div>
                  @if (!d.current) {
                    <button type="button" class="o-btn o-btn-danger o-btn-sm" (click)="removeDevice(d.id)">
                      Gỡ thiết bị
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Right: Referral Program & Order History -->
        <div class="o-card">
          <div class="o-card-head">
            <div class="o-card-ico"><o-icon name="gift" [size]="18" /></div>
            <div class="min-w-0 flex-1">
              <div class="o-card-title">Giới thiệu bạn bè & Lịch sử đơn hàng</div>
              <div class="o-card-sub">Chia sẻ mã giới thiệu nhận 20% hoa hồng và tra cứu hóa đơn VietQR.</div>
            </div>
          </div>

          <div class="o-card-body flex flex-col gap-4">
            @if (referral(); as ref) {
              <div class="o-tile flex flex-col gap-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-semibold text-label-lg">Thưởng giới thiệu đối tác (20% hoa hồng)</span>
                  <span class="o-badge pill secondary">{{ ref.points | number }} điểm thưởng</span>
                </div>
                <p class="text-body-sm o-muted">
                  Người nhập mã được giảm 10% đơn đầu tiên, bạn nhận 20% giá trị đơn hàng vào quỹ thưởng.
                </p>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="o-badge mono primary" style="height: 32px; padding: 0 12px; font-size: 13px">{{ ref.code }}</span>
                  <button type="button" class="o-btn o-btn-sm" (click)="copyReferral(ref.code)">
                    <o-icon name="copy" [size]="13" /> Sao chép mã
                  </button>
                  <span class="ml-auto text-label-sm o-muted">
                    Đã mời {{ ref.totalInvited }} người ({{ ref.paidInvited }} đã mua)
                  </span>
                </div>
              </div>
            }

            <div class="flex flex-col gap-2">
              <div class="text-label-lg font-semibold">Lịch sử đơn hàng ({{ orders().length }})</div>
              <div class="flex flex-col gap-2 max-h-60 o-scroll">
                @for (o of orders(); track o.id) {
                  <div class="o-tile flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="font-semibold text-body-sm truncate">{{ o.planName }} ({{ o.code }})</div>
                      <div class="font-mono text-label-sm o-muted">{{ o.amountVnd | number }}đ · {{ o.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="o-badge" [class.success]="o.status === 'paid'" [class.warning]="o.status !== 'paid'">
                        {{ o.status === 'paid' ? 'Đã thanh toán' : 'Chờ chuyển khoản' }}
                      </span>
                      @if (o.qrUrl) {
                        <button type="button" class="o-btn o-btn-sm" (click)="activeQrOrder.set(o)">
                          <o-icon name="qr" [size]="13" /> Mã QR
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VietQR Payment Modal -->
    @if (activeQrOrder(); as qrOrd) {
      <div class="o-backdrop" (click)="activeQrOrder.set(null)"></div>
      <div class="o-modal" style="max-width: 440px" (click)="$event.stopPropagation()">
        <div class="o-modal-head">
          <div>
            <div class="o-card-title">Quét mã VietQR để thanh toán</div>
            <div class="o-card-sub">Tự động kích hoạt gói trong 15 giây sau khi chuyển khoản.</div>
          </div>
          <button type="button" class="o-icon-btn" (click)="activeQrOrder.set(null)"><o-icon name="x" [size]="16" /></button>
        </div>
        <div class="o-modal-body items-center text-center">
          <img [src]="qrOrd.qrUrl" alt="VietQR" class="h-56 w-56 rounded-xl bg-white p-2.5 object-contain border border-overlay/[0.1]" />
          <div class="o-tile w-full text-left font-mono text-xs flex flex-col gap-1.5">
            <div class="flex justify-between"><span class="o-muted">Ngân hàng:</span> <strong>{{ qrOrd.bankName }}</strong></div>
            <div class="flex justify-between"><span class="o-muted">Số tài khoản:</span> <strong>{{ qrOrd.accountNumber }}</strong></div>
            <div class="flex justify-between"><span class="o-muted">Số tiền:</span> <strong class="o-secondary">{{ qrOrd.amountVnd | number }} VNĐ</strong></div>
            <div class="flex justify-between"><span class="o-muted">Nội dung CK:</span> <strong class="o-primary">{{ qrOrd.transferContent }}</strong></div>
          </div>
        </div>
        <div class="o-modal-foot">
          <button type="button" class="o-btn o-btn-primary w-full" (click)="activeQrOrder.set(null)">Đã hiểu / Đóng</button>
        </div>
      </div>
    }
  `,
})
export class BillingPage implements OnInit {
  private readonly api = inject(OmniApiService);

  readonly license = signal<DynamicEntity | null>(null);
  readonly plans = signal<DynamicEntity[]>([]);
  readonly promotions = signal<DynamicEntity[]>([]);
  readonly orders = signal<DynamicEntity[]>([]);
  readonly devices = signal<DynamicEntity[]>([]);
  readonly referral = signal<DynamicEntity | null>(null);
  readonly activeQrOrder = signal<DynamicEntity | null>(null);
  readonly toastMsg = signal('');

  licenseKeyInput = '';

  async ngOnInit() {
    await this.loadAll();
  }

  async loadAll() {
    const [lic, pl, pr, ord, dev, ref] = await Promise.all([
      this.api.invoke<DynamicEntity>('license.state', {}),
      this.api.invoke<DynamicEntity[]>('billing.plans', {}),
      this.api.invoke<DynamicEntity[]>('billing.promotions', {}),
      this.api.invoke<DynamicEntity[]>('billing.orders', {}),
      this.api.invoke<DynamicEntity>('license.devices', {}),
      this.api.invoke<DynamicEntity>('billing.referral', {}),
    ]);
    this.license.set(lic);
    this.plans.set(pl || []);
    this.promotions.set(pr || []);
    this.orders.set(ord || []);
    this.devices.set(dev?.devices || []);
    this.referral.set(ref);
  }

  async createOrder(plan: DynamicEntity) {
    const ord = await this.api.invoke<DynamicEntity>('billing.createOrder', {
      planCode: plan.code,
      months: plan.periodMonths,
    });
    this.orders.set([ord, ...this.orders()]);
    this.activeQrOrder.set(ord);
  }

  async activateKey() {
    if (!this.licenseKeyInput.trim()) return;
    const lic = await this.api.invoke<DynamicEntity>('license.activate', { key: this.licenseKeyInput.trim() });
    this.license.set(lic);
    this.licenseKeyInput = '';
    this.toastMsg.set('Đã kích hoạt bản quyền Omnira Studio Pro thành công!');
  }

  async removeDevice(id: string) {
    const res = await this.api.invoke<DynamicEntity>('license.removeDevice', { id });
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
