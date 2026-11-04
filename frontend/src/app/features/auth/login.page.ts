import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OmniApiService } from '../../core/omni-api.service';
import { AuthUser, ShellStore } from '../../layout/shell.store';
import { IconComponent } from '../../shared/icon.component';
import { errOf } from '../../shared/util';

type Step = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

@Component({
  selector: 'omni-login-page',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <div class="glow"></div>
      <div class="box o-card">
        <div class="flex items-center gap-2 mb-1">
          <o-icon name="globe" [size]="22" class="o-secondary" />
          <span class="text-headline-sm">Omnira Studio</span>
          <span class="o-badge mono primary">1.2.9</span>
          <span class="o-badge success">Firebase Auth</span>
        </div>
        <p class="text-body-sm o-muted mb-4">Nền tảng quản lý & tự động hóa đa kênh – Facebook, TikTok, Instagram, YouTube</p>

        @switch (step()) {
          @case ('login') {
            <h1 class="text-headline-md mb-3">Đăng nhập</h1>
            <form class="flex flex-col gap-3" (ngSubmit)="login()">
              <label class="o-field"><span class="o-label">Email</span><input class="o-input" type="email" name="email" [(ngModel)]="f.email" autocomplete="email" required /></label>
              <label class="o-field"><span class="o-label">Mật khẩu</span>
                <div class="relative"><input class="o-input" [type]="showPw() ? 'text' : 'password'" name="password" [(ngModel)]="f.password" autocomplete="current-password" required style="padding-right: 40px" />
                  <button type="button" class="o-icon-btn" style="position: absolute; right: 2px; top: 2px" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"><o-icon name="eye" [size]="15" /></button></div>
              </label>
              <div class="flex items-center justify-between">
                <label class="o-check"><input type="checkbox" name="remember" [(ngModel)]="f.remember" /> Ghi nhớ đăng nhập</label>
                <button type="button" class="link" (click)="go('forgot')">Quên mật khẩu?</button>
              </div>
              <button class="o-btn o-btn-primary o-btn-lg" type="submit" [disabled]="busy()">@if (busy()) { <o-icon name="loader" [size]="15" class="o-spin" /> } Đăng nhập</button>
              <button type="button" class="o-btn o-btn-ghost o-btn-sm" (click)="fillSuperAdmin()">
                <o-icon name="shield" [size]="14" /> Điền nhanh Super Admin (super_admin&#64;gmail.com / 111111)
              </button>
            </form>
            <p class="text-body-sm o-muted mt-4 text-center">Chưa có tài khoản? <button class="link" (click)="go('register')">Đăng ký miễn phí</button></p>
          }
          @case ('register') {
            <h1 class="text-headline-md mb-3">Tạo tài khoản</h1>
            <form class="flex flex-col gap-3" (ngSubmit)="register()">
              <label class="o-field"><span class="o-label">Tên hiển thị</span><input class="o-input" name="displayName" [(ngModel)]="f.displayName" maxlength="80" required /></label>
              <label class="o-field"><span class="o-label">Email</span><input class="o-input" type="email" name="email" [(ngModel)]="f.email" required /></label>
              <label class="o-field"><span class="o-label">Số điện thoại (tùy chọn)</span><input class="o-input" name="phone" [(ngModel)]="f.phone" maxlength="30" /></label>
              <label class="o-field"><span class="o-label">Mật khẩu (tối thiểu 6 ký tự)</span><input class="o-input" type="password" name="password" [(ngModel)]="f.password" autocomplete="new-password" required /></label>
              <label class="o-field"><span class="o-label">Mã giới thiệu (tùy chọn)</span>
                <input class="o-input" name="referralCode" [(ngModel)]="f.referralCode" maxlength="20" (blur)="checkReferral()" />
                @if (referral(); as r) {
                  <span class="o-hint" [class.o-tertiary]="r.valid" [class.o-error]="!r.valid">{{ r.valid ? 'Mã hợp lệ – ' + (r.type === 'AM' ? 'AM / Sale: ' : 'người giới thiệu: ') + (r.name || '') + (r.discountPercent ? ' · giảm ' + r.discountPercent + '% đơn đầu' : '') : 'Mã giới thiệu không tồn tại' }}</span>
                }
              </label>
              <button class="o-btn o-btn-primary o-btn-lg" type="submit" [disabled]="busy()">@if (busy()) { <o-icon name="loader" [size]="15" class="o-spin" /> } Đăng ký</button>
            </form>
            <p class="text-body-sm o-muted mt-4 text-center">Đã có tài khoản? <button class="link" (click)="go('login')">Đăng nhập</button></p>
          }
          @case ('verify') {
            <h1 class="text-headline-md mb-1">Xác thực email</h1>
            <p class="text-body-sm o-muted mb-3">Nhập mã 6 số đã gửi tới <b>{{ f.email }}</b></p>
            <form class="flex flex-col gap-3" (ngSubmit)="verify()">
              <input class="o-input otp" name="code" [(ngModel)]="f.code" inputmode="numeric" maxlength="6" placeholder="••••••" required />
              <button class="o-btn o-btn-primary o-btn-lg" type="submit" [disabled]="busy() || f.code.length !== 6">Xác thực & đăng nhập</button>
            </form>
            <div class="flex justify-between mt-4 text-body-sm">
              <button class="link" (click)="go('register')">← Sửa thông tin</button>
              <button class="link" [disabled]="busy()" (click)="resend()">Gửi lại mã</button>
            </div>
          }
          @case ('forgot') {
            <h1 class="text-headline-md mb-1">Quên mật khẩu</h1>
            <p class="text-body-sm o-muted mb-3">Nhập email – chúng tôi sẽ gửi mã 6 số để đặt mật khẩu mới.</p>
            <form class="flex flex-col gap-3" (ngSubmit)="forgot()">
              <label class="o-field"><span class="o-label">Email</span><input class="o-input" type="email" name="email" [(ngModel)]="f.email" required /></label>
              <button class="o-btn o-btn-primary o-btn-lg" type="submit" [disabled]="busy()">Gửi mã</button>
            </form>
            <p class="text-body-sm mt-4 text-center"><button class="link" (click)="go('login')">← Quay lại đăng nhập</button></p>
          }
          @case ('reset') {
            <h1 class="text-headline-md mb-1">Đặt mật khẩu mới</h1>
            <p class="text-body-sm o-muted mb-3">Mã đã gửi tới <b>{{ f.email }}</b></p>
            <form class="flex flex-col gap-3" (ngSubmit)="reset()">
              <label class="o-field"><span class="o-label">Mã xác thực (6 số)</span><input class="o-input otp" name="code" [(ngModel)]="f.code" inputmode="numeric" maxlength="6" required /></label>
              <label class="o-field"><span class="o-label">Mật khẩu mới</span><input class="o-input" type="password" name="newPassword" [(ngModel)]="f.password" autocomplete="new-password" required /></label>
              <button class="o-btn o-btn-primary o-btn-lg" type="submit" [disabled]="busy()">Đặt mật khẩu & đăng nhập</button>
            </form>
            <p class="text-body-sm mt-4 text-center"><button class="link" (click)="go('forgot')">← Gửi lại mã</button></p>
          }
        }
        @if (error()) { <div class="o-banner danger mt-3"><o-icon name="alert" [size]="15" class="o-error" />{{ error() }}</div> }
      </div>
      <p class="text-label-sm o-faint mt-4">© Omnira · Phiên bản Web (Angular + NestJS + Firebase)</p>
    </div>
  `,
  styles: [
    `.auth { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; overflow: auto; }
     .glow { position: fixed; inset: 0; background: radial-gradient(600px 400px at 20% 10%, rgb(var(--c-primary) / 0.14), transparent 60%), radial-gradient(500px 360px at 85% 90%, rgb(var(--c-secondary) / 0.1), transparent 60%); pointer-events: none; }
     .box { position: relative; width: min(420px, 100%); padding: 26px; }
     .link { background: none; border: 0; padding: 0; color: rgb(var(--c-primary)); cursor: pointer; font-size: inherit; }
     .link:hover { text-decoration: underline; }
     .otp { height: 48px; text-align: center; font-size: 1.5rem; letter-spacing: .5em; font-family: 'JetBrains Mono Variable', monospace; }`,
  ],
})
export class LoginPageComponent {
  private readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  readonly authed = output<AuthUser>();
  readonly step = signal<Step>('login');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPw = signal(false);
  readonly referral = signal<{ valid: boolean; name?: string; type?: string; discountPercent?: number } | null>(null);
  f = { email: this.shell.auth()?.lastEmail || 'super_admin@gmail.com', password: '111111', displayName: '', phone: '', referralCode: '', code: '', remember: true };

  fillSuperAdmin() {
    this.f.email = 'super_admin@gmail.com';
    this.f.password = '111111';
    this.error.set(null);
  }

  go(s: Step) {
    this.error.set(null);
    this.f.code = '';
    this.step.set(s);
  }

  private async run<T>(endpoint: string, input: any): Promise<T | null> {
    this.busy.set(true);
    this.error.set(null);
    const r = await this.api.invokeRaw<T>(endpoint, input);
    this.busy.set(false);
    if (!r.ok) {
      this.error.set(errOf(r));
      return null;
    }
    return r.data;
  }

  private done(res: any) {
    const user: AuthUser = res?.user ?? res;
    if (!user?.email) {
      void this.shell.loadAuth();
      return;
    }
    if (this.shell.auth()?.lastEmail !== user.email) this.api.setWorkspaceId(null);
    this.shell.setUser(user);
    this.authed.emit(user);
    void this.shell.loadAuth();
  }

  async login() {
    if (!this.f.email || !this.f.password) return this.error.set('Nhập email và mật khẩu');
    const res = await this.run('auth.login', { email: this.f.email.trim(), password: this.f.password, remember: this.f.remember });
    if (res) this.done(res);
  }

  async register() {
    if (this.f.password.length < 6) return this.error.set('Mật khẩu tối thiểu 6 ký tự');
    const res = await this.run<any>('auth.register', {
      email: this.f.email.trim(),
      displayName: this.f.displayName.trim(),
      password: this.f.password,
      phone: this.f.phone.trim() || undefined,
      referralCode: this.f.referralCode.trim() || undefined,
      remember: this.f.remember,
    });
    if (!res) return;
    if (res.user) this.done(res);
    else this.go('verify');
  }

  async verify() {
    const res = await this.run('auth.registerVerify', { email: this.f.email.trim(), code: this.f.code.trim() });
    if (res) this.done(res);
  }

  async resend() {
    const res = await this.run('auth.registerResend', { email: this.f.email.trim() });
    if (res !== null) this.api.toast('Đã gửi lại mã xác thực', this.f.email, 'success');
  }

  async forgot() {
    const res = await this.run('auth.forgotPassword', { email: this.f.email.trim() });
    if (res !== null) this.go('reset');
  }

  async reset() {
    if (this.f.password.length < 6) return this.error.set('Mật khẩu tối thiểu 6 ký tự');
    const res = await this.run('auth.resetPassword', { email: this.f.email.trim(), code: this.f.code.trim(), newPassword: this.f.password, remember: true });
    if (res) this.done(res);
  }

  async checkReferral() {
    const code = this.f.referralCode.trim();
    if (!code) return this.referral.set(null);
    const r = await this.api.invokeRaw<any>('auth.checkReferral', { code });
    this.referral.set(r.ok ? r.data : { valid: false });
  }
}
