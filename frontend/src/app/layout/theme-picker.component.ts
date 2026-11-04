import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';

type Theme = 'dark' | 'light' | 'halloween' | 'system';

export const THEMES: { value: Theme; label: string; icon: string; hint: string }[] = [
  { value: 'dark', label: 'Tối', icon: 'moon', hint: 'Fluent Command Suite – Dark (mặc định)' },
  { value: 'light', label: 'Sáng', icon: 'sun', hint: 'Fluent Command Suite – Light' },
  { value: 'halloween', label: 'Halloween', icon: 'ghost', hint: 'Bí ngô cam, mạng nhện và ánh nến' },
  { value: 'system', label: 'Theo hệ thống', icon: 'monitor', hint: 'Tự đổi theo cài đặt hệ điều hành' },
];

@Component({
  selector: 'omni-theme-picker',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <button type="button" class="o-icon-btn" [class.active]="open()" title="Giao diện" aria-label="Chọn giao diện" (click)="open.set(!open())">
      <o-icon [name]="current().icon" [size]="16" />
    </button>
    @if (open()) {
      <div class="o-pop" style="right: 0; top: 38px; width: 260px">
        <div class="px-2 py-1 text-label-sm o-muted">Giao diện</div>
        @for (t of themes; track t.value) {
          <button class="o-pop-item" [class.active]="api.theme() === t.value" (click)="pick(t.value)">
            <o-icon [name]="t.icon" [size]="16" />
            <span class="flex-1 min-w-0">
              <span class="block">{{ t.label }}</span>
              <span class="block text-label-sm o-muted truncate">{{ t.hint }}</span>
            </span>
            @if (api.theme() === t.value) { <o-icon name="check" [size]="14" class="o-primary" /> }
          </button>
        }
      </div>
    }
  `,
})
export class ThemePickerComponent {
  readonly api = inject(OmniApiService);
  private readonly el = inject(ElementRef);
  readonly open = signal(false);
  readonly themes = THEMES;

  current() {
    return THEMES.find((t) => t.value === this.api.theme()) ?? THEMES[0];
  }

  pick(t: Theme) {
    this.api.applyTheme(t);
    this.open.set(false);
  }

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(e.target)) this.open.set(false);
  }
}
