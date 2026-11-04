import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Hộp thoại dùng chung: <o-modal [open]="x()" title="…" (closed)="x.set(false)">…<div modal-footer>…</div></o-modal> */
@Component({
  selector: 'o-modal',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="o-backdrop" (click)="closed.emit()"></div>
      <div class="o-modal" [class.o-modal-wide]="wide()" [class.o-drawer]="drawer()" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="o-modal-head">
          <div class="min-w-0">
            <h2 class="text-headline-sm truncate">{{ title() }}</h2>
            @if (subtitle()) { <p class="text-body-sm o-muted">{{ subtitle() }}</p> }
          </div>
          <button class="o-icon-btn" type="button" (click)="closed.emit()" aria-label="Đóng"><o-icon name="x" /></button>
        </header>
        <div class="o-modal-body"><ng-content /></div>
        <footer class="o-modal-foot"><ng-content select="[modal-footer]" /></footer>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly subtitle = input('');
  readonly wide = input(false);
  readonly drawer = input(false);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open()) this.closed.emit();
  }
}
