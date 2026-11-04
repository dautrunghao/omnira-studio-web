import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { errOf, initials } from '../shared/util';
import { NotificationBellComponent } from './notification-bell.component';
import { ShellStore } from './shell.store';
import { ThemePickerComponent } from './theme-picker.component';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';

@Component({
  selector: 'omni-title-bar',
  standalone: true,
  imports: [IconComponent, WorkspaceSwitcherComponent, ThemePickerComponent, NotificationBellComponent, ModalComponent, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="titlebar">
      <div class="flex min-w-0 items-center gap-2 pl-3">
        <button class="o-icon-btn" title="Thu gọn thanh điều hướng (Ctrl+B)" aria-label="Thu gọn thanh điều hướng" (click)="shell.toggleRail()"><o-icon name="panel" [size]="16" /></button>
        <a routerLink="/" class="flex items-center gap-1.5" style="text-decoration: none; color: inherit">
          <o-icon name="globe" [size]="18" class="o-secondary" />
          <span class="text-label-md font-semibold" style="letter-spacing: -0.01em">Omnira Studio</span>
          <span class="o-badge mono primary">v1.2.9</span>
        </a>
        <div style="width: 1px; height: 16px; background: rgb(var(--c-outline-variant) / 0.4); margin: 0 4px"></div>
        <omni-workspace-switcher />
      </div>

      <button type="button" class="search" (click)="api.commandPaletteOpen.set(true)">
        <o-icon name="search" [size]="15" />
        <span class="flex-1 truncate text-left">Tìm kiếm kênh, bài viết, kịch bản...</span>
        <span class="o-kbd">Ctrl+K</span>
      </button>

      <div class="flex items-center gap-1 pr-3">
        @if (licenseHint(); as h) {
          <button class="o-badge pill" [class.warning]="h.tone === 'warning'" [class.success]="h.tone === 'success'" style="cursor: pointer; border: 0" (click)="api.buyPlanOpen.set(true)" [title]="h.title">{{ h.label }}</button>
        }
        <omni-notification-bell />
        <button class="o-icon-btn" title="Kiểm tra lại license" aria-label="Kiểm tra lại license" (click)="refreshLicense()" [disabled]="refreshing()">
          <o-icon name="refresh" [size]="15" [class.o-spin]="refreshing()" />
        </button>
        <omni-theme-picker />
        <div class="relative">
          <button class="acct" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Tài khoản">
            <span class="o-avatar" style="width: 26px; height: 26px; border-radius: 8px; font-size: 10px">{{ ini() }}</span>
          </button>
          @if (menu()) {
            <div class="o-pop" style="right: 0; top: 38px; width: 280px">
              <div class="px-3 py-2">
                <div class="font-semibold truncate">{{ shell.user()?.displayName || shell.user()?.name || 'Tài khoản' }}</div>
                <div class="text-label-sm o-muted truncate">{{ shell.user()?.email }}</div>
                @if (shell.license(); as l) {
                  <div class="mt-2 flex items-center gap-2"><span class="o-badge primary">{{ l.planName || l.planCode || l.status }}</span></div>
                }
              </div>
              <div class="o-divider" style="margin: 4px 0"></div>
              <button class="o-pop-item" (click)="openProfile()"><o-icon name="edit" [size]="15" /> Đổi tên hiển thị</button>
              <button class="o-pop-item" (click)="pwOpen.set(true); menu.set(false)"><o-icon name="key" [size]="15" /> Đổi mật khẩu</button>
              <a class="o-pop-item" routerLink="/billing" (click)="menu.set(false)"><o-icon name="card" [size]="15" /> Gói & thanh toán</a>
              <div class="o-divider" style="margin: 4px 0"></div>
              <button class="o-pop-item o-error" (click)="logout()"><o-icon name="logout" [size]="15" /> Đăng xuất</button>
            </div>
          }
        </div>
      </div>
    </header>

    <o-modal [open]="pwOpen()" title="Đổi mật khẩu" (closed)="pwOpen.set(false)">
      <label class="o-field"><span class="o-label">Mật khẩu hiện tại</span><input class="o-input" type="password" [(ngModel)]="pw.current" autocomplete="current-password" /></label>
      <label class="o-field"><span class="o-label">Mật khẩu mới (tối thiểu 8 ký tự)</span><input class="o-input" type="password" [(ngModel)]="pw.next" autocomplete="new-password" /></label>
      <label class="o-field"><span class="o-label">Nhập lại mật khẩu mới</span><input class="o-input" type="password" [(ngModel)]="pw.again" autocomplete="new-password" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="pwOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy()" (click)="changePassword()">Lưu mật khẩu</button>
      </div>
    </o-modal>

    <o-modal [open]="profileOpen()" title="Đổi tên hiển thị" (closed)="profileOpen.set(false)">
      <label class="o-field"><span class="o-label">Tên hiển thị</span><input class="o-input" [(ngModel)]="displayName" maxlength="80" /></label>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="profileOpen.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy() || !displayName.trim()" (click)="saveProfile()">Lưu</button>
      </div>
    </o-modal>
  `,
  styles: [
    `:host { display: block; flex-shrink: 0; }
     .titlebar { position: relative; z-index: 40; display: flex; height: var(--titlebar-h); flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; background: rgb(var(--c-surface-container-lowest) / 0.92); border-bottom: 1px solid rgb(var(--c-overlay) / 0.05); backdrop-filter: blur(12px); }
     .search { display: flex; align-items: center; gap: 8px; height: 30px; width: 100%; max-width: 440px; padding: 0 12px; border-radius: 8px; border: 0; background: rgb(var(--c-surface-container-low)); color: rgb(var(--c-on-surface-variant) / 0.8); font-size: .8125rem; cursor: pointer; }
     .search:hover { background: rgb(var(--c-surface-container)); }
     .acct { border: 0; background: transparent; padding: 3px; border-radius: 9px; cursor: pointer; }
     .acct:hover { background: rgb(var(--c-overlay) / 0.07); }
     @media (max-width: 760px) { .search { display: none; } }
     @media (max-width: 520px) { .titlebar .o-badge, .titlebar a span.text-label-md { display: none; } }`,
  ],
})
export class TitleBarComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly el = inject(ElementRef);
  readonly menu = signal(false);
  readonly pwOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly busy = signal(false);
  readonly refreshing = signal(false);
  pw = { current: '', next: '', again: '' };
  displayName = '';

  ini() {
    const u = this.shell.user();
    return initials(u?.displayName || u?.name || u?.email || '?');
  }

  licenseHint() {
    const l = this.shell.license();
    if (!l) return null;
    if (l.trial || l.status === 'trial') return { label: 'Dùng thử · Mua gói', tone: 'warning', title: 'Đang dùng thử – mua gói để dùng lâu dài' };
    const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : null;
    if (exp && exp - Date.now() < 7 * 86400000) {
      const days = Math.max(0, Math.ceil((exp - Date.now()) / 86400000));
      return { label: `Còn ${days} ngày · Gia hạn`, tone: 'warning', title: 'Gói sắp hết hạn' };
    }
    return null;
  }

  async refreshLicense() {
    this.refreshing.set(true);
    const r = await this.api.invokeRaw('license.refresh');
    this.refreshing.set(false);
    if (r.ok) {
      if (r.data) this.shell.license.set(r.data);
      this.api.toast('Đã kiểm tra license', (r.data as any)?.message ?? 'License đang hoạt động', 'success');
    } else this.api.toast('Không kiểm tra được license', errOf(r), 'error');
  }

  openProfile() {
    this.displayName = this.shell.user()?.displayName || this.shell.user()?.name || '';
    this.profileOpen.set(true);
    this.menu.set(false);
  }

  async saveProfile() {
    this.busy.set(true);
    try {
      const u = await this.api.invoke('auth.updateProfile', { displayName: this.displayName.trim(), name: this.displayName.trim() });
      this.shell.setUser({ ...(this.shell.user() as any), ...(u ?? {}), displayName: this.displayName.trim() });
      this.api.toast('Đã cập nhật tên hiển thị', undefined, 'success');
      this.profileOpen.set(false);
    } catch {
      /* toast đã hiện */
    } finally {
      this.busy.set(false);
    }
  }

  async changePassword() {
    if (this.pw.next.length < 8) return this.api.toast('Mật khẩu tối thiểu 8 ký tự', undefined, 'warn');
    if (this.pw.next !== this.pw.again) return this.api.toast('Mật khẩu nhập lại không khớp', undefined, 'warn');
    this.busy.set(true);
    try {
      await this.api.invoke('auth.changePassword', { currentPassword: this.pw.current, newPassword: this.pw.next });
      this.api.toast('Đã đổi mật khẩu', undefined, 'success');
      this.pw = { current: '', next: '', again: '' };
      this.pwOpen.set(false);
    } catch {
      /* toast đã hiện */
    } finally {
      this.busy.set(false);
    }
  }

  async logout() {
    this.menu.set(false);
    await this.shell.logout();
  }

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.menu() && !(e.target as HTMLElement).closest?.('.acct, .o-pop')) this.menu.set(false);
  }
}
