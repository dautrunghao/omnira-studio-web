import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { fmtRelative } from '../shared/util';
import { NotificationItem, ShellStore } from './shell.store';

@Component({
  selector: 'omni-notification-bell',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <button type="button" class="o-icon-btn" [class.active]="open()" title="Thông báo"
      [attr.aria-label]="unread() ? 'Thông báo – ' + unread() + ' chưa đọc' : 'Thông báo'" [attr.aria-expanded]="open()" (click)="toggle()">
      <o-icon name="bell" [size]="16" />
      @if (unread() > 0) { <span class="bell-count">{{ unread() > 9 ? '9+' : unread() }}</span> }
    </button>
    @if (open()) {
      <div class="o-pop" role="dialog" aria-label="Thông báo" style="right: 0; top: 38px; width: 380px; max-height: 70vh; display: flex; flex-direction: column; padding: 0">
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid rgb(var(--c-overlay) / 0.06)">
          <span class="font-semibold">Thông báo</span>
          <span class="text-label-sm o-muted">Từ Omnira Cloud</span>
        </div>
        <div class="o-scroll" style="flex: 1">
          @for (n of shell.notifications().items; track n.id) {
            <div class="noti" [class.unread]="n.unread">
              <div class="flex items-start gap-2">
                <o-icon [name]="n.level === 'warn' || n.level === 'warning' ? 'alert' : 'info'" [size]="15" [class.o-warning]="n.level === 'warn' || n.level === 'warning'" [class.o-secondary]="n.level !== 'warn' && n.level !== 'warning'" />
                <div class="min-w-0 flex-1">
                  <div class="text-label-md font-semibold">{{ n.title }}</div>
                  @if (n.body || n.message) { <p class="text-body-sm o-muted" style="white-space: pre-line">{{ n.body || n.message }}</p> }
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-label-sm o-faint">{{ rel(n.createdAt) }}</span>
                    @if (n.url) { <a class="text-label-sm o-primary" [href]="n.url" target="_blank" rel="noopener">Xem chi tiết</a> }
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="o-empty"><o-icon name="checkcheck" [size]="20" />Không có thông báo mới</div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `.bell-count { position: absolute; right: -2px; top: -2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: rgb(var(--c-error)); color: rgb(var(--c-on-error)); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
     .noti { padding: 10px 16px; border-bottom: 1px solid rgb(var(--c-overlay) / 0.04); }
     .noti.unread { background: rgb(var(--c-primary) / 0.05); }`,
  ],
})
export class NotificationBellComponent {
  readonly shell = inject(ShellStore);
  private readonly api = inject(OmniApiService);
  private readonly el = inject(ElementRef);
  readonly open = signal(false);
  readonly unread = () => this.shell.notifications().unread;
  readonly rel = fmtRelative;

  constructor() {
    let first = true;
    const poll = async () => {
      const fresh: NotificationItem[] = await this.shell.loadNotifications();
      if (!first && fresh[0]) this.api.toast('Thông báo mới', fresh[0].title, 'info');
      first = false;
    };
    void poll();
    const t = setInterval(poll, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  async toggle() {
    const next = !this.open();
    this.open.set(next);
    if (!next) return;
    await this.shell.loadNotifications();
    if (this.shell.notifications().unread) {
      this.shell.notifications.update((n) => ({ ...n, unread: 0 }));
      void this.api.invokeRaw('cloud.notificationsSeen');
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(e.target)) this.open.set(false);
  }
  @HostListener('document:keydown.escape')
  onEsc() {
    this.open.set(false);
  }
}
