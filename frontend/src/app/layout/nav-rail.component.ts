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
    <nav class="rail o-scroll" [class.collapsed]="shell.railCollapsed()" aria-label="Điều hướng chính">
      @for (g of groups(); track g.key) {
        @if (!shell.railCollapsed()) { <div class="grp">{{ g.label }}</div> } @else { <div class="o-divider" style="margin: 8px 10px"></div> }
        @for (item of g.items; track item.path) {
          <a class="item" [routerLink]="item.path" routerLinkActive="nav-active active" [routerLinkActiveOptions]="{ exact: item.path === '/' }"
             [title]="item.label + (item.shortcut ? ' (' + item.shortcut + ')' : '') + (locked(item) ? ' – cần nâng cấp gói' : '')">
            <o-icon [name]="item.icon" [size]="18" [stroke]="1.75" />
            @if (!shell.railCollapsed()) {
              <span class="lbl">{{ item.label }}</span>
              @if (locked(item)) { <o-icon name="lock" [size]="12" class="o-faint" /> }
              @else if (badge(item); as n) { <span class="cnt">{{ n > 99 ? '99+' : n }}</span> }
              @else if (item.shortcut) { <span class="kbd">{{ item.shortcut.replace('Ctrl+', '⌃') }}</span> }
            } @else if (badge(item)) {
              <span class="pip"></span>
            }
          </a>
        }
      }
      <div class="flex-1"></div>
      @if (!shell.railCollapsed()) {
        <div class="foot">
          <div class="text-label-sm o-muted">Omnira Studio Web · 1.2.9</div>
          <div class="text-label-sm o-faint">Ctrl+K tìm nhanh · Ctrl+B thu gọn</div>
        </div>
      }
    </nav>
  `,
  styles: [
    `:host { display: flex; flex-shrink: 0; }
     .rail { width: var(--rail-w); flex-shrink: 0; display: flex; flex-direction: column; gap: 1px; padding: 8px; background: rgb(var(--c-surface-container-lowest)); border-right: 1px solid rgb(var(--c-overlay) / 0.05); transition: width .18s; }
     .rail.collapsed { width: var(--rail-w-collapsed); }
     .grp { font-size: .625rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--c-outline)); padding: 12px 10px 4px; }
     .item { position: relative; display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; border-radius: 9px; color: rgb(var(--c-on-surface-variant)); text-decoration: none; font-size: .8125rem; white-space: nowrap; transition: background .12s, color .12s; }
     .collapsed .item { justify-content: center; padding: 0; }
     .item:hover { background: rgb(var(--c-overlay) / 0.05); color: rgb(var(--c-on-surface)); }
     .item.active { background: rgb(var(--c-primary) / 0.12); color: rgb(var(--c-primary)); font-weight: 600; box-shadow: inset 2px 0 rgb(var(--c-primary)); }
     .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
     .kbd { font-family: 'JetBrains Mono Variable', monospace; font-size: .625rem; color: rgb(var(--c-outline)); }
     .cnt { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: rgb(var(--c-error)); color: rgb(var(--c-on-error)); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
     .pip { position: absolute; top: 6px; right: 12px; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--c-error)); }
     .foot { padding: 10px; display: flex; flex-direction: column; gap: 2px; }
     @media (max-width: 900px) { .rail { width: var(--rail-w-collapsed); } .rail .lbl, .rail .kbd, .rail .cnt, .rail .grp, .rail .foot { display: none; } .rail .item { justify-content: center; padding: 0; } }`,
  ],
})
export class NavRailComponent {
  readonly shell = inject(ShellStore);
  readonly api = inject(OmniApiService);

  readonly groups = computed(() =>
    (['main', 'create', 'grow', 'system'] as const).map((key) => ({ key, label: GROUP_LABEL[key], items: NAV_ITEMS.filter((i) => i.group === key) })),
  );

  locked(item: NavItem) {
    return !!item.feature && !this.shell.hasFeature(item.feature);
  }

  badge(item: NavItem): number {
    return item.badge ? this.shell.badges()[item.badge] ?? 0 : 0;
  }
}
