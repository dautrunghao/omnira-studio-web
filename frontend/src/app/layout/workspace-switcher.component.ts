import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { ShellStore } from './shell.store';

@Component({
  selector: 'omni-workspace-switcher',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block min-w-0' },
  template: `
    <button type="button" class="ws-btn" aria-haspopup="listbox" [attr.aria-expanded]="open()" (click)="open.set(!open())">
      @if (shell.activeWorkspace(); as w) {
        <span class="o-swatch shrink-0" [style.background]="w.color || 'rgb(var(--c-primary))'"></span>
      } @else {
        <o-icon name="layers" [size]="15" class="o-secondary shrink-0" />
      }
      <span class="ws-label truncate">
        {{ shell.activeWorkspace()?.name ?? 'Tất cả không gian' }}
        <span class="o-muted ws-cnt">({{ shell.activeWorkspace()?.channelCount ?? shell.totalChannels() }} kênh)</span>
      </span>
      <o-icon name="chevrondown" [size]="14" class="o-muted shrink-0" />
    </button>
    @if (open()) {
      <div class="o-pop ws-pop" role="listbox">
        <button class="o-pop-item" [class.active]="!api.activeWorkspaceId()" (click)="choose(null)">
          <o-icon name="layers" [size]="15" class="o-secondary" />
          <span class="flex-1 truncate">Tất cả không gian</span>
          <span class="o-badge mono">{{ shell.totalChannels() }}</span>
        </button>
        <div class="o-divider" style="margin: 4px 0"></div>
        @for (w of shell.workspaces(); track w.id) {
          <button class="o-pop-item" [class.active]="api.activeWorkspaceId() === w.id" (click)="choose(w.id)">
            <span class="o-swatch" [style.background]="w.color || 'rgb(var(--c-primary))'"></span>
            <span class="flex-1 truncate">{{ w.name }}</span>
            <span class="o-badge mono">{{ w.channelCount ?? 0 }}</span>
            @if (api.activeWorkspaceId() === w.id) { <o-icon name="check" [size]="14" class="o-primary" /> }
          </button>
        } @empty {
          <div class="o-empty" style="padding: 14px">Chưa có không gian làm việc</div>
        }
        <div class="o-divider" style="margin: 4px 0"></div>
        <a class="o-pop-item" routerLink="/workspaces" (click)="open.set(false)"><o-icon name="plus" [size]="15" /> Quản lý không gian làm việc</a>
      </div>
    }
  `,
  styles: [
    `.ws-btn { display: flex; align-items: center; gap: 6px; height: 30px; max-width: 100%; padding: 0 9px; border-radius: 8px; border: 0; background: rgb(var(--c-surface-container-low)); color: rgb(var(--c-on-surface)); font-size: .75rem; font-weight: 500; cursor: pointer; min-width: 0; }
     .ws-btn:hover { background: rgb(var(--c-surface-container-high)); }
     .ws-label { max-width: clamp(96px, 32vw, 220px); min-width: 0; }
     .ws-pop { left: 0; top: 36px; width: min(300px, calc(100vw - 24px)); }
     @media (max-width: 480px) {
       .ws-cnt { display: none; }
       .ws-label { max-width: 36vw; }
     }`,
  ],
})
export class WorkspaceSwitcherComponent {
  readonly api = inject(OmniApiService);
  readonly shell = inject(ShellStore);
  private readonly el = inject(ElementRef<HTMLElement>);
  readonly open = signal(false);

  choose(id: string | null): void {
    this.api.setWorkspaceId(id);
    this.open.set(false);
    this.shell.bump('workspace');
  }

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.open.set(false);
  }
}
