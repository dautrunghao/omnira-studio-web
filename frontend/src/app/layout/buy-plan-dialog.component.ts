import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { BillingOrder, OrderPaymentComponent } from '../shared/order-payment.component';
import { BillingPlan, PlanCardComponent, Promotion, runningPromo } from '../shared/plan-card.component';
import { asList } from '../shared/util';
import { ShellStore } from './shell.store';

/** Hộp thoại mua / gia hạn gói – mở từ bất kỳ đâu qua api.buyPlanOpen (và shell.buyPlanCode để chọn sẵn gói). */
@Component({
  selector: 'omni-buy-plan-dialog',
  standalone: true,
  imports: [ModalComponent, PlanCardComponent, OrderPaymentComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <o-modal [open]="api.buyPlanOpen()" [wide]="true" [title]="order() ? 'Thanh toán đơn ' + order()!.code : 'Mua / gia hạn gói Omnira Studio'" subtitle="Thanh toán chuyển khoản VietQR – gói kích hoạt tự động sau khi nhận tiền" (closed)="close()">
      @if (order(); as o) {
        <o-order-payment [order]="o" (paid)="onPaid()" />
      } @else {
        @if (promo(); as p) {
          <div class="o-banner primary"><o-icon name="gift" [size]="16" class="o-primary" /><span><b>{{ p.bannerTitle || p.name }}</b> {{ p.bannerText }}</span></div>
        }
        @if (firstPct() > 0) {
          <div class="o-banner"><o-icon name="gift" [size]="15" class="o-secondary" />Ưu đãi lần đầu: bạn được giảm <b>{{ firstPct() }}%</b> giá gói vì đăng ký bằng mã giới thiệu của bạn bè (tự trừ khi tạo đơn)</div>
        }
        @if (points() > 0) {
          <label class="o-check"><input type="checkbox" [checked]="usePoints()" (change)="usePoints.set(!usePoints())" /> Dùng {{ points().toLocaleString('vi-VN') }} điểm giới thiệu để trừ vào đơn</label>
        }
        @if (loading()) {
          <div class="o-grid-cards">@for (i of [0, 1, 2]; track i) { <div class="o-skel" style="height: 320px"></div> }</div>
        } @else {
          <div class="o-grid-cards">
            @for (p of plans(); track p.code) {
              <o-plan-card [plan]="p" [promo]="promo()" [current]="p.code === shell.license()?.planCode" [busy]="busy() === p.code" (choose)="buy($event)" />
            } @empty { <div class="o-empty">Chưa tải được danh sách gói</div> }
          </div>
        }
      }
      <div modal-footer>
        @if (order()) { <button class="o-btn o-btn-subtle" (click)="order.set(null)">Chọn gói khác</button> }
        <button class="o-btn" (click)="close()">Đóng</button>
      </div>
    </o-modal>
  `,
})
export class BuyPlanDialogComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  readonly plans = signal<BillingPlan[]>([]);
  readonly promos = signal<Promotion[]>([]);
  readonly referral = signal<any>(null);
  readonly order = signal<BillingOrder | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null);
  readonly usePoints = signal(true);
  readonly promo = computed(() => runningPromo(this.promos()));
  readonly points = computed(() => this.referral()?.available ?? 0);
  readonly firstPct = computed(() => this.referral()?.firstOrderDiscountPercent ?? 0);

  constructor() {
    effect(() => {
      if (this.api.buyPlanOpen()) void this.load();
    });
  }

  private async load() {
    this.loading.set(true);
    const [p, pr, rf] = await Promise.all([this.api.invokeRaw('billing.plans'), this.api.invokeRaw('billing.promotions'), this.api.invokeRaw('billing.referral')]);
    this.loading.set(false);
    this.plans.set(asList<BillingPlan>(p.ok ? p.data : []));
    this.promos.set(asList<Promotion>(pr.ok ? pr.data : []));
    this.referral.set(rf.ok ? rf.data : null);
    const code = this.shell.buyPlanCode();
    if (code) {
      const plan = this.plans().find((x) => x.code === code);
      this.shell.buyPlanCode.set(null);
      if (plan) void this.buy(plan);
    }
  }

  async buy(p: BillingPlan) {
    this.busy.set(p.code);
    try {
      const o = await this.api.invoke<BillingOrder>('billing.createOrder', { planCode: p.code, usePoints: this.points() > 0 && this.usePoints() });
      this.order.set(o);
      this.shell.bump('billing');
    } catch {
      /* toast đã hiện */
    } finally {
      this.busy.set(null);
    }
  }

  async onPaid() {
    await Promise.all([this.shell.loadLicense(), this.shell.loadAuth()]);
    this.shell.bump('billing', 'license');
  }

  close() {
    this.api.buyPlanOpen.set(false);
    this.order.set(null);
  }
}
