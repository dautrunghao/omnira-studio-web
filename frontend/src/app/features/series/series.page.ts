import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-series-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page"><div class="grid grid-cols-1 gap-space-md xl:grid-cols-[290px_1fr]">
      <!-- Left sidebar: Series list -->
      <div class="flex flex-col gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div class="flex items-center justify-between">
          <h1 class="flex items-center gap-space-sm text-headline-sm text-on-surface font-semibold">
            <span class="text-secondary">📚</span> Series AI
          </h1>
          <button
            type="button"
            (click)="openSeriesDialog('new')"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-md font-medium text-on-primary hover:opacity-90 transition">
            <span>＋</span> Tạo
          </button>
        </div>

        @if (seriesList().length === 0) {
          <p class="rounded-lg bg-surface-container-lowest p-space-sm text-body-sm text-on-surface-variant">
            Chưa có series. Tạo series để AI dựng nhân vật cố định và viết kịch bản từng tập phim ngắn.
          </p>
        }

        <ul class="flex flex-col gap-1">
          @for (item of seriesList(); track item.id) {
            <li>
              <button
                type="button"
                (click)="selectSeries(item.id)"
                class="w-full rounded-xl px-space-sm py-2.5 text-left transition"
                [ngClass]="item.id === selectedId() ? 'bg-surface-container-high border border-secondary/40' : 'hover:bg-surface-container-low border border-transparent'">
                <div class="truncate text-label-md font-medium text-on-surface">{{ item.title }}</div>
                <div class="mt-0.5 text-label-sm text-on-surface-variant">
                  {{ item.productionMode === 'film' || item.productionMode === 'film_ai' ? '🎞 Phim · ' : '🎬 Video · ' }}
                  {{ item.genre ? item.genre + ' · ' : '' }}
                  {{ item.episodeCount || 0 }} tập · {{ item.characterCount || 0 }} nhân vật
                </div>
              </button>
            </li>
          }
        </ul>
      </div>

      <!-- Right content: Series details -->
      @if (!currentSeries()) {
        <div class="flex min-h-[340px] items-center justify-center rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-xl text-body-sm text-on-surface-variant">
          Chọn hoặc tạo một series ở cột bên trái để bắt đầu
        </div>
      } @else {
        <div class="flex min-w-0 flex-col gap-space-md">
          <!-- Series Header Card -->
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex flex-wrap items-start justify-between gap-space-md">
              <div class="min-w-0 flex-1">
                <h2 class="text-headline-md font-semibold text-on-surface">{{ currentSeries().title }}</h2>
                <p class="mt-1 whitespace-pre-line text-body-sm text-on-surface-variant">
                  {{ currentSeries().logline || 'Chưa có tóm tắt logline' }}
                </p>
                <div class="mt-2.5 flex flex-wrap gap-1.5">
                  <span class="rounded-md bg-secondary/15 px-2.5 py-0.5 text-label-sm font-medium text-secondary">
                    {{ currentSeries().productionMode === 'film' || currentSeries().productionMode === 'film_ai' ? '🎞 Xưởng Phim AI' : '🎬 Xưởng Video AI' }}
                  </span>
                  @if (currentSeries().genre) {
                    <span class="rounded-md bg-surface-container-high px-2.5 py-0.5 text-label-sm text-on-surface">
                      {{ currentSeries().genre }}
                    </span>
                  }
                  <span class="rounded-md bg-surface-container-high px-2.5 py-0.5 font-mono text-label-sm text-on-surface">
                    {{ currentSeries().episodeLengthSec || 60 }}s/tập
                  </span>
                  @if (currentSeries().visualStyle) {
                    <span class="rounded-md bg-primary/15 px-2.5 py-0.5 text-label-sm text-primary">
                      🎨 {{ currentSeries().visualStyle | slice:0:55 }}
                    </span>
                  }
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  (click)="openSeriesDialog('edit')"
                  class="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm text-on-surface hover:bg-surface-container-highest">
                  ✏️ Sửa
                </button>
                <button
                  type="button"
                  (click)="deleteSeries()"
                  class="inline-flex items-center gap-1 rounded-lg bg-error/15 px-3 py-1.5 text-label-sm text-error hover:bg-error/25">
                  🗑 Xóa
                </button>
              </div>
            </div>

            <!-- Action bar: Narrator voice + AI Develop -->
            <div class="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm border border-overlay/[0.05]">
              <div class="flex items-center gap-2">
                <span class="text-body-sm text-on-surface-variant">Giọng người dẫn:</span>
                <select
                  [ngModel]="currentSeries().narratorVoiceId || 'vi-VN-HoaiMy'"
                  (ngModelChange)="updateNarratorVoice($event)"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container px-2.5 py-1.5 text-body-sm text-on-surface">
                  @for (v of voices(); track v.id) {
                    <option [value]="v.id">{{ v.label }}</option>
                  }
                </select>
              </div>

              <span class="text-label-sm text-on-surface-variant hidden md:inline">
                · Mỗi tập dùng bảng nhân vật chuẩn xuyên suốt cả mùa phim.
              </span>

              <div class="ml-auto flex items-center gap-2">
                <select
                  [(ngModel)]="developCount"
                  class="rounded-lg border border-overlay/[0.12] bg-surface-container px-2.5 py-1.5 text-body-sm text-on-surface">
                  @for (n of [3, 5, 10, 15, 20, 30]; track n) {
                    <option [ngValue]="n">{{ n }} tập</option>
                  }
                </select>
                <button
                  type="button"
                  [disabled]="developing()"
                  (click)="developSeries()"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50">
                  <span>✨</span>
                  {{ developing() ? 'AI đang viết…' : (currentSeries().episodes?.length ? 'AI viết thêm tập' : 'AI phát triển series') }}
                </button>
              </div>
            </div>

            @if (toastMsg()) {
              <div class="rounded-lg bg-tertiary/15 px-3 py-2 text-label-md text-tertiary flex items-center justify-between">
                <span>{{ toastMsg() }}</span>
                <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
              </div>
            }
          </div>

          <!-- Characters Section -->
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex flex-wrap items-center gap-space-sm">
              <h3 class="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Nhân vật ({{ currentSeries().characters?.length || 0 }})
              </h3>
              @if (currentSeries().characters?.length) {
                <button
                  type="button"
                  (click)="generateAllCharacterSheets()"
                  class="inline-flex items-center gap-1 rounded-lg bg-secondary/15 px-2.5 py-1 text-label-sm font-medium text-secondary hover:bg-secondary/25">
                  🖼 Tạo bảng nhân vật AI đồng loạt
                </button>
              }
              <button
                type="button"
                (click)="openCharDialog(null)"
                class="ml-auto inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-highest">
                ＋ Thêm nhân vật
              </button>
            </div>

            @if (!currentSeries().characters?.length) {
              <p class="text-body-sm text-outline">
                Bấm "AI phát triển series" để AI tạo dàn nhân vật, hoặc thêm thủ công.
              </p>
            }

            <div class="grid grid-cols-1 gap-space-md md:grid-cols-2 2xl:grid-cols-3">
              @for (c of currentSeries().characters; track c.id) {
                <div class="flex gap-space-md rounded-xl bg-surface-container-lowest p-space-sm border border-overlay/[0.06]">
                  <div class="group relative flex h-28 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container">
                    @if (c.referenceImage) {
                      <img
                        [src]="c.referenceImage"
                        [alt]="c.name"
                        (click)="zoomChar.set(c)"
                        class="h-full w-full cursor-zoom-in object-cover" />
                    } @else {
                      <span class="text-2xl text-outline">👤</span>
                    }
                  </div>

                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <div class="flex items-center justify-between gap-1">
                      <span class="truncate text-label-md font-semibold text-on-surface">{{ c.name }}</span>
                      @if (c.role) {
                        <span class="rounded bg-surface-container-high px-2 py-0.5 text-[11px] text-on-surface-variant truncate max-w-[55%]">
                          {{ c.role }}
                        </span>
                      }
                    </div>
                    <p class="line-clamp-2 text-label-sm text-on-surface-variant">
                      {{ c.appearance || 'Chưa mô tả ngoại hình' }}
                    </p>
                    <span class="text-label-sm text-outline">🎙 {{ c.voiceId || 'vi-VN-HoaiMy' }}</span>

                    <div class="mt-auto flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        (click)="generateCharImage(c)"
                        class="rounded bg-surface-container-high px-2 py-1 text-[11px] text-on-surface hover:bg-primary hover:text-on-primary transition">
                        🖼 Bảng nhân vật AI
                      </button>
                      <button
                        type="button"
                        (click)="copyCharPrompt(c)"
                        class="rounded bg-surface-container-high px-2 py-1 text-[11px] text-on-surface hover:bg-surface-container-highest">
                        📋 Chép prompt
                      </button>
                      <button
                        type="button"
                        (click)="openCharDialog(c)"
                        class="rounded bg-surface-container-high px-2 py-1 text-[11px] text-on-surface hover:bg-surface-container-highest">
                        ✏️
                      </button>
                      <button
                        type="button"
                        (click)="deleteCharacter(c.id)"
                        class="rounded bg-surface-container-high px-2 py-1 text-[11px] text-error hover:bg-error/20">
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Episodes Section -->
          <div class="flex flex-col gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex items-center justify-between">
              <h3 class="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Các tập ({{ currentSeries().episodes?.length || 0 }})
              </h3>
              <button
                type="button"
                (click)="openEpDialog(null)"
                class="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container-highest">
                ＋ Thêm tập
              </button>
            </div>

            @if (!currentSeries().episodes?.length) {
              <p class="text-body-sm text-outline">Chưa có tập nào.</p>
            }

            <ul class="flex flex-col gap-space-sm">
              @for (ep of currentSeries().episodes; track ep.id) {
                <li class="flex flex-wrap items-start gap-space-md rounded-xl bg-surface-container-lowest p-space-sm border border-overlay/[0.06]">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container font-mono text-label-md font-bold text-secondary">
                    #{{ ep.episodeNumber || ep.number || $index + 1 }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-space-sm">
                      <span class="text-label-md font-semibold text-on-surface">{{ ep.title }}</span>
                      <span
                        class="rounded-md px-2 py-0.5 text-[11px] font-medium"
                        [ngClass]="ep.status === 'completed' || ep.filmId ? 'bg-tertiary/15 text-tertiary' : 'bg-secondary/15 text-secondary'">
                        {{ ep.status === 'completed' || ep.filmId ? 'Đã dựng kịch bản' : 'Dàn ý' }}
                      </span>
                    </div>
                    <p class="mt-1 text-body-sm text-on-surface-variant">{{ ep.synopsis }}</p>
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center gap-1.5">
                    @if (ep.filmId) {
                      <button
                        type="button"
                        (click)="openFilm(ep.filmId)"
                        class="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm font-medium text-on-primary">
                        🎞 Mở trong Xưởng Phim
                      </button>
                    } @else {
                      <button
                        type="button"
                        (click)="makeEpisodeFilm(ep)"
                        class="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm font-medium text-on-primary hover:opacity-90">
                        🪄 Viết kịch bản & Dựng Phim
                      </button>
                    }
                    <button
                      type="button"
                      (click)="openEpDialog(ep)"
                      class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-label-sm text-on-surface">
                      ✏️
                    </button>
                    <button
                      type="button"
                      (click)="deleteEpisode(ep.id)"
                      class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-label-sm text-error">
                      🗑
                    </button>
                  </div>
                </li>
              }
            </ul>
          </div>
        </div>
      }
    </div>

    <!-- Series Create / Edit Modal -->
    @if (seriesModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-xl rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">
              {{ seriesForm.id ? 'Sửa Series AI' : 'Tạo Series AI mới' }}
            </h3>
            <button type="button" (click)="seriesModalOpen.set(false)" class="text-on-surface-variant hover:text-on-surface">✕</button>
          </div>
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tên Series
              <input [(ngModel)]="seriesForm.title" placeholder="VD: Nhật Ký Công Sở GenZ" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
            </label>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tóm tắt mạch truyện (Logline)
              <textarea [(ngModel)]="seriesForm.logline" rows="3" placeholder="Mô tả bối cảnh chính, xung đột và màu sắc câu chuyện…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Thể loại
                <input [(ngModel)]="seriesForm.genre" placeholder="Drama / Hài công sở / Cổ trang" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
              </label>
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Thời lượng mỗi tập (giây)
                <select [(ngModel)]="seriesForm.episodeLengthSec" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface">
                  <option [ngValue]="30">30 giây</option>
                  <option [ngValue]="60">60 giây (1 phút)</option>
                  <option [ngValue]="120">120 giây (2 phút)</option>
                  <option [ngValue]="180">180 giây (3 phút)</option>
                </select>
              </label>
            </div>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Phong cách hình ảnh (Visual Style)
              <input [(ngModel)]="seriesForm.visualStyle" placeholder="Cinematic 35mm film, warm lighting, shallow depth of field" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
            </label>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="seriesModalOpen.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="saveSeriesForm()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">Lưu Series</button>
          </div>
        </div>
      </div>
    }

    <!-- Character Modal -->
    @if (charModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">
              {{ charForm.id ? 'Sửa nhân vật' : 'Thêm nhân vật mới' }}
            </h3>
            <button type="button" (click)="charModalOpen.set(false)" class="text-on-surface-variant hover:text-on-surface">✕</button>
          </div>
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Tên nhân vật
                <input [(ngModel)]="charForm.name" placeholder="VD: Minh Anh" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
              </label>
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Vai trò
                <input [(ngModel)]="charForm.role" placeholder="Nữ chính / Phản diện" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
              </label>
            </div>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Mô tả ngoại hình cố định (tiếng Việt)
              <textarea [(ngModel)]="charForm.appearance" rows="3" placeholder="Tuổi, kiểu tóc, khuôn mặt, trang phục đặc trưng…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Prompt tiếng Anh chuẩn (Identity Prompt)
              <textarea [(ngModel)]="charForm.promptEn" rows="2" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 font-mono text-xs text-on-surface"></textarea>
            </label>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="charModalOpen.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="saveCharForm()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">Lưu nhân vật</button>
          </div>
        </div>
      </div>
    }

    <!-- Episode Modal -->
    @if (epModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">
              {{ epForm.id ? 'Sửa tập phim' : 'Thêm tập phim mới' }}
            </h3>
            <button type="button" (click)="epModalOpen.set(false)" class="text-on-surface-variant hover:text-on-surface">✕</button>
          </div>
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tiêu đề tập
              <input [(ngModel)]="epForm.title" placeholder="VD: Tập 3: Bức thư nặc danh" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
            </label>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tóm tắt nội dung tập (Synopsis)
              <textarea [(ngModel)]="epForm.synopsis" rows="4" placeholder="Diễn biến chính trong tập này…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="epModalOpen.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="saveEpForm()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">Lưu tập</button>
          </div>
        </div>
      </div>
    }

    <!-- Zoom Character Image Modal -->
    @if (zoomChar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" (click)="zoomChar.set(null)">
        <div class="max-w-3xl rounded-2xl bg-surface-container-high p-4" (click)="$event.stopPropagation()">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-title-sm font-semibold text-on-surface">Ảnh nhân vật: {{ zoomChar().name }}</span>
            <button type="button" (click)="zoomChar.set(null)" class="text-on-surface-variant">✕</button>
          </div>
          <img [src]="zoomChar().referenceImage" [alt]="zoomChar().name" class="max-h-[75vh] w-full rounded-xl object-contain" />
        </div>
      </div>
    }
    </div>
  `,
})
export class SeriesPage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly seriesList = signal<any[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly currentSeries = signal<any | null>(null);
  readonly voices = signal<any[]>([]);
  readonly developing = signal(false);
  readonly toastMsg = signal('');
  readonly zoomChar = signal<any | null>(null);

  developCount = 3;

  readonly seriesModalOpen = signal(false);
  seriesForm: any = {
    id: null,
    title: '',
    logline: '',
    genre: 'Drama / Storytelling',
    episodeLengthSec: 60,
    visualStyle: 'Cinematic 35mm film look, warm golden hour lighting',
    productionMode: 'film_ai',
  };

  readonly charModalOpen = signal(false);
  charForm: any = { id: null, name: '', role: '', appearance: '', promptEn: '' };

  readonly epModalOpen = signal(false);
  epForm: any = { id: null, title: '', synopsis: '' };

  async ngOnInit() {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) this.selectedId.set(qId);
    await this.loadList();
    const vList = await this.api.invoke<any[]>('media.voices', { provider: 'google_tts' }).catch(() => []);
    this.voices.set(vList || []);
  }

  async loadList() {
    const list = await this.api.invoke<any[]>('series.list', {});
    this.seriesList.set(list || []);
    const sel = this.selectedId() || list?.[0]?.id || null;
    if (sel) {
      await this.selectSeries(sel);
    } else {
      this.currentSeries.set(null);
    }
  }

  async selectSeries(id: string) {
    this.selectedId.set(id);
    const detail = await this.api.invoke<any>('series.get', { id });
    this.currentSeries.set(detail);
  }

  async updateNarratorVoice(voiceId: string) {
    const s = this.currentSeries();
    if (!s) return;
    await this.api.invoke('series.update', { id: s.id, patch: { narratorVoiceId: voiceId } });
    await this.selectSeries(s.id);
  }

  async developSeries() {
    const s = this.currentSeries();
    if (!s) return;
    this.developing.set(true);
    try {
      const res = await this.api.invoke<any>('series.develop', {
        id: s.id,
        episodes: this.developCount,
      });
      this.toastMsg.set(`AI đã phát triển thêm ${res?.addedEpisodes || this.developCount} tập mới cho "${s.title}"!`);
      await this.loadList();
    } finally {
      this.developing.set(false);
    }
  }

  openSeriesDialog(mode: 'new' | 'edit') {
    const s = this.currentSeries();
    if (mode === 'edit' && s) {
      this.seriesForm = {
        id: s.id,
        title: s.title,
        logline: s.logline || '',
        genre: s.genre || '',
        episodeLengthSec: s.episodeLengthSec || 60,
        visualStyle: s.visualStyle || '',
        productionMode: s.productionMode || 'film_ai',
      };
    } else {
      this.seriesForm = {
        id: null,
        title: '',
        logline: '',
        genre: 'Drama / Storytelling',
        episodeLengthSec: 60,
        visualStyle: 'Cinematic 35mm film look, warm golden hour lighting',
        productionMode: 'film_ai',
      };
    }
    this.seriesModalOpen.set(true);
  }

  async saveSeriesForm() {
    if (this.seriesForm.id) {
      await this.api.invoke('series.update', { id: this.seriesForm.id, patch: this.seriesForm });
      this.seriesModalOpen.set(false);
      await this.loadList();
    } else {
      const created = await this.api.invoke<any>('series.create', this.seriesForm);
      this.seriesModalOpen.set(false);
      if (created?.id) this.selectedId.set(created.id);
      await this.loadList();
    }
  }

  async deleteSeries() {
    const s = this.currentSeries();
    if (!s) return;
    await this.api.invoke('series.delete', { id: s.id });
    this.selectedId.set(null);
    await this.loadList();
  }

  openCharDialog(c: any | null) {
    if (c) {
      this.charForm = {
        id: c.id,
        name: c.name,
        role: c.role || '',
        appearance: c.appearance || '',
        promptEn: c.promptEn || '',
      };
    } else {
      this.charForm = {
        id: null,
        name: '',
        role: 'Nhân vật chính',
        appearance: '',
        promptEn: 'Vietnamese cinematic character portrait, 85mm lens, studio lighting',
      };
    }
    this.charModalOpen.set(true);
  }

  async saveCharForm() {
    const s = this.currentSeries();
    if (!s) return;
    await this.api.invoke('series.saveCharacter', {
      ...this.charForm,
      seriesId: s.id,
    });
    this.charModalOpen.set(false);
    await this.loadList();
  }

  async deleteCharacter(id: string) {
    await this.api.invoke('series.deleteCharacter', { id });
    await this.loadList();
  }

  async generateCharImage(c: any) {
    await this.api.invoke('series.characterImage', { id: c.id });
    this.toastMsg.set(`Đã cập nhật bảng nhân vật AI cho "${c.name}".`);
    await this.loadList();
  }

  async generateAllCharacterSheets() {
    const chars = this.currentSeries()?.characters || [];
    for (const c of chars) {
      await this.api.invoke('series.characterImage', { id: c.id });
    }
    this.toastMsg.set(`Đã tạo xong bảng nhân vật AI cho ${chars.length} nhân vật.`);
    await this.loadList();
  }

  async copyCharPrompt(c: any) {
    const text = c.promptEn || c.appearance || c.name;
    try {
      await navigator.clipboard.writeText(text);
      this.toastMsg.set(`Đã chép prompt chuẩn của nhân vật "${c.name}" vào clipboard.`);
    } catch {
      this.toastMsg.set(`Prompt của ${c.name}: ${text}`);
    }
  }

  openEpDialog(ep: any | null) {
    if (ep) {
      this.epForm = { id: ep.id, title: ep.title, synopsis: ep.synopsis || '' };
    } else {
      const nextNum = (this.currentSeries()?.episodes?.length || 0) + 1;
      this.epForm = { id: null, title: `Tập ${nextNum}: `, synopsis: '' };
    }
    this.epModalOpen.set(true);
  }

  async saveEpForm() {
    const s = this.currentSeries();
    if (!s) return;
    await this.api.invoke('series.saveEpisode', {
      ...this.epForm,
      seriesId: s.id,
    });
    this.epModalOpen.set(false);
    await this.loadList();
  }

  async deleteEpisode(id: string) {
    await this.api.invoke('series.deleteEpisode', { id });
    await this.loadList();
  }

  async makeEpisodeFilm(ep: any) {
    const res = await this.api.invoke<any>('series.makeFilm', { episodeId: ep.id });
    await this.loadList();
    if (res?.filmId) {
      this.router.navigate(['/film', res.filmId]);
    }
  }

  openFilm(filmId: string) {
    this.router.navigate(['/film', filmId]);
  }
}
export { SeriesPage as SeriesPageComponent };
