import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { OmniApiService, ThemeMode } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';

export const THEMES: { value: ThemeMode; label: string; icon: string; hint: string }[] = [
  { value: 'dark', label: 'Chế độ Tối (Dark)', icon: 'moon', hint: 'Obsidian Slate – dịu mắt, chuyên sâu' },
  { value: 'light', label: 'Chế độ Sáng (Light)', icon: 'sun', hint: 'Crisp Daylight – sáng rõ, tương phản cao' },
  { value: 'system', label: 'Theo hệ thống', icon: 'monitor', hint: 'Tự động đổi Sáng / Tối theo máy' },
  { value: 'halloween', label: 'Halloween', icon: 'ghost', hint: 'Bí ngô cam, mạng nhện và ánh nến' },
];

@Component({
  selector: 'omni-theme-picker',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex items-center gap-1' },
  template: `
    <div class="theme-pill" role="group" aria-label="Chuyển nhanh chế độ Sáng / Tối">
      <button
        type="button"
        class="theme-pill-btn"
        [class.active]="api.theme() === 'light'"
        title="Bật chế độ Sáng (Light Mode)"
        (click)="pick('light')">
        <o-icon name="sun" [size]="14" />
        <span class="theme-pill-txt">Sáng</span>
      </button>
      <button
        type="button"
        class="theme-pill-btn"
        [class.active]="api.theme() === 'dark'"
        title="Bật chế độ Tối (Dark Mode)"
        (click)="pick('dark')">
        <o-icon name="moon" [size]="14" />
        <span class="theme-pill-txt">Tối</span>
      </button>
      <button
        type="button"
        class="theme-pill-more"
        [class.active]="open()"
        title="Tùy chọn giao diện nâng cao"
        aria-label="Mở menu giao diện"
        (click)="open.set(!open())">
        <o-icon name="chevrondown" [size]="13" />
      </button>
    </div>

    @if (open()) {
      <div class="o-pop" style="right: 0; top: 40px; width: 272px">
        <div class="px-2.5 py-1.5 text-label-sm font-semibold o-muted flex items-center justify-between">
          <span>Chế độ Giao diện</span>
          <span class="o-badge mono">{{ current().label.split(' ')[0] }}</span>
        </div>
        @for (t of themes; track t.value) {
          <button type="button" class="o-pop-item" [class.active]="api.theme() === t.value" (click)="pick(t.value)">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface">
              <o-icon [name]="t.icon" [size]="15" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block font-medium">{{ t.label }}</span>
              <span class="block text-label-sm o-muted truncate">{{ t.hint }}</span>
            </span>
            @if (api.theme() === t.value) { <o-icon name="check" [size]="15" class="o-primary" /> }
          </button>
        }
      </div>
    }
  `,
  styles: [
    `.theme-pill {
       display: inline-flex;
       align-items: center;
       gap: 2px;
       height: 32px;
       padding: 3px;
       border-radius: 10px;
       background: rgb(var(--c-surface-container));
       border: 1px solid rgb(var(--c-outline-variant) / 0.7);
     }
     .theme-pill-btn {
       display: inline-flex;
       align-items: center;
       gap: 5px;
       height: 24px;
       padding: 0 8px;
       border-radius: 7px;
       border: 0;
       background: transparent;
       color: rgb(var(--c-on-surface-variant));
       font-size: .72rem;
       font-weight: 500;
       cursor: pointer;
       transition: all .14s ease;
     }
     .theme-pill-btn:hover:not(.active) {
       color: rgb(var(--c-on-surface));
     }
     .theme-pill-btn.active {
       background: rgb(var(--c-primary-container));
       color: #ffffff;
       font-weight: 600;
       box-shadow: 0 1px 4px rgb(var(--c-primary-container) / 0.35);
     }
     .theme-pill-more {
       display: inline-flex;
       align-items: center;
       justify-content: center;
       width: 22px;
       height: 24px;
       border-radius: 6px;
       border: 0;
       background: transparent;
       color: rgb(var(--c-on-surface-variant));
       cursor: pointer;
     }
     .theme-pill-more:hover, .theme-pill-more.active {
       background: rgb(var(--c-overlay) / 0.08);
       color: rgb(var(--c-on-surface));
     }
     @media (max-width: 640px) {
       .theme-pill-txt { display: none; }
       .theme-pill-btn { padding: 0 6px; }
     }`,
  ],
})
export class ThemePickerComponent {
  readonly api = inject(OmniApiService);
  private readonly el = inject(ElementRef);
  readonly open = signal(false);
  readonly themes = THEMES;

  current() {
    return THEMES.find((t) => t.value === this.api.theme()) ?? THEMES[0];
  }

  pick(t: ThemeMode) {
    this.api.applyTheme(t);
    this.open.set(false);
  }

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(e.target)) this.open.set(false);
  }
}
