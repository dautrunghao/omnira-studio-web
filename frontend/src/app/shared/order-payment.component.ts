import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from './icon.component';
import { errOf, fmtDateTime, fmtVnd } from './util';

export interface BillingOrder {
  id?: string;
  code: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
  planCode?: string;
  planName?: string;
  amountVnd: number;
  listPriceVnd?: number;
  pointsUsed?: number;
  promoDiscountVnd?: number;
  referralDiscountVnd?: number;
  qrUrl?: string | null;
  checkoutUrl?: string | null;
  bank?: { code?: string; name?: string; accountNo?: string; accountName?: string } | null;
  expiresAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  paidAt?: string | number | Date | null;
}

/** Khung thanh toán đơn: QR VietQR / PayOS + thông tin chuyển khoản, tự hỏi trạng thái (billing.order) mỗi 4 giây. */
@Component({
  selector: 'o-order-payment',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let o = cur();
    @if (o) {
      @if (o.status === 'PAID') {
        <div class="o-banner success"><o-icon name="checkcheck" [size]="18" class="o-tertiary" /> <b>Thanh toán thành công – gói đã được kích hoạt</b></div>
      } @else if (o.status === 'EXPIRED' || o.status === 'CANCELLED') {
        <div class="o-banner danger"><o-icon name="alert" [size]="16" class="o-error" /> Đơn {{ o.code }} đã hết hạn – vui lòng tạo đơn mới.</div>
      }
      <div class="pay">
        <div class="qr">
          @if (o.qrUrl) {
            <img [src]="o.qrUrl" alt="Mã QR thanh toán" [class.big]="zoom()" (click)="zoom.set(!zoom())" title="Phóng to để quét dễ hơn" />
          } @else {
            <div class="o-empty"><o-icon name="qr" [size]="40" />Không có mã QR</div>
          }
          @if (o.status === 'PENDING') {
            <div class="flex items-center gap-2 text-label-sm o-muted"><o-icon name="loader" [size]="13" class="o-spin" /> Đang chờ thanh toán…</div>
          }
        </div>
        <div class="flex flex-col gap-2 min-w-0 flex-1">
          <div class="row"><span class="o-muted">Gói</span><b>{{ o.planName || o.planCode }}</b></div>
          <div class="row"><span class="o-muted">Mã đơn (nội dung CK)</span><span class="flex items-center gap-1"><b class="o-code">{{ o.code }}</b><button class="o-icon-btn" style="width: 24px; height: 24px" (click)="copy(o.code, 'mã đơn')"><o-icon name="copy" [size]="13" /></button></span></div>
          @if (o.bank; as b) {
            <div class="row"><span class="o-muted">Ngân hàng</span><b>{{ b.name || b.code }}</b></div>
            <div class="row"><span class="o-muted">Số tài khoản</span><span class="flex items-center gap-1"><b class="o-code">{{ b.accountNo }}</b><button class="o-icon-btn" style="width: 24px; height: 24px" (click)="copy(b.accountNo || '', 'số tài khoản')"><o-icon name="copy" [size]="13" /></button></span></div>
            <div class="row"><span class="o-muted">Chủ tài khoản</span><b>{{ b.accountName }}</b></div>
          }
          @if (o.listPriceVnd && o.listPriceVnd !== o.amountVnd) { <div class="row"><span class="o-muted">Giá gói</span><s class="o-muted">{{ vnd(o.listPriceVnd) }}</s></div> }
          @if (o.promoDiscountVnd) { <div class="row"><span class="o-muted">Khuyến mãi</span><span class="o-tertiary">−{{ vnd(o.promoDiscountVnd) }}</span></div> }
          @if (o.referralDiscountVnd) { <div class="row"><span class="o-muted">Ưu đãi giới thiệu</span><span class="o-tertiary">−{{ vnd(o.referralDiscountVnd) }}</span></div> }
          @if (o.pointsUsed) { <div class="row"><span class="o-muted">Trừ điểm</span><span class="o-tertiary">−{{ o.pointsUsed.toLocaleString('vi-VN') }} điểm</span></div> }
          <div class="row" style="font-size: 1rem"><span>Số tiền</span><b class="o-primary">{{ vnd(o.amountVnd) }}</b></div>
          @if (o.expiresAt) { <div class="text-label-sm o-faint">Hết hạn lúc {{ dt(o.expiresAt) }}</div> }
          <div class="flex flex-wrap gap-2 mt-2">
            @if (o.checkoutUrl) { <a class="o-btn o-btn-primary" [href]="o.checkoutUrl" target="_blank" rel="noopener"><o-icon name="external" [size]="14" /> Mở trang thanh toán</a> }
            <button class="o-btn" (click)="check()" [disabled]="checking()"><o-icon name="refresh" [size]="14" [class.o-spin]="checking()" /> Kiểm tra thanh toán</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `.pay { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }
     .qr { display: flex; flex-direction: column; align-items: center; gap: 8px; }
     .qr img { width: 200px; height: 200px; border-radius: 12px; background: #fff; padding: 8px; cursor: zoom-in; transition: width .15s, height .15s; }
     .qr img.big { width: min(300px, calc(100vw - 48px)); height: min(300px, calc(100vw - 48px)); cursor: zoom-out; }
     .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: .8125rem; }`,
  ],
})
export class OrderPaymentComponent {
  private readonly api = inject(OmniApiService);
  readonly order = input.required<BillingOrder>();
  readonly paid = output<BillingOrder>();
  readonly cur = signal<BillingOrder | null>(null);
  readonly zoom = signal(false);
  readonly checking = signal(false);
  readonly vnd = fmtVnd;
  readonly dt = fmtDateTime;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect(() => {
      this.cur.set(this.order());
      clearInterval(this.timer);
      if (this.order().status === 'PENDING') this.timer = setInterval((): void => { void this.check(true); }, 4000);
    });
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  async check(silent = false): Promise<void> {
    const o = this.cur();
    if (!o) return;
    if (!silent) this.checking.set(true);
    const r = await this.api.invokeRaw<BillingOrder>('billing.order', { code: o.code });
    this.checking.set(false);
    if (!r.ok) {
      if (!silent) this.api.toast('Không kiểm tra được đơn', errOf(r), 'error');
      return;
    }
    this.cur.set(r.data);
    if (r.data.status !== 'PENDING') clearInterval(this.timer);
    if (r.data.status === 'PAID') {
      this.api.toast('Thanh toán thành công – gói đã được kích hoạt', undefined, 'success');
      this.paid.emit(r.data);
    } else if (!silent) this.api.toast('Chưa nhận được thanh toán', 'Hệ thống tự kiểm tra lại mỗi vài giây', 'info');
  }

  copy(v: string, what: string): void {
    void navigator.clipboard?.writeText(v);
    this.api.toast(`Đã chép ${what}`, v, 'success');
  }
}
