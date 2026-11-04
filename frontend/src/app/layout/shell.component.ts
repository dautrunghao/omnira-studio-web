import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
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

/** AppShell: TitleBar + NavRail + nội dung trang (có FeatureGate) + StatusBar + lớp phủ toàn cục. */
@Component({
  selector: 'omni-shell',
  standalone: true,
  imports: [RouterOutlet, TitleBarComponent, NavRailComponent, StatusBarComponent, CommandPaletteComponent, BuyPlanDialogComponent, ToasterComponent, IconComponent],
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
                <div class="flex gap-2 justify-center">
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
      <omni-status-bar />
    </div>
    <omni-command-palette />
    <omni-buy-plan-dialog />
    <omni-toaster />
  `,
  styles: [
    `.shell { position: relative; display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: rgb(var(--c-surface)); }
     .body { display: flex; flex: 1; min-height: 0; }
     .main { flex: 1; min-width: 0; overflow: auto; position: relative; }
     .gate { margin: 8vh auto 0; max-width: 560px; padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }`,
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
      document.getElementById('main')?.scrollTo({ top: 0 });
    });
    void this.shell.loadWorkspaces();
    void this.shell.loadLicense();
    void this.shell.loadBadges();
    void this.shell.loadQuota();
    let tick = 0;
    const t = setInterval(() => {
      tick++;
      void this.shell.loadBadges();
      if (tick % 6 === 0) void this.shell.loadWorkspaces();
    }, this.shell.media()?.running ? 2000 : 10_000);
    const w = window as any;
    const offInbox = w.omni?.inbox?.onChanged?.(() => {
      this.shell.bump('inbox', 'dashboard');
      void this.shell.loadBadges();
    });
    const offNav = w.omni?.app?.onNavigate?.((p: string) => this.router.navigateByUrl(p));
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      clearInterval(t);
      offInbox?.();
      offNav?.();
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
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
