import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { BuyPlanDialogComponent } from './buy-plan-dialog.component';
import { CommandPaletteComponent } from './command-palette.component';
import { FEATURE_LABEL, NAV_ITEMS } from './nav-items';
import { NavRailComponent } from './nav-rail.component';
import { ShellStore } from './shell.store';
import { StatusBarComponent } from './status-bar.component';
import { TitleBarComponent } from './title-bar.component';
import { ToasterComponent } from './toaster.component';

/** AppShell: TitleBar + NavRail + nội dung trang (có FeatureGate) + MobileBottomNav + StatusBar + lớp phủ toàn cục. */
@Component({
  selector: 'omni-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TitleBarComponent,
    NavRailComponent,
    StatusBarComponent,
    CommandPaletteComponent,
    BuyPlanDialogComponent,
    ToasterComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      @if (api.theme() === 'halloween') { <div class="hw-ambience" aria-hidden="true"></div> }
      <omni-title-bar />
      <div class="body">
        <omni-nav-rail />
        <main class="main o-scroll" id="main">
          @if (gate(); as g) {
            <div class="o-page">
              <div class="o-card gate">
                <div class="o-page-ico"><o-icon name="lock" [size]="22" /></div>
                <h1 class="text-headline-md">{{ g.label }} cần gói có tính năng “{{ g.feature }}”</h1>
                <p class="text-body-md o-muted">Gói hiện tại của bạn chưa bao gồm tính năng này. Nâng cấp gói để mở khóa ngay – dữ liệu không bị ảnh hưởng.</p>
                <div class="flex flex-wrap gap-2 justify-center">
                  <button class="o-btn o-btn-primary" (click)="api.buyPlanOpen.set(true)"><o-icon name="card" [size]="15" /> Xem gói nâng cấp</button>
                  <button class="o-btn" (click)="router.navigateByUrl('/')">Về Tổng quan</button>
                </div>
              </div>
            </div>
          } @else {
            <router-outlet />
          }
        </main>
      </div>
      <nav class="mobile-bottom-nav" aria-label="Điều hướng nhanh trên di động">
        <a class="m-tab" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="shell.closeMobileNav()">
          <o-icon name="grid" [size]="18" />
          <span>Tổng quan</span>
        </a>
        <a class="m-tab" routerLink="/accounts" routerLinkActive="active" (click)="shell.closeMobileNav()">
          <o-icon name="users" [size]="18" />
          <span>Tài khoản</span>
        </a>
        <a class="m-tab m-tab-cta" routerLink="/studio" routerLinkActive="active" (click)="shell.closeMobileNav()">
          <div class="m-cta-pill"><o-icon name="clapper" [size]="18" /></div>
          <span>AI Video</span>
        </a>
        <a class="m-tab" routerLink="/inbox" routerLinkActive="active" (click)="shell.closeMobileNav()">
          <div class="relative">
            <o-icon name="inbox" [size]="18" />
            @if (shell.badges()['inbox']; as cnt) {
              <span class="m-pip">{{ cnt > 9 ? '9+' : cnt }}</span>
            }
          </div>
          <span>Hộp thư</span>
        </a>
        <button type="button" class="m-tab" [class.active]="shell.mobileNavOpen()" (click)="shell.toggleMobileNav()">
          <o-icon name="panel" [size]="18" />
          <span>Menu</span>
        </button>
      </nav>
      <omni-status-bar />
    </div>
    <omni-command-palette />
    <omni-buy-plan-dialog />
    <omni-toaster />
  `,
  styles: [
    `.shell { position: relative; display: flex; flex-direction: column; height: 100vh; height: 100dvh; width: 100%; max-width: 100vw; overflow: hidden; background: rgb(var(--c-surface)); }
     .body { display: flex; flex: 1; min-height: 0; min-width: 0; position: relative; overflow: hidden; }
     .main { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; position: relative; -webkit-overflow-scrolling: touch; }
     .gate { margin: 8vh auto 0; max-width: 560px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
     .mobile-bottom-nav { display: none; }
     @media (max-width: 768px) {
       .mobile-bottom-nav {
         display: grid;
         grid-template-columns: repeat(5, minmax(0, 1fr));
         align-items: center;
         height: calc(58px + env(safe-area-inset-bottom, 0px));
         padding-bottom: env(safe-area-inset-bottom, 0px);
         background: rgb(var(--c-surface-container-lowest) / 0.96);
         border-top: 1px solid rgb(var(--c-overlay) / 0.08);
         backdrop-filter: blur(14px);
         flex-shrink: 0;
         z-index: 45;
       }
       .m-tab {
         display: flex;
         flex-direction: column;
         align-items: center;
         justify-content: center;
         gap: 3px;
         height: 100%;
         border: 0;
         background: transparent;
         color: rgb(var(--c-on-surface-variant));
         text-decoration: none;
         font-size: 10px;
         font-weight: 500;
         cursor: pointer;
         padding: 4px 2px;
       }
       .m-tab.active {
         color: rgb(var(--c-primary));
         font-weight: 600;
       }
       .m-cta-pill {
         width: 34px;
         height: 26px;
         border-radius: 999px;
         background: linear-gradient(135deg, rgb(var(--c-primary)), rgb(var(--c-primary-container)));
         color: rgb(var(--c-on-primary));
         display: flex;
         align-items: center;
         justify-content: center;
         box-shadow: 0 4px 12px rgb(var(--c-primary) / 0.35);
       }
       .m-pip {
         position: absolute;
         top: -4px;
         right: -8px;
         min-width: 14px;
         height: 14px;
         padding: 0 3px;
         border-radius: 999px;
         background: rgb(var(--c-error));
         color: rgb(var(--c-on-error));
         font-size: 9px;
         font-weight: 700;
         display: flex;
         align-items: center;
         justify-content: center;
       }
     }`,
  ],
})
export class ShellComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  readonly router = inject(Router);
  private readonly url = signal(this.router.url);

  readonly gate = computed(() => {
    const path = '/' + (this.url().split('?')[0].replace(/^\/+/, '').split('/')[0] ?? '');
    const item = NAV_ITEMS.find((n) => n.path === path);
    if (!item?.feature || this.shell.hasFeature(item.feature)) return null;
    return { label: item.label, feature: FEATURE_LABEL[item.feature] };
  });

  constructor() {
    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set((e as NavigationEnd).urlAfterRedirects);
      this.shell.closeMobileNav();
      document.getElementById('main')?.scrollTo({ top: 0 });
    });
    void this.shell.loadWorkspaces();
    void this.shell.loadLicense();
    void this.shell.loadBadges();
    void this.shell.loadQuota();
    let tick = 0;
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      tick++;
      void this.shell.loadBadges();
      if (tick % 6 === 0) void this.shell.loadWorkspaces();
    }, this.shell.media()?.running ? 3000 : 12_000);
    const offInbox = window.omni?.inbox?.onChanged?.(() => {
      this.shell.bump('inbox', 'dashboard');
      void this.shell.loadBadges();
    });
    const offNav = window.omni?.app?.onNavigate?.((p: string) => {
      void this.router.navigateByUrl(p);
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      clearInterval(t);
      offInbox?.();
      offNav?.();
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.shell.mobileNavOpen()) {
      this.shell.closeMobileNav();
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k === 'k') {
      e.preventDefault();
      this.api.commandPaletteOpen.set(!this.api.commandPaletteOpen());
    } else if (k === 'b') {
      e.preventDefault();
      this.shell.toggleRail();
    } else if (/^[1-9]$/.test(k)) {
      const item = NAV_ITEMS.find((n) => n.shortcut === `Ctrl+${k}`);
      if (item) {
        e.preventDefault();
        void this.router.navigateByUrl(item.path);
      }
    }
  }
}
