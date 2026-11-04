import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';

const ICON: Record<string, string> = { info: 'info', success: 'checkcheck', warn: 'alert', error: 'alert' };

@Component({
  selector: 'omni-toaster',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toaster" role="status" aria-live="polite">
      @for (t of api.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.tone">
          <o-icon [name]="icon(t.tone)" [size]="16" class="ti" />
          <div class="min-w-0 flex-1">
            <div class="text-label-md font-semibold">{{ t.title }}</div>
            @if (t.message) { <div class="text-body-sm o-muted" style="word-break: break-word">{{ t.message }}</div> }
          </div>
          <button class="o-icon-btn" style="width: 24px; height: 24px" aria-label="Đóng" (click)="api.dismissToast(t.id)"><o-icon name="x" [size]="13" /></button>
        </div>
      }
    </div>
  `,
  styles: [
    `.toaster { position: fixed; right: 16px; bottom: calc(var(--statusbar-h) + 12px); z-index: 100; display: flex; flex-direction: column; gap: 8px; width: min(380px, calc(100vw - 32px)); pointer-events: none; }
     .toast { pointer-events: auto; display: flex; align-items: flex-start; gap: 10px; padding: 10px 10px 10px 12px; border-radius: 12px; background: rgb(var(--c-surface-container-highest)); border: 1px solid rgb(var(--c-overlay) / 0.08); box-shadow: 0 12px 32px rgb(0 0 0 / 0.35); animation: o-in .18s ease-out; }
     .toast .ti { margin-top: 1px; }
     .toast.info .ti { color: rgb(var(--c-secondary)); }
     .toast.success .ti { color: rgb(var(--c-tertiary)); }
     .toast.warn .ti { color: rgb(var(--c-warning)); }
     .toast.error { border-color: rgb(var(--c-danger) / 0.35); }
     .toast.error .ti { color: rgb(var(--c-error)); }`,
  ],
})
export class ToasterComponent {
  readonly api = inject(OmniApiService);
  icon(t: string) {
    return ICON[t] ?? 'info';
  }
}
