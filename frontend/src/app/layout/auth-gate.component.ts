import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { OmniApiService } from '../core/omni-api.service';
import { LoginPageComponent } from '../features/auth/login.page';
import { IconComponent } from '../shared/icon.component';
import { errOf } from '../shared/util';
import { BuyPlanDialogComponent } from './buy-plan-dialog.component';
import { ShellComponent } from './shell.component';
import { LicenseView, ShellStore } from './shell.store';
import { ToasterComponent } from './toaster.component';

const LIC_TITLE: Record<string, string> = {
  expired: 'Gói đã hết hạn',
  no_subscription: 'Chưa có gói đang hoạt động',
  device_limit: 'Đã đủ số máy kích hoạt',
  locked: 'Tài khoản đã bị khóa',
  revoked: 'License đã bị thu hồi',
  relogin: 'Phiên đăng nhập hết hạn – vui lòng đăng nhập lại',
  offline: 'Không kết nối được Omnira Cloud',
};

/** AuthGate: auth.state → (LoginPage | LicenseGate | AppShell). */
@Component({
  selector: 'omni-auth-gate',
  standalone: true,
  imports: [LoginPageComponent, ShellComponent, IconComponent, BuyPlanDialogComponent, ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shell.authLoading() && !shell.auth()) {
      <div class="center o-muted"><o-icon name="loader" [size]="20" class="o-spin" /></div>
    } @else if (!shell.auth() && shell.authError()) {
      <div class="center flex-col gap-3 text-center p-6">
        <o-icon name="alert" [size]="28" class="o-error" />
        <div class="text-headline-sm">Không tải được trạng thái đăng nhập</div>
        <p class="text-body-sm o-muted" style="max-width: 440px; word-break: break-word">{{ shell.authError() }}</p>
        <button class="o-btn o-btn-primary" (click)="shell.loadAuth()">Thử lại</button>
      </div>
    } @else if (!shell.user()) {
      <omni-login-page (authed)="onAuthed()" />
    } @else if (!shell.licenseUsable(shell.license())) {
      <div class="center p-6">
        <div class="o-card" style="width: min(640px, 100%); padding: 24px">
          @let lic = shell.license()!;
          @if (lic.status === 'checking') {
            <div class="flex items-center justify-center gap-2 o-muted"><o-icon name="loader" [size]="18" class="o-spin" /> Đang kiểm tra license với Omnira Cloud…</div>
          } @else {
            <div class="o-banner warning" style="align-items: flex-start; padding: 16px">
              <o-icon [name]="lic.status === 'locked' || lic.status === 'revoked' ? 'shield' : 'alert'" [size]="26" [class.o-error]="lic.status === 'locked' || lic.status === 'revoked'" [class.o-warning]="lic.status !== 'locked' && lic.status !== 'revoked'" />
              <div>
                <h1 class="text-headline-sm">{{ title(lic.status) }}</h1>
                <p class="text-body-sm o-muted mt-1">{{ lic.message ?? 'Mua hoặc gia hạn gói để tiếp tục dùng Omnira Studio. Dữ liệu của bạn vẫn được giữ nguyên.' }}</p>
                <p class="text-label-sm o-faint mt-1">{{ shell.user()?.email }} @if (lic.deviceId) { · máy <span class="o-code">{{ lic.deviceId.slice(0, 16) }}…</span> }</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-4">
              @if (lic.status !== 'relogin' && lic.status !== 'locked') { <button class="o-btn o-btn-primary" (click)="api.buyPlanOpen.set(true)"><o-icon name="card" [size]="15" /> Mua / gia hạn gói</button> }
              @if (lic.status === 'device_limit') { <button class="o-btn" [disabled]="busy()" (click)="activate()"><o-icon name="laptop" [size]="15" /> Kích hoạt lại máy này</button> }
              <button class="o-btn" [disabled]="busy()" (click)="recheck()"><o-icon name="refresh" [size]="15" [class.o-spin]="busy()" /> Kiểm tra lại</button>
              <button class="o-btn o-btn-subtle" (click)="shell.logout()"><o-icon name="logout" [size]="15" /> Đăng xuất</button>
            </div>
          }
        </div>
      </div>
      <omni-buy-plan-dialog />
      <omni-toaster />
    } @else {
      <omni-shell />
    }
    @if (!shell.user()) { <omni-toaster /> }
  `,
  styles: [`.center { display: flex; min-height: 100vh; min-height: 100dvh; align-items: center; justify-content: center; }`],
})
export class AuthGateComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  readonly busy = signal(false);

  constructor() {
    void this.shell.loadAuth();
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const st = this.shell.license()?.status;
      if (st === 'checking') void this.shell.loadAuth();
      else if (this.shell.user()) void this.shell.loadLicense();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
    window.omni?.app?.onLicenseChanged?.(() => void this.shell.loadAuth());
  }

  title(s: string): string {
    return LIC_TITLE[s] ?? 'Chưa có license dùng được';
  }

  onAuthed(): void {
    void this.shell.loadLicense();
  }

  async recheck(): Promise<void> {
    this.busy.set(true);
    const r = await this.api.invokeRaw<LicenseView>('license.refresh');
    this.busy.set(false);
    if (r.ok) {
      this.shell.license.set(r.data);
      this.api.toast(this.shell.licenseUsable(r.data) ? 'License đã hoạt động' : r.data?.message ?? 'Chưa có license dùng được', undefined, this.shell.licenseUsable(r.data) ? 'success' : 'info');
    } else this.api.toast('Không kiểm tra được', errOf(r), 'error');
  }

  async activate(): Promise<void> {
    this.busy.set(true);
    const r = await this.api.invokeRaw<LicenseView>('license.activate');
    this.busy.set(false);
    if (r.ok) this.shell.license.set(r.data);
    else this.api.toast('Không kích hoạt được', errOf(r), 'error');
  }
}
