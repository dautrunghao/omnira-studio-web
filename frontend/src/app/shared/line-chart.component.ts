import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { fmtCompact } from './util';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null | undefined)[];
}

/** Biểu đồ đường SVG nhẹ (không thư viện), có tooltip theo cột và chế độ bảng số liệu. */
@Component({
  selector: 'o-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showTable()) {
      <div class="o-table-wrap" [style.max-height.px]="height()">
        <table class="o-table">
          <thead><tr><th>Ngày</th>@for (s of series(); track s.key) { <th class="text-right">{{ s.label }}</th> }</tr></thead>
          <tbody>
            @for (x of xLabels(); track $index; let i = $index) {
              <tr><td class="font-mono">{{ fmtX(x) }}</td>@for (s of series(); track s.key) { <td class="text-right font-mono">{{ fmt(s.values[i]) }}</td> }</tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="relative" (mouseleave)="hover.set(-1)">
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + height()" preserveAspectRatio="none" class="block w-full" [style.height.px]="height()" role="img" [attr.aria-label]="ariaLabel()">
          @for (t of ticks(); track $index) {
            <line [attr.x1]="padL" [attr.x2]="W - padR" [attr.y1]="t.y" [attr.y2]="t.y" stroke="rgb(var(--c-overlay) / 0.06)" />
            <text [attr.x]="padL - 6" [attr.y]="t.y + 3" text-anchor="end" font-size="10" fill="rgb(var(--c-on-surface-variant))" font-family="JetBrains Mono Variable, monospace">{{ fmt(t.v) }}</text>
          }
          @for (l of xTicks(); track $index) {
            <text [attr.x]="l.x" [attr.y]="height() - 6" text-anchor="middle" font-size="10" fill="rgb(var(--c-on-surface-variant))">{{ fmtX(l.label) }}</text>
          }
          @for (p of paths(); track p.key) {
            <path [attr.d]="p.area" [attr.fill]="p.color" fill-opacity="0.08" />
            <path [attr.d]="p.d" fill="none" [attr.stroke]="p.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          }
          @if (hover() >= 0) {
            <line [attr.x1]="xAt(hover())" [attr.x2]="xAt(hover())" [attr.y1]="padT" [attr.y2]="height() - padB" stroke="rgb(var(--c-overlay) / 0.25)" stroke-dasharray="3 3" />
          }
          @for (i of hitIdx(); track i) {
            <rect [attr.x]="xAt(i) - colW() / 2" [attr.y]="0" [attr.width]="colW()" [attr.height]="height()" fill="transparent" (mouseenter)="hover.set(i)" />
          }
        </svg>
        @if (hover() >= 0) {
          <div class="o-tooltip" [style.left.%]="(xAt(hover()) / W) * 100">
            <div class="font-mono text-label-sm o-muted">{{ fmtX(xLabels()[hover()]) }}</div>
            @for (s of series(); track s.key) {
              <div class="flex items-center gap-2 text-body-sm"><span class="o-swatch" [style.background]="s.color"></span>{{ s.label }}<b class="ml-auto font-mono">{{ fmt(s.values[hover()]) }}</b></div>
            }
          </div>
        }
        <div class="flex flex-wrap gap-3 px-2 pt-1">
          @for (s of series(); track s.key) {
            <span class="flex items-center gap-1.5 text-label-sm o-muted"><span class="o-swatch" [style.background]="s.color"></span>{{ s.label }}</span>
          }
        </div>
      </div>
    }
  `,
})
export class LineChartComponent {
  readonly xLabels = input<string[]>([]);
  readonly series = input<ChartSeries[]>([]);
  readonly height = input(240);
  readonly showTable = input(false);
  readonly ariaLabel = input('Biểu đồ');
  readonly formatValue = input<(n: number) => string>(fmtCompact);
  readonly formatX = input<(s: string) => string>((s) => (s && s.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : s));

  readonly W = 800;
  readonly padL = 44;
  readonly padR = 12;
  readonly padT = 12;
  readonly padB = 24;
  readonly hover = signal(-1);

  fmt(v: any) {
    return v == null || isNaN(+v) ? '–' : this.formatValue()(+v);
  }
  fmtX(s: string) {
    return this.formatX()(s);
  }

  private readonly max = computed(() => {
    let m = 0;
    for (const s of this.series()) for (const v of s.values) if (v != null && +v > m) m = +v;
    if (m <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil((m * 1.1) / mag) * mag;
  });

  xAt(i: number) {
    const n = Math.max(1, this.xLabels().length - 1);
    return this.padL + ((this.W - this.padL - this.padR) * i) / n;
  }
  private yAt(v: number) {
    const h = this.height() - this.padT - this.padB;
    return this.padT + h - (h * v) / this.max();
  }

  readonly colW = computed(() => (this.W - this.padL - this.padR) / Math.max(1, this.xLabels().length));
  readonly hitIdx = computed(() => this.xLabels().map((_, i) => i));

  readonly ticks = computed(() => {
    const m = this.max();
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: m * f, y: this.yAt(m * f) }));
  });

  readonly xTicks = computed(() => {
    const xs = this.xLabels();
    if (!xs.length) return [];
    const step = Math.max(1, Math.ceil(xs.length / 7));
    return xs.map((label, i) => ({ label, x: this.xAt(i), i })).filter((t) => t.i % step === 0 || t.i === xs.length - 1);
  });

  readonly paths = computed(() =>
    this.series().map((s) => {
      const pts = s.values.map((v, i) => [this.xAt(i), this.yAt(v == null ? 0 : +v)] as const);
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const base = this.height() - this.padB;
      const area = pts.length ? `${d} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z` : '';
      return { key: s.key, color: s.color, d, area };
    }),
  );
}
