import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-clone-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-space-sm">
        <h1 class="flex items-center gap-space-sm text-headline-sm font-semibold text-on-surface">
          <span class="text-secondary">📋</span> Clone video mẫu
        </h1>
        <span class="text-body-sm text-on-surface-variant">
          Học cấu trúc video đang hot → làm video mới cùng nhịp, khác nhân vật & nội dung → hoàn thiện trong Xưởng Phim
        </span>
      </div>

      <div class="grid grid-cols-1 gap-space-md lg:grid-cols-[350px_minmax(0,1fr)]">
        <!-- Left Column: Source Input + Analyzed Jobs List -->
        <div class="flex flex-col gap-space-md">
          <div class="flex flex-col gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <span class="text-label-md font-semibold text-on-surface">Video mẫu mới</span>

            <button
              type="button"
              [disabled]="starting()"
              (click)="startSampleUpload()"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
              🎬 {{ starting() ? 'Đang tải & phân tích…' : 'Tải file video lên' }}
            </button>

            <div class="flex gap-1.5">
              <input
                [(ngModel)]="sourceUrl"
                (keydown.enter)="startFromUrl()"
                placeholder="Hoặc dán link TikTok / YouTube / Reels…"
                class="min-w-0 flex-1 rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface" />
              <button
                type="button"
                [disabled]="!sourceUrl.trim() || starting()"
                (click)="startFromUrl()"
                class="rounded-lg bg-surface-container-high px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-highest disabled:opacity-40"
                title="Tải video từ link rồi phân tích">
                🔗
              </button>
            </div>

            <p class="text-label-sm text-outline">
              Video ≤ 3 phút (dài hơn chỉ phân tích 3 phút đầu). Link riêng tư / cần đăng nhập thì tải video về máy rồi chọn file.
            </p>
            <p class="text-label-sm text-tertiary">
              ✓ Gemini 3.5 Flash xem cả hình và tiếng – tự động tách phân cảnh, góc máy, lời thoại và nhịp dựng.
            </p>
            <p class="flex gap-1.5 text-label-sm text-outline">
              <span>⚠️</span>
              <span>Chỉ học cấu trúc & nhịp – phim clone dùng nhân vật hư cấu, hình và lời viết mới. Không dùng để giả mạo người thật.</span>
            </p>
          </div>

          @if (jobs().length > 0) {
            <div class="flex flex-col gap-1.5 rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-sm">
              <span class="px-2 py-1 text-label-md font-semibold text-on-surface-variant">Video mẫu đã phân tích ({{ jobs().length }})</span>
              @for (j of jobs(); track j.id) {
                <button
                  type="button"
                  (click)="selectedId.set(j.id)"
                  class="flex items-center gap-space-sm rounded-xl p-2 text-left transition"
                  [ngClass]="j.id === selectedId() ? 'bg-surface-container-high border border-secondary/40' : 'hover:bg-surface-container-low border border-transparent'">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-lowest">
                    @if (j.thumb) {
                      <img [src]="j.thumb" alt="" class="h-full w-full object-cover" />
                    } @else {
                      <span>🎞</span>
                    }
                  </div>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-label-md font-medium text-on-surface">
                      {{ j.analysis?.title || j.sourceName }}
                    </span>
                    <div class="mt-0.5 flex items-center gap-1.5 text-label-sm text-outline">
                      <span class="rounded bg-tertiary/15 px-1.5 py-0.5 text-[10px] font-medium text-tertiary">
                        Đã phân tích
                      </span>
                      <span>{{ j.durationSec || 24 }}s · {{ j.via || 'Gemini 3.5 Flash' }}</span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Right Column: Selected Job Analysis + Clone Form -->
        @if (!selectedJob(); as job) {
          <div class="flex flex-col items-center justify-center gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-12 text-center">
            <span class="text-3xl text-outline">📋</span>
            <p class="max-w-md text-body-md text-on-surface-variant">
              Chọn một video ngắn (TikTok, Reels, Shorts…) đang hiệu quả. AI tách từng cảnh, góc máy, lời thoại, cách mở đầu – rồi viết kịch bản mới cùng khung cho nhân vật và nội dung của bạn.
            </p>
          </div>
        } @else {
          <div class="flex min-w-0 flex-col gap-space-md">
            <!-- Analysis Summary Card -->
            <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
              <div class="flex flex-wrap items-center gap-space-sm">
                <span class="min-w-0 flex-1 truncate text-title-sm font-semibold text-on-surface">
                  {{ selectedJob().sourceName }}
                </span>
                <span class="rounded-md bg-tertiary/15 px-2.5 py-0.5 text-label-sm font-medium text-tertiary">
                  Xem cả video · {{ selectedJob().via || 'Gemini 3.5 Flash' }}
                </span>
                @if (selectedJob().filmId) {
                  <button
                    type="button"
                    (click)="openFilm(selectedJob().filmId)"
                    class="rounded-lg bg-secondary px-3 py-1 text-label-sm font-semibold text-surface">
                    🎞 Mở phim đã tạo
                  </button>
                }
                <button
                  type="button"
                  (click)="deleteJob(selectedJob().id)"
                  class="rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-error hover:bg-error/20">
                  🗑 Xóa
                </button>
              </div>

              <div class="grid grid-cols-1 gap-space-md md:grid-cols-[220px_1fr]">
                <div class="relative aspect-[9/16] max-h-[340px] w-full overflow-hidden rounded-xl bg-black flex items-center justify-center">
                  @if (selectedJob().thumb) {
                    <img [src]="selectedJob().thumb" alt="" class="h-full w-full object-cover" />
                  }
                  <span class="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 font-mono text-xs text-white">
                    {{ selectedJob().durationSec || 24 }}s · {{ selectedJob().analysis?.aspect || '9:16' }}
                  </span>
                </div>

                <dl class="flex flex-col gap-2.5 text-body-sm">
                  <div>
                    <dt class="text-label-sm text-outline">Nội dung chính</dt>
                    <dd class="text-on-surface font-medium">{{ selectedJob().analysis?.summary }}</dd>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <dt class="text-label-sm text-outline">Hook mở đầu</dt>
                      <dd class="text-on-surface">{{ selectedJob().analysis?.hookTechnique || 'Câu hỏi trực diện 3s đầu' }}</dd>
                    </div>
                    <div>
                      <dt class="text-label-sm text-outline">Nhịp dựng (Pacing)</dt>
                      <dd class="text-on-surface">{{ selectedJob().analysis?.pacing || 'Nhanh (4-6s/cảnh)' }}</dd>
                    </div>
                  </div>
                  <div>
                    <dt class="text-label-sm text-outline">Bảng bóc tách phân cảnh ({{ selectedJob().analysis?.shots?.length || 0 }} cảnh)</dt>
                    <dd class="mt-1.5 flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      @for (s of selectedJob().analysis?.shots || []; track $index) {
                        <div class="grid grid-cols-[4.5rem_1fr] gap-2 rounded-lg bg-surface-container-lowest p-2 border border-overlay/[0.05] text-xs">
                          <span class="font-mono text-secondary">{{ s.start }}s–{{ s.end }}s</span>
                          <div class="flex flex-col gap-0.5">
                            <span class="font-medium text-on-surface">{{ s.description || s.summary }}</span>
                            <span class="text-outline">🎥 Góc máy: {{ s.camera }}</span>
                            @if (s.voiceover) {
                              <span class="text-primary">🎙 "{{ s.voiceover }}"</span>
                            }
                          </div>
                        </div>
                      }
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Clone Form Card -->
            <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
              <span class="flex items-center gap-2 text-title-sm font-semibold text-on-surface">
                <span class="text-secondary">🪄</span> Làm video clone theo cấu trúc này
              </span>

              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Nội dung mới (Ngách, sản phẩm, câu chuyện của bạn)
                <textarea
                  [(ngModel)]="cloneForm.idea"
                  rows="3"
                  placeholder="VD: Đổi sang review bộ sưu tập đầm lụa công sở thu đông, giọng sang trọng, kết bằng ưu đãi freeship…"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface"></textarea>
              </label>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                  Lời thoại / Lời kể
                  <select [(ngModel)]="cloneForm.dialogue" class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-2 text-body-sm text-on-surface">
                    <option value="rewrite">Viết lại theo nội dung mới</option>
                    <option value="keep">Giữ sát cấu trúc lời gốc</option>
                    <option value="none">Không lời (chỉ hình & nhạc)</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                  Bối cảnh
                  <select [(ngModel)]="cloneForm.locations" class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-2 text-body-sm text-on-surface">
                    <option value="adapt">Đổi cho hợp nội dung mới</option>
                    <option value="keep">Giữ kiểu bối cảnh gốc</option>
                  </select>
                </label>

                <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                  Tên phim mới
                  <input
                    [(ngModel)]="cloneForm.title"
                    placeholder="Để trống = AI tự đặt"
                    class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-2 text-body-sm text-on-surface" />
                </label>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-overlay/[0.06] pt-3">
                <span class="text-label-sm text-outline">
                  AI viết kịch bản mới giữ nguyên nhịp {{ selectedJob().analysis?.shots?.length || 3 }} cảnh mẫu → mở trực tiếp trong Xưởng Phim AI.
                </span>
                <button
                  type="button"
                  [disabled]="converting()"
                  (click)="convertToFilm()"
                  class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                  ✨ {{ converting() ? 'AI đang dựng kịch bản clone…' : 'Tạo phim clone' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ClonePage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);

  readonly jobs = signal<DynamicEntity[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly starting = signal(false);
  readonly converting = signal(false);

  sourceUrl = '';
  cloneForm = {
    title: '',
    idea: '',
    dialogue: 'rewrite',
    locations: 'adapt',
  };

  readonly selectedJob = computed(() => this.jobs().find((j) => j.id === this.selectedId()) || this.jobs()[0] || null);

  async ngOnInit() {
    await this.loadJobs();
  }

  async loadJobs() {
    const list = await this.api.invoke<DynamicEntity[]>('clone.list', {});
    this.jobs.set(list || []);
    if (!this.selectedId() && list?.length) {
      this.selectedId.set(list[0].id);
    }
  }

  async startSampleUpload() {
    this.starting.set(true);
    try {
      const job = await this.api.invoke<DynamicEntity>('clone.start', {
        sourceName: `tiktok_viral_sample_${Date.now().toString().slice(-4)}.mp4`,
      });
      await this.loadJobs();
      if (job?.id) this.selectedId.set(job.id);
    } finally {
      this.starting.set(false);
    }
  }

  async startFromUrl() {
    if (!this.sourceUrl.trim()) return;
    this.starting.set(true);
    try {
      const job = await this.api.invoke<DynamicEntity>('clone.start', {
        url: this.sourceUrl.trim(),
        sourceName: this.sourceUrl.trim(),
      });
      this.sourceUrl = '';
      await this.loadJobs();
      if (job?.id) this.selectedId.set(job.id);
    } finally {
      this.starting.set(false);
    }
  }

  async deleteJob(id: string) {
    await this.api.invoke('clone.delete', { id });
    this.selectedId.set(null);
    await this.loadJobs();
  }

  async convertToFilm() {
    const job = this.selectedJob();
    if (!job) return;
    this.converting.set(true);
    try {
      const res = await this.api.invoke<DynamicEntity>('clone.toFilm', {
        id: job.id,
        ...this.cloneForm,
      });
      if (res?.filmId) {
        this.router.navigate(['/film', res.filmId]);
      }
    } finally {
      this.converting.set(false);
    }
  }

  openFilm(filmId: string) {
    this.router.navigate(['/film', filmId]);
  }
}
export { ClonePage as ClonePageComponent };
