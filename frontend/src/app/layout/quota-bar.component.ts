import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DynamicEntity } from '../core/models';
import { OmniApiService } from '../core/omni-api.service';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { PLATFORM_META, asList } from '../shared/util';
import { ShellStore } from './shell.store';

/** Hạn mức kênh theo gói + hộp thoại chọn kênh được dùng (channels.quota / channels.setQuota). */
@Component({
  selector: 'omni-quota-bar',
  standalone: true,
  imports: [IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shell.quota(); as q) {
      @if (q.limit !== null && q.limit !== undefined) {
        <div class="o-banner flex-wrap" [class.warning]="!!q.blocked">
          <div class="flex items-center gap-2 min-w-0">
            <o-icon name="radio" [size]="15" [class.o-warning]="q.blocked || q.used >= q.limit" [class.o-secondary]="!q.blocked && q.used < q.limit" />
            <span>Đang dùng <b>{{ q.used }}</b> / {{ q.limit }} kênh của gói
              @if (q.blocked) { · {{ q.blocked }} kênh ngoài hạn mức (tạm dừng đăng bài) } @else if (q.used >= q.limit) { · đã đủ hạn mức }
            </span>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <div class="o-progress" style="width: 100px" [class.warning]="q.used >= q.limit"><div [style.width.%]="Math.min(100, (q.used / (q.limit || 1)) * 100)"></div></div>
            <button class="o-btn o-btn-sm o-btn-subtle" (click)="openPicker()">Chọn kênh dùng</button>
          </div>
        </div>
      }
    }
    <o-modal [open]="pick()" title="Chọn kênh dùng" [subtitle]="'Tối đa ' + (shell.quota()?.limit ?? 0) + ' kênh – kênh còn lại chuyển “Ngoài hạn mức”'" (closed)="pick.set(false)">
      <div class="flex items-center justify-between text-body-sm">
        <span>Đã chọn <b>{{ selected().size }}</b> / {{ shell.quota()?.limit }}</span>
        <button class="o-btn o-btn-sm o-btn-subtle" (click)="clearSel()">Bỏ chọn hết</button>
      </div>
      <div class="flex flex-col gap-1 o-scroll" style="max-height: 50vh">
        @for (c of channels(); track c.id) {
          <label class="o-list-item" [class.active]="selected().has(c.id)">
            <input type="checkbox" class="o-check" [checked]="selected().has(c.id)" (change)="toggle(c.id)" [disabled]="!selected().has(c.id) && selected().size >= (shell.quota()?.limit ?? 0)" />
            <span class="o-plat" [class]="'o-plat ' + c.platform">{{ meta(c.platform).short }}</span>
            <span class="flex-1 truncate">{{ c.name }}</span>
            <span class="text-label-sm o-muted">{{ c.handle }}</span>
          </label>
        } @empty { <div class="o-empty">Chưa có kênh</div> }
      </div>
      <div modal-footer>
        <button class="o-btn o-btn-subtle" (click)="pick.set(false)">Hủy</button>
        <button class="o-btn o-btn-primary" [disabled]="busy()" (click)="save()">Lưu lựa chọn</button>
      </div>
    </o-modal>
  `,
})
export class QuotaBarComponent {
  readonly shell = inject(ShellStore);
  private readonly api = inject(OmniApiService);
  readonly Math = Math;
  readonly Set = Set;
  readonly pick = signal(false);
  readonly busy = signal(false);
  readonly channels = signal<DynamicEntity[]>([]);
  readonly selected = signal<Set<string>>(new Set());

  constructor() {
    void this.shell.loadQuota();
  }

  meta(p?: string) {
    const key = p ?? '';
    return PLATFORM_META[key] ?? { short: key.slice(0, 2).toUpperCase() };
  }

  async openPicker(): Promise<void> {
    this.pick.set(true);
    const r = await this.api.invokeRaw('channels.list', {});
    const list = asList<DynamicEntity>(r.ok ? r.data : []).map((x) => x.channel ?? x);
    this.channels.set(list);
    this.selected.set(new Set(list.filter((c) => !c.quotaBlocked).map((c) => c.id)));
  }

  clearSel(): void {
    this.selected.set(new Set());
  }

  toggle(id: string): void {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }

  async save(): Promise<void> {
    this.busy.set(true);
    try {
      const q = await this.api.invoke<{ used: number; limit: number | null; blocked?: number }>('channels.setQuota', { activeIds: [...this.selected()] });
      if (q) this.shell.quota.set(q);
      else await this.shell.loadQuota();
      this.shell.bump('channels', 'accounts');
      this.api.toast('Đã cập nhật kênh dùng', undefined, 'success');
      this.pick.set(false);
    } catch {
      /* toast đã hiện */
    } finally {
      this.busy.set(false);
    }
  }
}
