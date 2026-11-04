import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-image-studio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Top Header Card -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">🖼</span> Xưởng Ảnh AI
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Bài chỉ cần ảnh (mỹ phẩm, thời trang, ưu đãi): nhập brief + ảnh tham chiếu → AI gợi ý ý tưởng → tạo ảnh → lưu vào Kho nội dung.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-space-sm">
          @if (projects().length > 0) {
            <select
              [ngModel]="activeId()"
              (ngModelChange)="selectProject($event)"
              class="w-60 rounded-lg border border-overlay/[0.12] bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface">
              @for (p of projects(); track p.id) {
                <option [value]="p.id">{{ p.title }} {{ p.resultCount ? '· ' + p.resultCount + ' ảnh' : '' }}</option>
              }
            </select>
          }

          <button
            type="button"
            (click)="createNewProject()"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-label-md font-medium text-on-primary hover:opacity-90">
            📁 Dự án mới
          </button>

          @if (activeId()) {
            <button
              type="button"
              (click)="deleteProject()"
              class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-body-sm text-error hover:bg-error/20"
              title="Xóa dự án">
              🗑
            </button>
          }
        </div>
      </div>

      @if (toastMsg()) {
        <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
          <span>{{ toastMsg() }}</span>
          <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
        </div>
      }

      @if (!currentProject()) {
        <div class="flex flex-col items-center gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-12 text-center text-on-surface-variant">
          <span class="text-3xl text-outline">🖼</span>
          <div>Chưa có dự án ảnh nào. Tạo dự án mới để bắt đầu.</div>
          <button
            type="button"
            (click)="createNewProject()"
            class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">
            📁 Dự án mới
          </button>
        </div>
      } @else {
        <!-- Main 2-Column Layout: Brief Panel + Ideas & Results -->
        <div class="grid grid-cols-1 gap-space-md lg:grid-cols-[340px_minmax(0,1fr)]">
          <!-- Left Brief Panel -->
          <div class="flex h-fit flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex items-center justify-between border-b border-overlay/[0.06] pb-2">
              <h2 class="text-title-md font-semibold text-on-surface">Brief chiến dịch ảnh</h2>
              <span class="font-mono text-xs text-secondary">{{ currentProject().aspect || '4:5' }}</span>
            </div>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tên dự án
              <input
                [(ngModel)]="currentProject().title"
                (blur)="saveProjectPatch({ title: currentProject().title })"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface" />
            </label>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Sản phẩm / Thương hiệu
              <input
                [(ngModel)]="currentProject().productName"
                (blur)="saveProjectPatch({ productName: currentProject().productName })"
                placeholder="VD: Serum B5 phục hồi da / Đầm lụa Atelier"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface" />
            </label>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Muốn quảng cáo gì (Thông điệp, ưu đãi, khách hàng)
              <textarea
                [(ngModel)]="currentProject().brief"
                (blur)="saveProjectPatch({ brief: currentProject().brief })"
                rows="4"
                placeholder="VD: Ra mắt bộ sưu tập mới, ưu đãi 30% tuần này, hướng tới nữ 22–35 tuổi…"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>

            <div>
              <div class="mb-1.5 text-label-sm uppercase tracking-wider text-outline">Loại ảnh & Tỉ lệ</div>
              <div class="flex flex-wrap gap-1.5">
                @for (t of imageTypes; track t.id) {
                  <button
                    type="button"
                    (click)="saveProjectPatch({ mode: t.id, aspect: t.aspect })"
                    class="rounded-full px-3 py-1 text-label-sm transition"
                    [ngClass]="currentProject().aspect === t.aspect ? 'bg-primary text-on-primary font-semibold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'">
                    {{ t.label }} <span class="opacity-70">{{ t.aspect }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <div class="mb-1.5 text-label-sm uppercase tracking-wider text-outline">Phong cách thẩm mỹ</div>
              <div class="flex flex-wrap gap-1.5">
                @for (st of imageStyles; track st.id) {
                  <button
                    type="button"
                    (click)="saveProjectPatch({ stylePreset: st.id })"
                    class="rounded-full px-3 py-1 text-label-sm transition"
                    [ngClass]="currentProject().stylePreset === st.id ? 'bg-secondary text-surface font-semibold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'">
                    {{ st.label }}
                  </button>
                }
              </div>
            </div>

            <div class="flex items-center gap-2 border-t border-overlay/[0.06] pt-3">
              <label class="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                Số ý tưởng
                <select [(ngModel)]="ideaCount" class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface">
                  @for (n of [2, 3, 4, 6]; track n) {
                    <option [ngValue]="n">{{ n }}</option>
                  }
                </select>
              </label>

              <button
                type="button"
                [disabled]="generatingIdeas()"
                (click)="generateIdeas()"
                class="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                ✨ {{ generatingIdeas() ? 'Đang nghĩ…' : 'AI gợi ý ý tưởng' }}
              </button>
            </div>
          </div>

          <!-- Right Column: Concept Ideas + Generated Images Grid -->
          <div class="flex flex-col gap-space-md">
            <!-- Concept Ideas Card -->
            <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-md">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-title-sm font-semibold text-on-surface">
                    Concept Ý Tưởng & Lồng Chữ ({{ currentProject().ideas?.length || 0 }})
                  </h2>
                  <p class="text-xs text-outline">App tự lồng chữ tiếng Việt đúng dấu lên ảnh – AI tập trung vẽ sản phẩm & bối cảnh.</p>
                </div>

                <button
                  type="button"
                  [disabled]="generatingImages()"
                  (click)="generateImages()"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-label-md font-semibold text-surface hover:opacity-90 disabled:opacity-50">
                  🪄 {{ generatingImages() ? 'Đang tạo ảnh AI…' : 'Tạo bộ ảnh AI từ các Concept' }}
                </button>
              </div>

              @if (!currentProject().ideas?.length) {
                <div class="rounded-xl bg-surface-container-lowest p-6 text-center text-body-sm text-outline">
                  Bấm "AI gợi ý ý tưởng" ở cột Brief bên trái để AI đề xuất các Concept chụp ảnh sản phẩm.
                </div>
              } @else {
                <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  @for (idea of currentProject().ideas; track idea.id; let idx = $index) {
                    <div class="flex flex-col gap-2 rounded-xl border border-overlay/[0.08] bg-surface-container-lowest p-3">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-mono text-xs font-bold text-secondary">#{{ idx + 1 }}</span>
                        <input
                          [(ngModel)]="idea.title"
                          class="min-w-0 flex-1 bg-transparent font-semibold text-label-md text-on-surface focus:outline-none" />
                        <input type="checkbox" [(ngModel)]="idea.selected" class="h-4 w-4 accent-primary" />
                      </div>
                      <textarea
                        [(ngModel)]="idea.prompt"
                        rows="2"
                        class="rounded-lg border border-overlay/[0.08] bg-surface-container px-2.5 py-1.5 font-mono text-xs text-on-surface-variant"></textarea>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Generated Image Results Grid -->
            <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-md">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-title-sm font-semibold text-on-surface">
                  Kết Quả Ảnh Đã Tạo ({{ currentProject().results?.length || 0 }} ảnh)
                </h2>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="saveToContent(false)"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-highest">
                    📦 Lưu vào Kho nội dung (Carousel)
                  </button>
                  <button
                    type="button"
                    (click)="saveToContent(true)"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-sm font-medium text-on-primary">
                    📅 Lưu & Lên lịch đăng
                  </button>
                </div>
              </div>

              @if (!currentProject().results?.length) {
                <div class="rounded-xl bg-surface-container-lowest p-8 text-center text-body-sm text-outline">
                  Chưa có ảnh nào được tạo trong dự án này. Bấm "Tạo bộ ảnh AI từ các Concept" để bắt đầu.
                </div>
              } @else {
                <div class="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3">
                  @for (res of currentProject().results; track res.id) {
                    <div class="group relative flex flex-col overflow-hidden rounded-xl border border-overlay/[0.08] bg-surface-container-lowest">
                      <div class="relative aspect-[4/5] w-full overflow-hidden bg-black">
                        <img [src]="res.imageUrl" [alt]="res.title" class="h-full w-full object-cover transition group-hover:scale-105" />
                        <span class="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white">
                          {{ res.aspect || '4:5' }} · {{ res.model || 'gemini-3.1-flash-image' }}
                        </span>
                        <button
                          type="button"
                          (click)="deleteResult(res.id)"
                          class="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-error opacity-0 transition group-hover:opacity-100">
                          🗑
                        </button>
                      </div>
                      <div class="flex flex-col gap-1 p-3">
                        <div class="truncate text-label-md font-semibold text-on-surface">{{ res.title }}</div>
                        <div class="line-clamp-2 font-mono text-[11px] text-on-surface-variant">{{ res.prompt }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ImageStudioPage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);

  readonly projects = signal<any[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly currentProject = signal<any | null>(null);
  readonly generatingIdeas = signal(false);
  readonly generatingImages = signal(false);
  readonly toastMsg = signal('');

  ideaCount = 3;

  readonly imageTypes = [
    { id: 'poster', label: 'Poster', aspect: '4:5' },
    { id: 'square', label: 'Feed vuông', aspect: '1:1' },
    { id: 'story', label: 'Story / Reel', aspect: '9:16' },
    { id: 'banner', label: 'Banner ngang', aspect: '16:9' },
  ];

  readonly imageStyles = [
    { id: 'editorial_studio', label: 'Studio nền sạch' },
    { id: 'luxury', label: 'Sang trọng Luxury' },
    { id: 'minimal', label: 'Tối giản' },
    { id: 'vivid', label: 'Rực rỡ' },
    { id: 'ugc', label: 'UGC tự nhiên' },
  ];

  async ngOnInit() {
    await this.loadList();
  }

  async loadList() {
    const list = await this.api.invoke<any[]>('imagestudio.list', {});
    this.projects.set(list || []);
    const pid = this.activeId() || list?.[0]?.id || null;
    if (pid) {
      await this.selectProject(pid);
    } else {
      this.currentProject.set(null);
    }
  }

  async selectProject(id: string) {
    this.activeId.set(id);
    const detail = await this.api.invoke<any>('imagestudio.get', { id });
    this.currentProject.set(detail);
  }

  async createNewProject() {
    const created = await this.api.invoke<any>('imagestudio.create', {
      title: 'Bộ ảnh Lookbook AI mới',
    });
    if (created?.id) this.activeId.set(created.id);
    await this.loadList();
  }

  async saveProjectPatch(patch: any) {
    const p = this.currentProject();
    if (!p) return;
    await this.api.invoke('imagestudio.update', { id: p.id, patch });
    await this.selectProject(p.id);
  }

  async deleteProject() {
    const p = this.currentProject();
    if (!p) return;
    await this.api.invoke('imagestudio.delete', { id: p.id });
    this.activeId.set(null);
    await this.loadList();
  }

  async generateIdeas() {
    const p = this.currentProject();
    if (!p) return;
    this.generatingIdeas.set(true);
    try {
      await this.api.invoke('imagestudio.generateIdeas', { projectId: p.id, count: this.ideaCount });
      this.toastMsg.set('AI đã gợi ý xong các Concept chụp ảnh thương mại!');
      await this.selectProject(p.id);
    } finally {
      this.generatingIdeas.set(false);
    }
  }

  async generateImages() {
    const p = this.currentProject();
    if (!p) return;
    this.generatingImages.set(true);
    try {
      const res = await this.api.invoke<any>('imagestudio.generate', { projectId: p.id });
      this.toastMsg.set(`Đã tạo xong ${res?.created || 2} ảnh AI chất lượng cao!`);
      await this.loadList();
    } finally {
      this.generatingImages.set(false);
    }
  }

  async deleteResult(id: string) {
    const p = this.currentProject();
    if (!p) return;
    await this.api.invoke('imagestudio.deleteResult', { id });
    await this.loadList();
  }

  async saveToContent(openCalendar: boolean) {
    const p = this.currentProject();
    if (!p) return;
    await this.api.invoke('imagestudio.toContent', { projectId: p.id });
    this.router.navigate([openCalendar ? '/calendar' : '/content']);
  }
}
export { ImageStudioPage as ImageStudioPageComponent };
