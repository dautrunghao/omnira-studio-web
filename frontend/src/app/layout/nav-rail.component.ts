import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { NAV_ITEMS, NavItem } from './nav-items';
import { ShellStore } from './shell.store';

const GROUP_LABEL: Record<NavItem['group'], string> = {
  main: 'Điều hành',
  create: 'Sáng tạo nội dung',
  grow: 'Phân phối & Tăng trưởng',
  system: 'Hệ thống',
};

@Component({
  selector: 'omni-nav-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shell.mobileNavOpen()) {
      <div class="rail-backdrop" (click)="shell.closeMobileNav()" aria-hidden="true"></div>
    }
    <nav class="rail o-scroll" [class.collapsed]="shell.railCollapsed()" [class.mobile-open]="shell.mobileNavOpen()" aria-label="Điều hướng chính">
      <div class="mobile-drawer-head">
        <div class="flex items-center gap-2">
          <o-icon name="globe" [size]="18" class="o-secondary" />
          <span class="font-semibold text-label-lg">Omnira Studio</span>
          <span class="o-badge mono primary">v1.2.9</span>
        </div>
        <button type="button" class="o-icon-btn" aria-label="Đóng menu" (click)="shell.closeMobileNav()">
          <o-icon name="x" [size]="16" />
        </button>
      </div>

      <button type="button" class="mobile-search" (click)="openSearch()">
        <o-icon name="search" [size]="15" />
        <span class="flex-1 text-left truncate">Tìm nhanh trang, kênh, lệnh...</span>
        <span class="o-kbd">Ctrl+K</span>
      </button>

      @for (g of groups(); track g.key) {
        <div class="grp">{{ g.label }}</div>
        <div class="o-divider grp-div" style="margin: 8px 10px"></div>
        @for (item of g.items; track item.path) {
          <a class="item" [routerLink]="item.path" routerLinkActive="nav-active active" [routerLinkActiveOptions]="{ exact: item.path === '/' }"
             (click)="shell.closeMobileNav()"
             [title]="item.label + (item.shortcut ? ' (' + item.shortcut + ')' : '') + (locked(item) ? ' – cần nâng cấp gói' : '')">
            <o-icon [name]="item.icon" [size]="18" [stroke]="1.75" />
            <span class="lbl">{{ item.label }}</span>
            @if (locked(item)) { <o-icon name="lock" [size]="12" class="o-faint lbl-extra" /> }
            @else if (badge(item); as n) { <span class="cnt lbl-extra">{{ n > 99 ? '99+' : n }}</span> }
            @else if (item.shortcut) { <span class="kbd lbl-extra">{{ item.shortcut.replace('Ctrl+', '⌃') }}</span> }
            @if (badge(item)) {
              <span class="pip"></span>
            }
          </a>
        }
      }
      <div class="flex-1"></div>
      <div class="foot">
        <div class="rail-theme-bar" role="group" aria-label="Chọn giao diện Sáng / Tối">
          <button type="button" [class.active]="api.theme() === 'light'" (click)="api.applyTheme('light')">
            <o-icon name="sun" [size]="13" /> Sáng
          </button>
          <button type="button" [class.active]="api.theme() === 'dark'" (click)="api.applyTheme('dark')">
            <o-icon name="moon" [size]="13" /> Tối
          </button>
          <button type="button" [class.active]="api.theme() === 'system'" (click)="api.applyTheme('system')">
            <o-icon name="monitor" [size]="13" /> Auto
          </button>
        </div>
        <div class="text-label-sm o-muted mt-1">Omnira Studio Web · 1.2.9</div>
        <div class="text-label-sm o-faint">Ctrl+K tìm nhanh · Ctrl+B thu gọn</div>
      </div>
    </nav>
  `,
  styles: [
    `:host { display: flex; flex-shrink: 0; }
     .rail-backdrop { display: none; }
     .mobile-drawer-head, .mobile-search { display: none; }
     .rail {
       width: var(--rail-w);
       flex-shrink: 0;
       display: flex;
       flex-direction: column;
       gap: 2px;
       padding: 10px;
       background: rgb(var(--c-surface-container-lowest));
       border-right: 1px solid rgb(var(--c-overlay) / 0.07);
       transition: width .18s cubic-bezier(.16, 1, .3, 1), transform .22s cubic-bezier(.16, 1, .3, 1);
     }
     :host-context([data-theme='light']) .rail {
       background: #ffffff;
       border-right: 1px solid rgb(var(--c-outline-variant) / 0.78);
     }
     .rail.collapsed { width: var(--rail-w-collapsed); }
     .grp { font-size: .625rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: rgb(var(--c-outline)); padding: 12px 10px 4px; }
     .grp-div { display: none; }
     .rail.collapsed .grp { display: none; }
     .rail.collapsed .grp-div { display: block; }
     .item {
       position: relative;
       display: flex;
       align-items: center;
       gap: 10px;
       height: 36px;
       padding: 0 11px;
       border-radius: 10px;
       color: rgb(var(--c-on-surface-variant));
       text-decoration: none;
       font-size: .8125rem;
       font-weight: 500;
       white-space: nowrap;
       transition: background .14s ease, color .14s ease, box-shadow .14s ease;
     }
     .rail.collapsed .item { justify-content: center; padding: 0; }
     .rail.collapsed .lbl, .rail.collapsed .lbl-extra, .rail.collapsed .foot { display: none; }
     .pip { display: none; position: absolute; top: 6px; right: 12px; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--c-error)); }
     .rail.collapsed .pip { display: block; }
     .item:hover { background: rgb(var(--c-overlay) / 0.06); color: rgb(var(--c-on-surface)); }
     .item.active {
       background: linear-gradient(90deg, rgb(var(--c-primary) / 0.16), rgb(var(--c-primary) / 0.06));
       color: rgb(var(--c-primary));
       font-weight: 600;
       box-shadow: inset 3px 0 0 rgb(var(--c-primary));
     }
     .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
     .kbd { font-family: 'JetBrains Mono Variable', monospace; font-size: .625rem; color: rgb(var(--c-outline)); }
     .cnt { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: rgb(var(--c-error)); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
     .foot { padding: 10px 8px 4px; display: flex; flex-direction: column; gap: 3px; border-top: 1px solid rgb(var(--c-overlay) / 0.06); margin-top: 6px; }
     .rail-theme-bar {
       display: grid;
       grid-template-columns: repeat(3, minmax(0, 1fr));
       gap: 3px;
       padding: 3px;
       border-radius: 9px;
       background: rgb(var(--c-surface-container));
       border: 1px solid rgb(var(--c-outline-variant) / 0.6);
     }
     .rail-theme-bar button {
       display: inline-flex;
       align-items: center;
       justify-content: center;
       gap: 4px;
       height: 25px;
       border-radius: 6px;
       border: 0;
       background: transparent;
       color: rgb(var(--c-on-surface-variant));
       font-size: .6875rem;
       font-weight: 500;
       cursor: pointer;
       transition: all .14s ease;
     }
     .rail-theme-bar button:hover:not(.active) { color: rgb(var(--c-on-surface)); }
     .rail-theme-bar button.active {
       background: rgb(var(--c-primary-container));
       color: #ffffff;
       font-weight: 600;
     }

     /* Tablet (769px - 1024px) */
     @media (max-width: 1024px) and (min-width: 769px) {
       .rail { width: var(--rail-w-collapsed); }
       .rail .lbl, .rail .lbl-extra, .rail .grp, .rail .foot { display: none; }
       .rail .grp-div { display: block; }
       .rail .item { justify-content: center; padding: 0; }
       .rail .pip { display: block; }
     }

     /* Mobile (<= 768px): Off-canvas Drawer */
     @media (max-width: 768px) {
       .rail-backdrop {
         display: block;
         position: fixed;
         inset: 0;
         z-index: 85;
         background: rgb(2 6 23 / 0.6);
         backdrop-filter: blur(4px);
         animation: o-fade .15s ease-out;
       }
       .rail, .rail.collapsed {
         position: fixed;
         top: 0;
         bottom: 0;
         left: 0;
         z-index: 86;
         width: min(296px, 85vw);
         padding: 12px 10px calc(16px + env(safe-area-inset-bottom, 0px));
         background: rgb(var(--c-surface-container-low));
         border-right: 1px solid rgb(var(--c-overlay) / 0.12);
         box-shadow: 16px 0 48px rgb(0 0 0 / 0.45);
         transform: translateX(-104%);
       }
       :host-context([data-theme='light']) .rail,
       :host-context([data-theme='light']) .rail.collapsed {
         background: #ffffff;
       }
       .rail.mobile-open {
         transform: translateX(0);
       }
       .mobile-drawer-head {
         display: flex;
         align-items: center;
         justify-content: space-between;
         padding: 4px 6px 10px;
         border-bottom: 1px solid rgb(var(--c-overlay) / 0.08);
         margin-bottom: 8px;
       }
       .mobile-search {
         display: flex;
         align-items: center;
         gap: 8px;
         height: 36px;
         padding: 0 10px;
         margin: 0 4px 6px;
         border-radius: 9px;
         border: 1px solid rgb(var(--c-outline-variant) / 0.6);
         background: rgb(var(--c-surface-container));
         color: rgb(var(--c-on-surface-variant));
         font-size: .8125rem;
         cursor: pointer;
       }
       .rail.collapsed .grp, .rail .grp { display: block; }
       .rail.collapsed .grp-div, .rail .grp-div { display: none; }
       .rail.collapsed .item, .rail .item { justify-content: flex-start; padding: 0 12px; height: 40px; font-size: .875rem; }
       .rail.collapsed .lbl, .rail .lbl { display: block; }
       .rail.collapsed .lbl-extra, .rail .lbl-extra { display: inline-flex; }
       .rail.collapsed .foot, .rail .foot { display: flex; }
       .rail.collapsed .pip, .rail .pip { display: none; }
     }`,
  ],
})
export class NavRailComponent {
  readonly shell = inject(ShellStore);
  readonly api = inject(OmniApiService);

  readonly groups = computed(() =>
    (['main', 'create', 'grow', 'system'] as const).map((key) => ({ key, label: GROUP_LABEL[key], items: NAV_ITEMS.filter((i) => i.group === key) })),
  );

  openSearch(): void {
    this.shell.closeMobileNav();
    this.api.commandPaletteOpen.set(true);
  }

  locked(item: NavItem): boolean {
    return !!item.feature && !this.shell.hasFeature(item.feature);
  }

  badge(item: NavItem): number {
    return item.badge ? this.shell.badges()[item.badge] ?? 0 : 0;
  }
}
