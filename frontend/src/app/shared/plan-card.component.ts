import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from './icon.component';
import { fmtVnd } from './util';

export interface BillingPlan {
  id?: string;
  code: string;
  name: string;
  description?: string;
  priceVnd: number;
  periodLabel?: string;
  periodUnit?: string;
  periodCount?: number;
  billingPeriod?: string;
  maxChannels?: number | null;
  maxDevices?: number | null;
  flowThreads?: number | null;
  features?: string[];
  highlight?: boolean;
  popular?: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  bannerTitle?: string;
  bannerText?: string;
  theme?: string;
  discountPercent?: number;
  discountVnd?: number;
  planCodes?: string[] | null;
  startsAt?: any;
  endsAt?: any;
}

export function runningPromo(list: Promotion[]): Promotion | null {
  const now = Date.now();
  return list.find((p) => (!p.startsAt || new Date(p.startsAt).getTime() <= now) && (!p.endsAt || new Date(p.endsAt).getTime() > now)) ?? null;
}

export function promoOff(plan: BillingPlan, promo: Promotion | null): number {
  if (!promo || (promo.planCodes && promo.planCodes.length && !promo.planCodes.includes(plan.code))) return 0;
  if (promo.discountVnd) return Math.min(plan.priceVnd, promo.discountVnd);
  if (promo.discountPercent) return Math.round((plan.priceVnd * promo.discountPercent) / 100 / 1000) * 1000;
  return 0;
}

const FEATURE_VI: Record<string, string> = {
  SERIES: 'Series AI',
  STUDIO: 'Xưởng Video / Ảnh / TTS',
  FILM: 'Xưởng Phim & Clone video',
  CALENDAR: 'Lịch đăng bài tự động',
  INBOX: 'Hộp thư hợp nhất + AI trả lời',
  ANALYTICS: 'Phân tích & giờ vàng',
};

@Component({
  selector: 'o-plan-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = plan();
    <div class="o-card plan" [class.cur]="current()" [class.hi]="p.highlight || p.popular">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-headline-sm">{{ p.name }}</div>
          @if (p.description) { <p class="text-body-sm o-muted mt-1">{{ p.description }}</p> }
        </div>
        @if (current()) { <span class="o-badge success pill">Đang dùng</span> }
        @else if (p.popular || p.highlight) { <span class="o-badge primary pill">Phổ biến</span> }
      </div>
      <div class="mt-3">
        @if (off() > 0) { <s class="text-body-sm o-muted">{{ vnd(p.priceVnd) }}</s> }
        <div class="flex items-end gap-1">
          <span class="price">{{ p.priceVnd === 0 ? 'Miễn phí' : vnd(p.priceVnd - off()) }}</span>
          @if (p.priceVnd > 0) { <span class="text-body-sm o-muted pb-1">/ {{ p.periodLabel || 'tháng' }}</span> }
        </div>
        @if (off() > 0) { <span class="o-badge success">Khuyến mãi −{{ vnd(off()) }}</span> }
      </div>
      <ul class="flex flex-col gap-1.5 mt-3 text-body-sm">
        <li class="flex items-center gap-2"><o-icon name="radio" [size]="14" class="o-secondary" /> {{ p.maxChannels == null ? 'Không giới hạn kênh' : 'Tối đa ' + p.maxChannels + ' kênh' }}</li>
        <li class="flex items-center gap-2"><o-icon name="laptop" [size]="14" class="o-secondary" /> {{ p.maxDevices == null ? 'Không giới hạn máy' : p.maxDevices + ' máy kích hoạt' }}</li>
        @if (p.flowThreads !== undefined) { <li class="flex items-center gap-2"><o-icon name="workflow" [size]="14" class="o-secondary" /> {{ p.flowThreads == null ? 'Flow không giới hạn luồng' : p.flowThreads + ' luồng Flow song song' }}</li> }
        @for (f of p.features ?? []; track f) {
          <li class="flex items-center gap-2"><o-icon name="check" [size]="14" class="o-tertiary" /> {{ featureVi(f) }}</li>
        }
      </ul>
      <div class="flex-1"></div>
      <button class="o-btn mt-4 w-full" [class.o-btn-primary]="!current()" [disabled]="busy() || p.priceVnd === 0" (click)="choose.emit(p)">
        @if (busy()) { <o-icon name="loader" [size]="14" class="o-spin" /> }
        {{ current() ? 'Gia hạn gói này' : 'Chọn gói này' }}
      </button>
    </div>
  `,
  styles: [
    `.plan { display: flex; flex-direction: column; padding: 18px; height: 100%; }
     .plan.hi { border-color: rgb(var(--c-primary) / 0.4); box-shadow: 0 0 0 1px rgb(var(--c-primary) / 0.15), 0 12px 32px rgb(var(--c-primary) / 0.08); }
     .plan.cur { border-color: rgb(var(--c-success) / 0.45); }
     .price { font-size: 1.75rem; line-height: 2.1rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }`,
  ],
})
export class PlanCardComponent {
  readonly plan = input.required<BillingPlan>();
  readonly promo = input<Promotion | null>(null);
  readonly current = input(false);
  readonly busy = input(false);
  readonly choose = output<BillingPlan>();
  readonly vnd = fmtVnd;
  readonly off = computed(() => promoOff(this.plan(), this.promo()));
  featureVi(f: string) {
    return FEATURE_VI[f] ?? f;
  }
}
