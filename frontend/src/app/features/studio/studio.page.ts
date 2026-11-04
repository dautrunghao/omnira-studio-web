import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-studio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex min-h-[calc(100vh-5rem)] flex-col gap-space-md">
      <!-- Top Header Bar -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-sm pl-space-md">
        <div class="flex items-center gap-space-md">
          <span class="text-xl text-secondary">🎬</span>
          <h1 class="text-headline-md font-semibold text-on-surface">AI Video Generator Studio</h1>
          <span class="rounded-md bg-secondary/15 px-2.5 py-0.5 font-mono text-label-sm font-semibold text-secondary">
            PIPELINE 3 CỘT
          </span>
          <span class="text-label-sm text-outline">
            {{ saveState() === 'saving' ? '⏳ Đang lưu…' : '✓ Đã lưu tự động' }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-space-sm">
          <select
            [ngModel]="selectedProjectId()"
            (ngModelChange)="selectProject($event)"
            class="w-72 rounded-lg border border-overlay/[0.12] bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface">
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.topic | slice:0:46 }} · {{ p.sceneCount || 0 }} cảnh</option>
            }
          </select>

          <button
            type="button"
            (click)="newModalOpen.set(true)"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-label-md font-medium text-on-primary hover:opacity-90">
            ＋ Dự án mới
          </button>

          @if (project()) {
            <button
              type="button"
              (click)="deleteCurrentProject()"
              class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-body-sm text-error hover:bg-error/20"
              title="Xóa dự án">
              🗑
            </button>
          }

          <button
            type="button"
            (click)="historyOpen.set(true)"
            class="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-highest">
            🕒 Lịch sử render ({{ renderJobs().length }})
          </button>
        </div>
      </div>

      @if (toastMsg()) {
        <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
          <span>{{ toastMsg() }}</span>
          <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
        </div>
      }

      @if (!project()) {
        <div class="flex flex-1 flex-col items-center justify-center gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-12 text-on-surface-variant">
          <p>Chưa có dự án video nào trong Pocket này.</p>
          <button
            type="button"
            (click)="newModalOpen.set(true)"
            class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">
            ＋ Tạo dự án đầu tiên
          </button>
        </div>
      } @else {
        <!-- 3-Column Studio Pipeline -->
        <div class="grid min-h-0 flex-1 grid-cols-1 gap-space-md xl:grid-cols-[320px_minmax(0,1fr)_330px]">
          <!-- Column 1: Config Panel -->
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex items-center justify-between border-b border-overlay/[0.06] pb-2">
              <h2 class="text-title-sm font-semibold text-on-surface">1. Cấu hình & Kịch bản</h2>
              <span class="font-mono text-xs text-outline">{{ project().format | uppercase }}</span>
            </div>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Chủ đề / Ý tưởng Video
              <textarea
                [(ngModel)]="project().topic"
                (blur)="saveProjectPatch({ topic: project().topic })"
                rows="3"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>

            <div class="grid grid-cols-2 gap-2.5">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Tỉ lệ khung hình
                <select
                  [(ngModel)]="project().aspect"
                  (ngModelChange)="saveProjectPatch({ aspect: $event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option value="9:16">9:16 (Reels/TikTok)</option>
                  <option value="16:9">16:9 (YouTube)</option>
                  <option value="1:1">1:1 (Feed vuông)</option>
                </select>
              </label>

              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Thời lượng mục tiêu
                <select
                  [(ngModel)]="project().targetDurationSec"
                  (ngModelChange)="saveProjectPatch({ targetDurationSec: +$event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option [ngValue]="15">15 giây</option>
                  <option [ngValue]="30">30 giây</option>
                  <option [ngValue]="60">60 giây</option>
                  <option [ngValue]="120">120 giây (Dài)</option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Chế độ dựng hình
                <select
                  [(ngModel)]="project().renderMode"
                  (ngModelChange)="saveProjectPatch({ renderMode: $event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option value="semi_ai">Ảnh AI + Ken Burns</option>
                  <option value="full_ai">Video AI (Veo / Seedance)</option>
                  <option value="stock">Stock + Upload</option>
                </select>
              </label>

              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Nguồn giọng đọc TTS
                <select
                  [(ngModel)]="project().ttsProvider"
                  (ngModelChange)="saveProjectPatch({ ttsProvider: $event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option value="google_tts">Gemini TTS</option>
                  <option value="openai_tts">OpenAI TTS</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="local_tts">Omnira Local TTS</option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Kiểu phụ đề Karaoke
                <select
                  [(ngModel)]="project().subtitleStyle"
                  (ngModelChange)="saveProjectPatch({ subtitleStyle: $event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option value="montserrat-kara-pop">Karaoke Pop Vàng</option>
                  <option value="hormozi-bold">Hormozi Bold Xanh</option>
                  <option value="cinematic-bottom">Điện ảnh Tối giản</option>
                  <option value="none">Tắt phụ đề</option>
                </select>
              </label>

              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Nhạc nền (BGM)
                <select
                  [(ngModel)]="project().bgmTrack"
                  (ngModelChange)="saveProjectPatch({ bgmTrack: $event })"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                  <option value="lofi-runway-chic.mp3">Lofi Runway Chic</option>
                  <option value="upbeat-viral-hook.mp3">Upbeat Viral Hook</option>
                  <option value="emotional-piano-warm.mp3">Emotional Piano</option>
                  <option value="">Không nhạc nền</option>
                </select>
              </label>
            </div>

            <!-- Visual Bible / Fashion Try-on box -->
            <div class="rounded-xl border border-overlay/[0.06] bg-surface-container-lowest p-3 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-label-sm font-semibold uppercase tracking-wider text-secondary">👗 Visual Bible & Try-On</span>
                <button
                  type="button"
                  (click)="runTryOn()"
                  class="rounded bg-secondary/15 px-2 py-0.5 text-[11px] font-medium text-secondary hover:bg-secondary/25">
                  ✨ Thử đồ AI
                </button>
              </div>
              <input
                [ngModel]="project().visualBible?.characterDesc || 'Nữ người mẫu 24 tuổi, thanh lịch, ánh sáng studio ấm'"
                (ngModelChange)="updateVisualBible($event)"
                placeholder="Mô tả nhân vật / sản phẩm xuyên suốt…"
                class="rounded border border-overlay/[0.1] bg-surface-container px-2.5 py-1.5 text-xs text-on-surface" />
            </div>

            <button
              type="button"
              [disabled]="generatingScript()"
              (click)="generateScript()"
              class="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
              <span>✨</span>
              {{ generatingScript() ? 'AI đang viết phân cảnh…' : 'AI Sinh Kịch Bản & Phân Cảnh (Ctrl+Enter)' }}
            </button>
          </div>

          <!-- Column 2: Storyboard Scenes -->
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-overlay/[0.06] pb-2">
              <div class="flex items-center gap-2">
                <h2 class="text-title-sm font-semibold text-on-surface">
                  2. Bảng Phân Cảnh Storyboard ({{ scenes().length }} cảnh · {{ totalDuration() }}s)
                </h2>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="exportPrompts()"
                  class="rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface hover:bg-surface-container-highest">
                  📋 Xuất Prompts
                </button>
                <button
                  type="button"
                  (click)="addScene()"
                  class="rounded-lg bg-primary/20 px-2.5 py-1 text-label-sm font-medium text-primary hover:bg-primary/30">
                  ＋ Thêm cảnh
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-3 overflow-y-auto max-h-[68vh] pr-1">
              @for (sc of scenes(); track sc.id; let idx = $index) {
                <div
                  (click)="activeSceneIndex.set(idx)"
                  class="flex flex-col gap-2.5 rounded-xl border p-3 transition cursor-pointer"
                  [ngClass]="idx === activeSceneIndex() ? 'border-secondary bg-surface-container-high' : 'border-overlay/[0.06] bg-surface-container-lowest hover:bg-surface-container-low'">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 font-mono text-xs font-bold text-secondary">
                        {{ idx + 1 }}
                      </span>
                      <input
                        [(ngModel)]="sc.label"
                        (blur)="persistScenes()"
                        class="bg-transparent font-medium text-label-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex items-center gap-2">
                      <select
                        [(ngModel)]="sc.mediaMode"
                        (ngModelChange)="persistScenes()"
                        class="rounded bg-surface-container px-2 py-0.5 text-xs text-on-surface">
                        <option value="ai_image">Ảnh AI</option>
                        <option value="ai_video">Video AI</option>
                        <option value="upload">Tải file</option>
                      </select>
                      <input
                        type="number"
                        [(ngModel)]="sc.durationSec"
                        (ngModelChange)="persistScenes()"
                        min="2"
                        max="30"
                        class="w-14 rounded bg-surface-container px-2 py-0.5 text-right font-mono text-xs text-on-surface" />
                      <span class="text-xs text-outline">giây</span>
                      <button
                        type="button"
                        (click)="removeScene(idx); $event.stopPropagation()"
                        class="text-xs text-error hover:underline">
                        ✕
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-2.5 md:grid-cols-[110px_1fr]">
                    <div class="relative h-24 w-full overflow-hidden rounded-lg bg-surface-container flex items-center justify-center">
                      @if (sc.mediaSource || sc.mediaPath) {
                        <img [src]="sc.mediaSource || sc.mediaPath" alt="" class="h-full w-full object-cover" />
                      } @else {
                        <span class="text-xs text-outline">Chưa có hình</span>
                      }
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <textarea
                        [(ngModel)]="sc.voiceover"
                        (blur)="persistScenes()"
                        rows="2"
                        placeholder="Lời bình / Thoại cảnh này…"
                        class="rounded-lg border border-overlay/[0.1] bg-surface-container px-2.5 py-1.5 text-body-sm text-on-surface"></textarea>
                      <input
                        [(ngModel)]="sc.mediaPrompt"
                        (blur)="persistScenes()"
                        placeholder="Prompt hình ảnh / chuyển động máy quay (tiếng Anh)…"
                        class="rounded-lg border border-overlay/[0.08] bg-surface-container px-2.5 py-1 font-mono text-[11px] text-on-surface-variant" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Column 3: Live Preview & Render -->
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex items-center justify-between border-b border-overlay/[0.06] pb-2">
              <h2 class="text-title-sm font-semibold text-on-surface">3. Xem Trước & Kết Xuất</h2>
              <span class="font-mono text-xs text-secondary">{{ project().aspect || '9:16' }}</span>
            </div>

            <!-- Phone / Monitor Preview Frame -->
            <div class="relative mx-auto flex aspect-[9/16] w-full max-w-[230px] flex-col justify-between overflow-hidden rounded-2xl border-2 border-overlay/[0.15] bg-black shadow-xl">
              @if (activeScene(); as sc) {
                @if (sc.mediaSource || sc.mediaPath) {
                  <img [src]="sc.mediaSource || sc.mediaPath" alt="" class="absolute inset-0 h-full w-full object-cover opacity-90" />
                }
                <div class="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-2.5 text-[11px] text-white">
                  <span>Cảnh {{ activeSceneIndex() + 1 }}/{{ scenes().length }}</span>
                  <span class="font-mono">{{ sc.durationSec }}s</span>
                </div>
                <div class="relative z-10 mt-auto bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 text-center">
                  <span class="inline-block rounded bg-amber-400 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-black shadow">
                    {{ sc.voiceover | slice:0:68 }}
                  </span>
                </div>
              } @else {
                <div class="flex h-full items-center justify-center text-xs text-white/60">
                  Chưa có cảnh
                </div>
              }
            </div>

            <!-- Render Estimate & Actions -->
            <div class="rounded-xl bg-surface-container-lowest p-3 text-xs text-on-surface-variant flex flex-col gap-1 border border-overlay/[0.06]">
              <div class="flex justify-between">
                <span>Encoder phần cứng:</span>
                <span class="font-mono text-on-surface">FFmpeg h264 + Karaoke ASS</span>
              </div>
              <div class="flex justify-between">
                <span>Chi phí ước tính:</span>
                <span class="font-mono text-tertiary">~$0.14 / bản dựng</span>
              </div>
              @if (latestJob()) {
                <div class="mt-1 border-t border-overlay/[0.06] pt-1.5 flex items-center justify-between text-tertiary">
                  <span>✓ {{ latestJob().stage }}</span>
                  <span class="font-mono">{{ latestJob().progress }}%</span>
                </div>
              }
            </div>

            <div class="mt-auto flex flex-col gap-2">
              <button
                type="button"
                [disabled]="rendering()"
                (click)="startRender()"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-label-md font-semibold text-surface hover:opacity-90 disabled:opacity-50">
                ▶ {{ rendering() ? 'Đang kết xuất MP4…' : 'Render Video MP4 (F9)' }}
              </button>
              <button
                type="button"
                (click)="sendToContent()"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high py-2 text-label-md font-medium text-on-surface hover:bg-surface-container-highest">
                📦 Lưu vào Kho nội dung
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- New Project Modal -->
    @if (newModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-md rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <h3 class="text-headline-sm font-semibold text-on-surface">Tạo dự án Video AI mới</h3>
          <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Chủ đề video
            <input [(ngModel)]="newTopic" placeholder="VD: 5 mẹo phối blazer công sở trẻ trung" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" (click)="newModalOpen.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="createNewProject()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">Tạo dự án</button>
          </div>
        </div>
      </div>
    }

    <!-- Render History Modal -->
    @if (historyOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">Lịch sử Render Video</h3>
            <button type="button" (click)="historyOpen.set(false)" class="text-on-surface-variant">✕</button>
          </div>
          <ul class="flex flex-col gap-2 max-h-80 overflow-y-auto">
            @for (j of renderJobs(); track j.id) {
              <li class="rounded-xl bg-surface-container p-3 flex items-center justify-between text-body-sm">
                <div>
                  <div class="font-medium text-on-surface">{{ j.stage || 'Bản kết xuất MP4' }}</div>
                  <div class="font-mono text-xs text-outline">{{ j.outputPath }} · {{ j.encoder }}</div>
                </div>
                <span class="rounded bg-tertiary/15 px-2 py-0.5 text-xs text-tertiary">{{ j.status }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class StudioPage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly projects = signal<any[]>([]);
  readonly selectedProjectId = signal<string | null>(null);
  readonly project = signal<any | null>(null);
  readonly scenes = signal<any[]>([]);
  readonly renderJobs = signal<any[]>([]);
  readonly activeSceneIndex = signal(0);
  readonly saveState = signal<'saved' | 'saving'>('saved');
  readonly generatingScript = signal(false);
  readonly rendering = signal(false);
  readonly toastMsg = signal('');

  readonly newModalOpen = signal(false);
  readonly historyOpen = signal(false);
  newTopic = '';

  readonly activeScene = computed(() => this.scenes()[this.activeSceneIndex()] || this.scenes()[0] || null);
  readonly totalDuration = computed(() => this.scenes().reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0));
  readonly latestJob = computed(() => this.renderJobs()[0] || null);

  async ngOnInit() {
    const qPid = this.route.snapshot.queryParamMap.get('project');
    if (qPid) this.selectedProjectId.set(qPid);
    await this.loadProjects();
  }

  async loadProjects() {
    const list = await this.api.invoke<any[]>('studio.projects', {});
    this.projects.set(list || []);
    const pid = this.selectedProjectId() || list?.[0]?.id || null;
    if (pid) {
      await this.selectProject(pid);
    } else {
      this.project.set(null);
      this.scenes.set([]);
    }
  }

  async selectProject(id: string) {
    this.selectedProjectId.set(id);
    const detail = await this.api.invoke<any>('studio.get', { id });
    this.project.set(detail);
    this.scenes.set(detail?.scenes || []);
    this.renderJobs.set(detail?.jobs || []);
    this.activeSceneIndex.set(0);
  }

  async saveProjectPatch(patch: any) {
    const p = this.project();
    if (!p) return;
    this.saveState.set('saving');
    const updated = await this.api.invoke<any>('studio.update', { id: p.id, patch });
    if (updated) this.project.set({ ...p, ...updated });
    this.saveState.set('saved');
  }

  async updateVisualBible(characterDesc: string) {
    const p = this.project();
    if (!p) return;
    await this.api.invoke('studio.updateBible', {
      projectId: p.id,
      bible: { characterDesc },
    });
  }

  async runTryOn() {
    const res = await this.api.invoke<any>('studio.tryOn', { projectId: this.project()?.id });
    if (res?.imageUrl) {
      this.toastMsg.set('Đã tạo ảnh thử đồ AI (Virtual Try-On) và đồng bộ vào cảnh đang chọn!');
    }
  }

  async generateScript() {
    const p = this.project();
    if (!p) return;
    this.generatingScript.set(true);
    try {
      const res = await this.api.invoke<any>('studio.generateScript', { projectId: p.id });
      if (res?.scenes) {
        this.scenes.set(res.scenes);
        this.toastMsg.set(`AI đã sinh ${res.scenes.length} phân cảnh kịch bản hoàn chỉnh!`);
      }
      await this.loadProjects();
    } finally {
      this.generatingScript.set(false);
    }
  }

  async persistScenes() {
    const p = this.project();
    if (!p) return;
    this.saveState.set('saving');
    await this.api.invoke('studio.saveScenes', {
      projectId: p.id,
      scenes: this.scenes(),
    });
    this.saveState.set('saved');
  }

  addScene() {
    const list = [...this.scenes()];
    list.push({
      id: `sc_local_${Date.now()}`,
      label: `Cảnh ${list.length + 1} – Phân cảnh mới`,
      voiceover: 'Nhập lời thoại hoặc thuyết minh cho phân cảnh này…',
      durationSec: 6,
      mediaMode: 'ai_image',
      mediaPrompt: 'Cinematic vertical shot, studio lighting, 4k photorealistic',
      mediaSource: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    });
    this.scenes.set(list);
    void this.persistScenes();
  }

  removeScene(index: number) {
    const list = this.scenes().filter((_, i) => i !== index);
    this.scenes.set(list);
    void this.persistScenes();
  }

  async exportPrompts() {
    const p = this.project();
    if (!p) return;
    const res = await this.api.invoke<any>('studio.promptExport', { projectId: p.id });
    const text = (res?.prompts || []).map((x: any) => `${x.scene}: ${x.prompt}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.toastMsg.set('Đã chép toàn bộ Prompt tiếng Anh của các phân cảnh vào clipboard!');
    } catch {
      this.toastMsg.set('Đã xuất danh sách prompt phân cảnh.');
    }
  }

  async startRender() {
    const p = this.project();
    if (!p) return;
    this.rendering.set(true);
    try {
      await this.persistScenes();
      const job = await this.api.invoke<any>('render.start', { projectId: p.id });
      this.renderJobs.set([job, ...this.renderJobs()]);
      this.toastMsg.set('Đã hoàn tất kết xuất MP4 1080p kèm phụ đề Karaoke!');
    } finally {
      this.rendering.set(false);
    }
  }

  async sendToContent() {
    const p = this.project();
    if (!p) return;
    await this.api.invoke('studio.toContent', { projectId: p.id });
    this.router.navigate(['/content']);
  }

  async createNewProject() {
    const created = await this.api.invoke<any>('studio.create', {
      topic: this.newTopic.trim() || 'Dự án Video AI mới',
    });
    this.newTopic = '';
    this.newModalOpen.set(false);
    if (created?.id) this.selectedProjectId.set(created.id);
    await this.loadProjects();
  }

  async deleteCurrentProject() {
    const p = this.project();
    if (!p) return;
    await this.api.invoke('studio.delete', { id: p.id });
    this.selectedProjectId.set(null);
    await this.loadProjects();
  }
}
export { StudioPage as StudioPageComponent };
