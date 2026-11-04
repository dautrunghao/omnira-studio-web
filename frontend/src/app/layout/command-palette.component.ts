import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicEntity } from '../core/models';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { asList, inputVal } from '../shared/util';
import { NAV_ITEMS } from './nav-items';
import { ShellStore } from './shell.store';
import { THEMES } from './theme-picker.component';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

@Component({
  selector: 'omni-command-palette',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (api.commandPaletteOpen()) {
      <div class="o-backdrop" (click)="close()"></div>
      <div class="cp" role="dialog" aria-label="Bảng lệnh">
        <div class="cp-in">
          <o-icon name="search" [size]="17" class="o-muted" />
          <input #q class="cp-q" placeholder="Tìm kênh, bài viết, kịch bản, trang hoặc lệnh…" [value]="query()" (input)="query.set(inputVal($event)); idx.set(0)" (keydown)="onKey($event)" />
          <span class="o-kbd">Esc</span>
        </div>
        <div class="cp-list o-scroll">
          @for (g of grouped(); track g.group) {
            <div class="cp-g">{{ g.group }}</div>
            @for (c of g.items; track c.id) {
              <button class="o-pop-item" [class.active]="flat()[idx()]?.id === c.id" (mouseenter)="idx.set(flat().indexOf(c))" (click)="exec(c)">
                <o-icon [name]="c.icon" [size]="16" class="o-muted" />
                <span class="flex-1 truncate">{{ c.label }}</span>
                @if (c.hint) { <span class="text-label-sm o-faint truncate" style="max-width: 40%">{{ c.hint }}</span> }
              </button>
            }
          } @empty {
            <div class="o-empty">Không tìm thấy kết quả cho “{{ query() }}”</div>
          }
        </div>
        <div class="cp-foot"><span><span class="o-kbd">↑↓</span> chọn</span><span><span class="o-kbd">Enter</span> mở</span><span><span class="o-kbd">Ctrl+K</span> bật/tắt</span></div>
      </div>
    }
  `,
  styles: [
    `.cp { position: fixed; z-index: 90; top: 10vh; left: 50%; transform: translateX(-50%); width: min(640px, calc(100vw - 24px)); background: rgb(var(--c-surface-container-high)); border: 1px solid rgb(var(--c-overlay) / 0.08); border-radius: 16px; box-shadow: 0 24px 64px rgb(0 0 0 / 0.5); overflow: hidden; animation: o-in .14s ease-out; }
     .cp-in { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid rgb(var(--c-overlay) / 0.06); }
     .cp-q { flex: 1; background: transparent; border: 0; outline: none; color: rgb(var(--c-on-surface)); font-size: .9375rem; }
     .cp-list { max-height: 55vh; padding: 6px; }
     .cp-g { padding: 8px 10px 4px; font-size: .625rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--c-outline)); }
     .cp-foot { display: flex; flex-wrap: wrap; gap: 16px; padding: 8px 14px; border-top: 1px solid rgb(var(--c-overlay) / 0.06); font-size: .6875rem; color: rgb(var(--c-on-surface-variant)); }`,
  ],
})
export class CommandPaletteComponent {
  readonly api = inject(OmniApiService);
  private readonly shell = inject(ShellStore);
  private readonly router = inject(Router);
  readonly inputVal = inputVal;
  readonly query = signal('');
  readonly idx = signal(0);
  private readonly dyn = signal<Cmd[]>([]);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('q');

  constructor() {
    effect(() => {
      if (this.api.commandPaletteOpen()) {
        this.query.set('');
        this.idx.set(0);
        void this.loadDynamic();
        setTimeout(() => this.input()?.nativeElement.focus(), 0);
      }
    });
  }

  private readonly base = computed<Cmd[]>(() => {
    const nav: Cmd[] = NAV_ITEMS.map((n) => ({
      id: 'nav:' + n.path,
      group: 'Trang',
      label: n.label,
      hint: n.shortcut,
      icon: n.icon,
      run: () => void this.router.navigateByUrl(n.path),
    }));
    const actions: Cmd[] = [
      { id: 'a:newws', group: 'Thao tác', label: 'Tạo không gian làm việc mới', icon: 'plus', run: () => void this.router.navigate(['/workspaces'], { queryParams: { new: 1 } }) },
      { id: 'a:newacc', group: 'Thao tác', label: 'Thêm tài khoản / fanpage', icon: 'userplus', run: () => void this.router.navigate(['/accounts'], { queryParams: { add: 1 } }) },
      { id: 'a:newcontent', group: 'Thao tác', label: 'Tạo nội dung mới', icon: 'edit', run: () => void this.router.navigate(['/content'], { queryParams: { new: 1 } }) },
      { id: 'a:plan', group: 'Thao tác', label: 'AI sinh kế hoạch nội dung', icon: 'sparkles', run: () => void this.router.navigate(['/plan'], { queryParams: { generate: 1 } }) },
      { id: 'a:buy', group: 'Thao tác', label: 'Mua / gia hạn gói', icon: 'card', run: () => this.api.buyPlanOpen.set(true) },
      { id: 'a:rail', group: 'Thao tác', label: 'Thu gọn / mở rộng thanh điều hướng', hint: 'Ctrl+B', icon: 'panel', run: () => this.shell.toggleRail() },
      ...THEMES.map((t) => ({ id: 'theme:' + t.value, group: 'Giao diện', label: `Giao diện: ${t.label}`, icon: t.icon, run: () => this.api.applyTheme(t.value) })),
    ];
    const ws: Cmd[] = [
      { id: 'ws:all', group: 'Không gian làm việc', label: 'Tất cả không gian', icon: 'layers', run: () => this.api.setWorkspaceId(null) },
      ...this.shell.workspaces().map((w) => ({ id: 'ws:' + w.id, group: 'Không gian làm việc', label: w.name ?? '', hint: `${w.channelCount ?? 0} kênh`, icon: 'layers', run: (): void => { this.api.setWorkspaceId(w.id ?? null); this.shell.bump('workspace'); } })),
    ];
    return [...nav, ...actions, ...ws];
  });

  private async loadDynamic(): Promise<void> {
    const [ch, ct] = await Promise.all([this.api.invokeRaw('channels.list', {}), this.api.invokeRaw('content.list', { workspaceId: this.api.activeWorkspaceId() })]);
    const channels = asList<DynamicEntity>(ch.ok ? ch.data : []).map((x) => x.channel ?? x);
    const content = asList<DynamicEntity>(ct.ok ? ct.data : []);
    this.dyn.set([
      ...channels.map((c): Cmd => ({ id: 'ch:' + c.id, group: 'Kênh', label: c.name ?? '', hint: `${c.platform ?? ''} ${c.handle ?? ''}`, icon: c.platform ?? 'radio', run: (): void => { void this.router.navigate(['/accounts'], { queryParams: { channel: c.id } }); } })),
      ...content.map((c): Cmd => ({ id: 'ct:' + c.id, group: 'Nội dung', label: c.title ?? '', hint: c.status, icon: 'folder', run: (): void => { void this.router.navigate(['/content'], { queryParams: { id: c.id } }); } })),
    ]);
  }

  readonly flat = computed(() => {
    const q = strip(this.query().trim());
    const all = [...this.base(), ...this.dyn()];
    if (!q) return all.filter((c) => c.group !== 'Kênh' && c.group !== 'Nội dung').slice(0, 40);
    return all.filter((c) => strip(c.label + ' ' + (c.hint ?? '')).includes(q)).slice(0, 60);
  });

  readonly grouped = computed(() => {
    const m = new Map<string, Cmd[]>();
    for (const c of this.flat()) {
      if (!m.has(c.group)) m.set(c.group, []);
      m.get(c.group)!.push(c);
    }
    return [...m.entries()].map(([group, items]) => ({ group, items }));
  });

  onKey(e: KeyboardEvent): void {
    const n = this.flat().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.idx.set((this.idx() + 1) % Math.max(1, n));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.idx.set((this.idx() - 1 + n) % Math.max(1, n));
    } else if (e.key === 'Enter') {
      const c = this.flat()[this.idx()];
      if (c) this.exec(c);
    } else if (e.key === 'Escape') this.close();
  }

  exec(c: Cmd): void {
    this.close();
    c.run();
  }

  close(): void {
    this.api.commandPaletteOpen.set(false);
  }
}
