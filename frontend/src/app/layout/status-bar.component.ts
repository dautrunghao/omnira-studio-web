import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { ShellStore } from './shell.store';

const ENCODER_SHORT: Record<string, string> = {
  h264_nvenc: 'NVENC',
  hevc_nvenc: 'NVENC HEVC',
  h264_qsv: 'Intel QSV',
  h264_amf: 'AMD AMF',
  h264_videotoolbox: 'VideoToolbox',
  libx264: 'CPU x264',
};

@Component({
  selector: 'omni-status-bar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="sb">
      <div class="flex min-w-0 items-center gap-4 overflow-hidden">
        <span class="it" [title]="run()?.stage ?? 'Hàng đợi render'">
          <span class="o-dot" [class.success]="!!run()" [class.live]="!!run()"></span>
          @if (run(); as r) {
            Rendering "{{ (r.topic || r.title || '').slice(0, 28) }}" {{ pct(r.progress) }}%
          } @else { Render: rảnh }
          @if (shell.media()?.queued) { · chờ {{ shell.media()?.queued }} }
        </span>
        <span class="it sb-hide-sm" title="Bộ mã hóa video"><o-icon name="monitor" [size]="13" /> Encoder: {{ encoder() }}</span>
        <span class="it sb-hide-md" title="Kết nối máy chủ"><span class="o-dot success"></span> Omnira Cloud · Firebase</span>
      </div>
      <div class="flex shrink-0 items-center gap-4">
        <span class="it" title="Bộ nhớ ứng dụng / tổng RAM"><o-icon name="memory" [size]="13" /> RAM: {{ api.systemStats().appMemoryMb }}MB / {{ gb() }}GB</span>
        <span class="it" title="CPU toàn hệ thống"><o-icon name="cpu" [size]="13" /> CPU: {{ api.systemStats().cpuPercent.toFixed(1) }}%</span>
      </div>
    </footer>
  `,
  styles: [
    `:host { display: block; flex-shrink: 0; width: 100%; max-width: 100vw; }
     .sb { display: flex; height: var(--statusbar-h); width: 100%; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 0 14px; border-top: 1px solid rgb(var(--c-overlay) / 0.07); background: rgb(var(--c-surface-container-lowest)); font-family: 'JetBrains Mono Variable', monospace; font-size: 11px; color: rgb(var(--c-on-surface-variant)); font-variant-numeric: tabular-nums; overflow: hidden; }
     :host-context([data-theme='light']) .sb { background: #ffffff; border-top: 1px solid rgb(var(--c-outline-variant) / 0.78); }
     .it { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
     @media (max-width: 960px) { .sb-hide-md { display: none; } }
     @media (max-width: 768px) { :host { display: none; } }`,
  ],
})
export class StatusBarComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);

  run() {
    return this.shell.media()?.running ?? null;
  }
  pct(p?: number): number {
    const v = p ?? 0;
    return Math.round(v <= 1 ? v * 100 : v);
  }
  encoder(): string {
    const e = this.shell.media()?.encoder;
    return e ? ENCODER_SHORT[e] ?? e : 'chưa dò';
  }
  gb(): number {
    return Math.round(this.api.systemStats().memoryTotalMb / 1024);
  }
}
