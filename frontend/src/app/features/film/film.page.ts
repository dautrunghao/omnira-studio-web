import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';

type FilmStepId = 'script' | 'character' | 'location' | 'shot' | 'video' | 'assemble';

@Component({
  selector: 'app-film-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!currentFilm()) {
      <!-- FILM LIST MODE -->
      <div class="o-page flex flex-col gap-space-md">
        <div class="flex flex-wrap items-center justify-between gap-space-sm">
          <h1 class="flex items-center gap-space-sm text-headline-sm font-semibold text-on-surface">
            <span class="text-secondary">🎞</span> Xưởng Phim AI
          </h1>
          <div class="flex flex-wrap gap-space-sm">
            <button
              type="button"
              (click)="goClone()"
              class="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-2 text-label-md font-medium text-on-surface hover:bg-surface-container-highest">
              📋 Clone video mẫu
            </button>
            <button
              type="button"
              (click)="newFilmModal.set(true)"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-label-md font-medium text-on-primary hover:opacity-90">
              ＋ Phim mới
            </button>
          </div>
        </div>

        @if (films().length === 0) {
          <div class="flex flex-col items-center gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-12 text-center">
            <span class="text-3xl text-outline">🎬</span>
            <p class="max-w-md text-body-md text-on-surface-variant">
              Chưa có phim nào. Tạo phim mới, nhập ý tưởng để AI viết kịch bản, rồi tạo nhân vật, bối cảnh và khung hình song song nhiều luồng.
            </p>
            <button
              type="button"
              (click)="newFilmModal.set(true)"
              class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">
              ＋ Tạo phim đầu tiên
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
            @for (f of films(); track f.id) {
              <button
                type="button"
                (click)="openFilm(f.id)"
                class="flex h-full flex-col overflow-hidden rounded-2xl border border-overlay/[0.08] bg-surface-container text-left transition hover:bg-surface-container-high hover:border-secondary/40">
                <div class="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-surface-container-lowest">
                  <img
                    src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80"
                    alt=""
                    class="h-full w-full object-cover opacity-85" />
                  <span class="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] text-white">
                    {{ f.aspect || '9:16' }} · {{ f.resolution || '1080p' }}
                  </span>
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-1 p-space-md">
                  <span class="truncate text-label-md font-semibold text-on-surface">{{ f.title }}</span>
                  <span class="line-clamp-2 min-h-[2.5em] text-label-sm text-on-surface-variant">
                    {{ f.idea || 'Chưa có kịch bản' }}
                  </span>
                  <span class="mt-auto truncate pt-2 font-mono text-[11px] text-outline">
                    {{ f.characterCount || 0 }} nhân vật · {{ f.locationCount || 0 }} bối cảnh · {{ f.shotCount || 0 }} cảnh · {{ f.targetDurationSec || 45 }}s
                  </span>
                </div>
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <!-- FILM WORKSPACE MODE (6 STEPS) -->
      <div class="o-page flex min-h-[calc(100vh-5.5rem)] flex-col gap-space-md">
        <!-- Workspace Top Bar -->
        <div class="flex flex-wrap items-center gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-sm pl-space-md">
          <button
            type="button"
            (click)="backToList()"
            class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-label-md text-on-surface hover:bg-surface-container-highest"
            title="Về danh sách phim">
            ← Danh sách
          </button>

          <div class="min-w-0 flex-1">
            <h1 class="truncate text-headline-sm font-semibold text-on-surface">{{ currentFilm().title }}</h1>
          </div>

          <label class="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            Model Video
            <select
              [ngModel]="currentFilm().seedanceSource || 'seedance'"
              (ngModelChange)="updateFilmPatch({ seedanceSource: $event })"
              class="rounded-lg border border-overlay/[0.12] bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface">
              <option value="seedance">Seedance 2.0</option>
              <option value="veo">Veo 3.1 · Flow</option>
              <option value="kling">Kling 3.0</option>
              <option value="muse">Meta Muse AI</option>
              <option value="grok">Grok Imagine</option>
            </select>
          </label>

          <label class="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            Ảnh (Nano Banana)
            <span class="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Flow</span>
            <select
              class="rounded-lg border border-overlay/[0.12] bg-surface-container-low px-2 py-1 text-body-sm text-on-surface">
              <option value="google">Gemini 3.1 Flash</option>
              <option value="fal">Fal.ai</option>
            </select>
          </label>

          <label class="flex items-center gap-1 text-label-sm text-on-surface-variant">
            Luồng ảnh
            <select [(ngModel)]="imageConcurrency" class="rounded-lg border border-overlay/[0.12] bg-surface-container-low px-2 py-1 text-body-sm text-on-surface">
              @for (n of [1, 2, 3, 4]; track n) {
                <option [ngValue]="n">{{ n }}</option>
              }
            </select>
          </label>

          <label class="flex items-center gap-1 text-label-sm text-on-surface-variant">
            Luồng video
            <select [(ngModel)]="videoConcurrency" class="rounded-lg border border-overlay/[0.12] bg-surface-container-low px-2 py-1 text-body-sm text-on-surface">
              @for (n of [1, 2, 3, 4]; track n) {
                <option [ngValue]="n">{{ n }}</option>
              }
            </select>
          </label>

          <button
            type="button"
            (click)="deleteCurrentFilm()"
            class="rounded-lg bg-surface-container-high px-2.5 py-1.5 text-label-sm text-error hover:bg-error/20"
            title="Xóa phim">
            🗑
          </button>
        </div>

        <!-- 6-Step Navigation Pills -->
        <nav class="flex flex-wrap gap-1.5 rounded-xl bg-surface-container-low p-1.5 border border-overlay/[0.06]">
          @for (s of steps; track s.id; let i = $index) {
            <button
              type="button"
              (click)="activeStep.set(s.id)"
              class="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-label-md font-medium transition"
              [ngClass]="activeStep() === s.id ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:bg-surface-container-high'">
              <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] bg-black/20 font-mono">
                {{ i + 1 }}
              </span>
              <span>{{ s.label }}</span>
              @if (stepCount(s.id) !== null) {
                <span class="rounded bg-black/20 px-1.5 py-0.2 font-mono text-[10px]">
                  {{ stepCount(s.id) }}
                </span>
              }
            </button>
          }
        </nav>

        @if (toastMsg()) {
          <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
            <span>{{ toastMsg() }}</span>
            <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
          </div>
        }

        <!-- Step Content -->
        <div class="min-h-0 flex-1">
          @switch (activeStep()) {
            @case ('script') {
              <div class="grid grid-cols-1 gap-space-md xl:grid-cols-[380px_1fr]">
                <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
                  <h2 class="text-title-sm font-semibold text-on-surface">Ý tưởng & Phong cách Phim</h2>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Tên phim
                    <input
                      [(ngModel)]="currentFilm().title"
                      (blur)="updateFilmPatch({ title: currentFilm().title })"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface" />
                  </label>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Cốt truyện / Ý tưởng chi tiết
                    <textarea
                      [(ngModel)]="currentFilm().idea"
                      (blur)="updateFilmPatch({ idea: currentFilm().idea })"
                      rows="5"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface"></textarea>
                  </label>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Style Prompt (Điện ảnh / Ánh sáng / Ống kính)
                    <textarea
                      [(ngModel)]="currentFilm().stylePrompt"
                      (blur)="updateFilmPatch({ stylePrompt: currentFilm().stylePrompt })"
                      rows="2"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 font-mono text-xs text-on-surface"></textarea>
                  </label>
                  <div class="grid grid-cols-2 gap-2.5">
                    <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                      Khung hình
                      <select
                        [(ngModel)]="currentFilm().aspect"
                        (ngModelChange)="updateFilmPatch({ aspect: $event })"
                        class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                        <option value="9:16">9:16 Dọc</option>
                        <option value="16:9">16:9 Ngang</option>
                      </select>
                    </label>
                    <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                      Thời lượng
                      <select
                        [(ngModel)]="currentFilm().targetDurationSec"
                        (ngModelChange)="updateFilmPatch({ targetDurationSec: +$event })"
                        class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                        <option [ngValue]="30">30 giây</option>
                        <option [ngValue]="45">45 giây</option>
                        <option [ngValue]="60">60 giây</option>
                        <option [ngValue]="120">120 giây</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    [disabled]="busyGenerating()"
                    (click)="generateFilmScript()"
                    class="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                    ✨ {{ busyGenerating() ? 'AI đang viết kịch bản…' : 'AI Viết Kịch Bản & Bóc Tách Nhân Vật / Cảnh' }}
                  </button>
                </div>

                <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
                  <div class="flex items-center justify-between">
                    <h2 class="text-title-sm font-semibold text-on-surface">
                      Tổng quan Bóc tách Kịch bản ({{ currentFilm().shots?.length || 0 }} cảnh quay)
                    </h2>
                    <button
                      type="button"
                      (click)="activeStep.set('character')"
                      class="rounded-lg bg-secondary px-3 py-1.5 text-label-sm font-semibold text-surface">
                      Tiếp tục: Bảng Nhân vật →
                    </button>
                  </div>

                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div class="rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                      <div class="text-label-sm font-semibold uppercase text-secondary">
                        👤 Nhân vật ({{ currentFilm().characters?.length || 0 }})
                      </div>
                      <ul class="mt-2 flex flex-col gap-1.5 text-body-sm">
                        @for (c of currentFilm().characters; track c.id) {
                          <li class="flex items-center justify-between">
                            <span class="font-medium text-on-surface">{{ c.name }}</span>
                            <span class="text-xs text-outline">{{ c.role }}</span>
                          </li>
                        }
                      </ul>
                    </div>

                    <div class="rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                      <div class="text-label-sm font-semibold uppercase text-primary">
                        🏛 Bối cảnh ({{ currentFilm().locations?.length || 0 }})
                      </div>
                      <ul class="mt-2 flex flex-col gap-1.5 text-body-sm">
                        @for (loc of currentFilm().locations; track loc.id) {
                          <li class="flex items-center justify-between">
                            <span class="font-medium text-on-surface">{{ loc.name }}</span>
                            <span class="text-xs text-outline">{{ loc.role }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  </div>

                  <div class="flex flex-col gap-2">
                    <div class="text-label-sm font-semibold uppercase text-on-surface-variant">Danh sách Phân cảnh (Shots)</div>
                    @for (sh of currentFilm().shots; track sh.id; let idx = $index) {
                      <div class="rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06] flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                          <span class="font-semibold text-label-md text-on-surface">#{{ idx + 1 }} · {{ sh.name }}</span>
                          <span class="font-mono text-xs text-secondary">{{ sh.role }} · {{ sh.durationSec || 6 }}s</span>
                        </div>
                        <p class="text-body-sm text-on-surface-variant">{{ sh.description }}</p>
                        @if (sh.dialogue) {
                          <div class="text-xs text-primary">💬 {{ sh.speaker || 'Thoại' }}: "{{ sh.dialogue }}"</div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @case ('character') {
              <ng-container *ngTemplateOutlet="assetBoardTpl; context: { kind: 'character', title: 'Bảng Nhân Vật Chuẩn (Character Sheets)', items: currentFilm().characters || [], mode: 'image' }"></ng-container>
            }

            @case ('location') {
              <ng-container *ngTemplateOutlet="assetBoardTpl; context: { kind: 'location', title: 'Bảng Bối Cảnh Điện Ảnh (Locations)', items: currentFilm().locations || [], mode: 'image' }"></ng-container>
            }

            @case ('shot') {
              <ng-container *ngTemplateOutlet="assetBoardTpl; context: { kind: 'shot', title: 'Khung Hình Đầu Cảnh (Keyframes / Storyboard)', items: currentFilm().shots || [], mode: 'image' }"></ng-container>
            }

            @case ('video') {
              <ng-container *ngTemplateOutlet="assetBoardTpl; context: { kind: 'shot', title: 'Quay Video AI Đa Luồng (Seedance 2.0 / Veo 3.1)', items: currentFilm().shots || [], mode: 'video' }"></ng-container>
            }

            @case ('assemble') {
              <!-- ASSEMBLE STEP -->
              <div class="grid grid-cols-1 gap-space-md xl:grid-cols-[1fr_360px]">
                <div class="flex flex-col gap-space-md">
                  <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-sm">
                    <h2 class="text-title-sm font-semibold text-on-surface">
                      Timeline Cảnh Quay Đã Có Video ({{ currentFilm().shots?.length || 0 }} cảnh)
                    </h2>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      @for (sh of currentFilm().shots; track sh.id; let idx = $index) {
                        <div class="rounded-xl bg-surface-container-lowest p-2.5 border border-overlay/[0.06] flex flex-col gap-2">
                          <div class="relative aspect-video overflow-hidden rounded-lg bg-black">
                            @if (sh.imageUrl) {
                              <img [src]="sh.imageUrl" alt="" class="h-full w-full object-cover" />
                            }
                            <span class="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                              Cảnh {{ idx + 1 }} · {{ sh.durationSec || 6 }}s
                            </span>
                          </div>
                          <div class="text-label-sm font-medium text-on-surface truncate">{{ sh.name }}</div>
                          <div class="text-xs text-on-surface-variant line-clamp-2">{{ sh.dialogue || sh.description }}</div>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-sm">
                    <h2 class="text-title-sm font-semibold text-on-surface">
                      Bản Đã Ghép Hoàn Chỉnh ({{ currentFilm().renders?.length || 0 }})
                    </h2>
                    @if (!currentFilm().renders?.length) {
                      <p class="text-body-sm text-outline">Chưa có bản ghép nào – bấm "Ghép tập phim" ở cột bên phải.</p>
                    } @else {
                      <ul class="flex flex-col gap-2">
                        @for (r of currentFilm().renders; track r.id) {
                          <li class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                            <div>
                              <div class="font-semibold text-body-sm text-on-surface">{{ r.title }}</div>
                              <div class="font-mono text-xs text-outline">{{ r.resolution }} · {{ r.durationSec }}s · Hoàn tất</div>
                            </div>
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                (click)="renderToContent()"
                                class="rounded-lg bg-primary px-3 py-1.5 text-label-sm font-medium text-on-primary">
                                📅 Đưa vào Kho nội dung & Lên lịch
                              </button>
                            </div>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                </div>

                <!-- Right Assemble Controls -->
                <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md h-fit">
                  <h2 class="text-title-sm font-semibold text-on-surface">Tùy chọn Ghép Tập Phim</h2>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Chế độ Giọng Nhân Vật
                    <select
                      [(ngModel)]="currentFilm().voiceMode"
                      (ngModelChange)="updateFilmPatch({ voiceMode: $event })"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface">
                      <option value="tts_dialogue">Lồng tiếng TTS theo từng nhân vật</option>
                      <option value="clip">Giữ nguyên âm thanh gốc của clip AI</option>
                      <option value="convert">Đổi giọng ElevenLabs Speech-to-Speech</option>
                    </select>
                  </label>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Chuyển cảnh (Transition)
                    <select class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface">
                      <option value="cut">Cắt thẳng điện ảnh (Hard Cut)</option>
                      <option value="fade_black">Mờ qua đen (Fade through Black)</option>
                    </select>
                  </label>
                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Nhạc nền (Tự hạ âm lượng khi có thoại)
                    <select
                      [(ngModel)]="currentFilm().bgmTrack"
                      (ngModelChange)="updateFilmPatch({ bgmTrack: $event })"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface">
                      <option value="emotional-piano-warm.mp3">Emotional Piano Warm</option>
                      <option value="cinematic-strings-epic.mp3">Cinematic Strings Epic</option>
                      <option value="">Không nhạc nền</option>
                    </select>
                  </label>
                  <label class="flex items-center justify-between text-body-sm text-on-surface">
                    <span>Chèn Watermark thương hiệu Pocket</span>
                    <input type="checkbox" checked class="h-4 w-4 accent-secondary" />
                  </label>
                  <button
                    type="button"
                    [disabled]="busyGenerating()"
                    (click)="assembleFilm()"
                    class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-label-md font-semibold text-on-primary hover:opacity-90">
                    🎬 {{ busyGenerating() ? 'Đang ghép tập phim…' : 'Ghép Tập Phim Full HD (' + (currentFilm().shots?.length || 0) + ' cảnh)' }}
                  </button>
                  <p class="text-label-sm text-outline">
                    Ghép trên máy bằng FFmpeg (GPU nếu có) – không tốn phí AI. Có thể ghép lại nhiều lần với tùy chọn khác.
                  </p>
                </div>
              </div>
            }
          }
        </div>

        <!-- Reusable Asset Board Template for Character / Location / Shot / Video -->
        <ng-template #assetBoardTpl let-kind="kind" let-title="title" let-items="items" let-mode="mode">
          <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-title-sm font-semibold text-on-surface">{{ title }} ({{ items.length }})</h2>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="generateAllAssets(items, mode)"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-label-sm font-semibold text-on-primary">
                  ✨ Tạo đồng loạt {{ mode === 'video' ? 'Video AI' : 'Ảnh AI' }} ({{ items.length }})
                </button>
                <button
                  type="button"
                  (click)="addAsset(kind)"
                  class="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-medium text-on-surface">
                  ＋ Thêm {{ kind === 'character' ? 'nhân vật' : kind === 'location' ? 'bối cảnh' : 'cảnh quay' }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-space-md md:grid-cols-2 2xl:grid-cols-3">
              @for (a of items; track a.id; let idx = $index) {
                <div class="flex flex-col gap-2.5 rounded-xl border border-overlay/[0.08] bg-surface-container-lowest p-3">
                  <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                    @if (a.imageUrl) {
                      <img [src]="a.imageUrl" [alt]="a.name" class="h-full w-full object-cover" />
                    } @else {
                      <span class="text-xs text-white/60">Chưa tạo hình</span>
                    }
                    <span class="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white">
                      #{{ idx + 1 }} · {{ a.role || a.kind }}
                    </span>
                    <span class="absolute right-2 top-2 rounded bg-tertiary/80 px-2 py-0.5 text-[10px] font-semibold text-black">
                      {{ mode === 'video' ? (a.videoStatus === 'done' ? '✓ Đã có clip AI' : 'Chờ quay') : '✓ Hoàn tất' }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between gap-2">
                    <input
                      [(ngModel)]="a.name"
                      (blur)="saveAsset(a)"
                      class="min-w-0 flex-1 bg-transparent font-semibold text-label-md text-on-surface focus:outline-none" />
                    <button
                      type="button"
                      (click)="deleteAsset(a.id)"
                      class="text-xs text-error hover:underline">
                      Xóa
                    </button>
                  </div>

                  <textarea
                    [(ngModel)]="a.description"
                    (blur)="saveAsset(a)"
                    rows="2"
                    placeholder="Mô tả chi tiết tiếng Việt…"
                    class="rounded-lg border border-overlay/[0.1] bg-surface-container px-2.5 py-1.5 text-body-sm text-on-surface"></textarea>

                  <textarea
                    [(ngModel)]="a.prompt"
                    (blur)="saveAsset(a)"
                    rows="2"
                    placeholder="Prompt tiếng Anh chuẩn gửi cho AI…"
                    class="rounded-lg border border-overlay/[0.08] bg-surface-container px-2.5 py-1 font-mono text-[11px] text-on-surface-variant"></textarea>

                  <div class="mt-auto flex items-center justify-between pt-1">
                    <span class="font-mono text-[11px] text-outline">
                      Takes: {{ a.takes?.length || 1 }} bản
                    </span>
                    <button
                      type="button"
                      (click)="generateSingleAsset(a, mode)"
                      class="rounded-lg bg-secondary/20 px-3 py-1 text-label-sm font-semibold text-secondary hover:bg-secondary/30">
                      🪄 {{ mode === 'video' ? 'Quay Take Video mới' : 'Tạo Take Ảnh mới' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </ng-template>

        <!-- Sticky Bottom Queue Status Bar -->
        <div class="sticky bottom-0 flex flex-wrap items-center gap-x-space-lg gap-y-1 rounded-xl border border-overlay/[0.08] bg-surface-container px-space-md py-space-sm font-mono text-xs">
          <span class="text-on-surface-variant">Đang chạy: <strong class="text-on-surface">0</strong></span>
          <span class="text-on-surface-variant">Chờ: <strong class="text-on-surface">0</strong></span>
          <span class="text-on-surface-variant">
            Xong: <strong class="text-tertiary">{{ (currentFilm().assets?.length || 0) }}</strong>
          </span>
          <span class="text-on-surface-variant">
            Luồng song song: <strong class="text-secondary">{{ imageConcurrency }} ảnh / {{ videoConcurrency }} video</strong>
          </span>
          <span class="ml-auto text-on-surface-variant">
            Chi phí ước tính dự án: <strong class="text-warning">$0.87</strong>
          </span>
        </div>
      </div>
    }

    <!-- New Film Modal -->
    @if (newFilmModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="w-full max-w-xl rounded-2xl border border-overlay/[0.12] bg-surface-container-high p-space-lg shadow-2xl flex flex-col gap-space-md">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-semibold text-on-surface">Tạo Dự Án Phim AI Mới</h3>
            <button type="button" (click)="newFilmModal.set(false)" class="text-on-surface-variant">✕</button>
          </div>
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Tên phim
              <input [(ngModel)]="newFilmForm.title" placeholder="VD: Chuyện Tình Quán Cà Phê Mưa" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface" />
            </label>
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Ý tưởng / Cốt truyện
              <textarea [(ngModel)]="newFilmForm.idea" rows="4" placeholder="Mô tả cốt truyện, nhân vật, bối cảnh và thông điệp…" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-2 text-body-sm text-on-surface"></textarea>
            </label>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Khung hình
                <select [(ngModel)]="newFilmForm.aspect" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-2.5 py-2 text-body-sm text-on-surface">
                  <option value="9:16">9:16 Dọc</option>
                  <option value="16:9">16:9 Ngang</option>
                </select>
              </label>
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Thời lượng
                <select [(ngModel)]="newFilmForm.targetDurationSec" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-2.5 py-2 text-body-sm text-on-surface">
                  <option [ngValue]="30">30 giây</option>
                  <option [ngValue]="60">60 giây</option>
                  <option [ngValue]="120">120 giây</option>
                </select>
              </label>
              <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                Model Video
                <select [(ngModel)]="newFilmForm.videoEngine" class="rounded-lg border border-overlay/[0.12] bg-surface-container px-2.5 py-2 text-body-sm text-on-surface">
                  <option value="seedance">Seedance 2.0</option>
                  <option value="veo">Google Veo 3.1</option>
                  <option value="kling">Kling 3.0</option>
                </select>
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="newFilmModal.set(false)" class="rounded-lg bg-surface-container px-4 py-2 text-label-md text-on-surface">Hủy</button>
            <button type="button" (click)="createFilm()" class="rounded-lg bg-primary px-4 py-2 text-label-md font-medium text-on-primary">＋ Tạo phim</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FilmPage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly films = signal<DynamicEntity[]>([]);
  readonly currentFilm = signal<DynamicEntity | null>(null);
  readonly activeStep = signal<FilmStepId>('script');
  readonly busyGenerating = signal(false);
  readonly toastMsg = signal('');
  readonly newFilmModal = signal(false);

  imageConcurrency = 4;
  videoConcurrency = 2;

  readonly steps: { id: FilmStepId; label: string }[] = [
    { id: 'script', label: 'Kịch bản' },
    { id: 'character', label: 'Nhân vật' },
    { id: 'location', label: 'Bối cảnh' },
    { id: 'shot', label: 'Khung hình' },
    { id: 'video', label: 'Video' },
    { id: 'assemble', label: 'Ghép tập' },
  ];

  newFilmForm = {
    title: '',
    idea: '',
    aspect: '9:16',
    targetDurationSec: 60,
    videoEngine: 'seedance',
  };

  async ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        await this.loadFilmDetail(id);
      } else {
        this.currentFilm.set(null);
        await this.loadFilmList();
      }
    });
  }

  async loadFilmList() {
    const list = await this.api.invoke<DynamicEntity[]>('film.list', {});
    this.films.set(list || []);
  }

  async loadFilmDetail(id: string) {
    const detail = await this.api.invoke<DynamicEntity>('film.get', { id });
    this.currentFilm.set(detail);
  }

  stepCount(step: FilmStepId): string | null {
    const f = this.currentFilm();
    if (!f) return null;
    if (step === 'character') return `${f.characters?.length || 0}`;
    if (step === 'location') return `${f.locations?.length || 0}`;
    if (step === 'shot' || step === 'video') return `${f.shots?.length || 0}`;
    if (step === 'assemble') return `${f.renders?.length || 0}`;
    return null;
  }

  openFilm(id: string) {
    this.router.navigate(['/film', id]);
  }

  backToList() {
    this.router.navigate(['/film']);
  }

  goClone() {
    this.router.navigate(['/clone']);
  }

  async createFilm() {
    const created = await this.api.invoke<DynamicEntity>('film.create', {
      title: this.newFilmForm.title.trim() || 'Phim AI Mới',
      idea: this.newFilmForm.idea,
      aspect: this.newFilmForm.aspect,
      targetDurationSec: this.newFilmForm.targetDurationSec,
    });
    this.newFilmModal.set(false);
    if (created?.id) {
      this.router.navigate(['/film', created.id]);
    }
  }

  async updateFilmPatch(patch: DynamicEntity) {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.update', { id: f.id, patch });
  }

  async deleteCurrentFilm() {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.delete', { id: f.id });
    this.router.navigate(['/film']);
  }

  async generateFilmScript() {
    const f = this.currentFilm();
    if (!f) return;
    this.busyGenerating.set(true);
    try {
      const updated = await this.api.invoke<DynamicEntity>('film.generateScript', { id: f.id });
      this.currentFilm.set(updated);
      this.toastMsg.set('AI đã viết kịch bản và tách sẵn Nhân vật, Bối cảnh, Phân cảnh!');
    } finally {
      this.busyGenerating.set(false);
    }
  }

  async addAsset(kind: string) {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.saveAsset', {
      filmId: f.id,
      kind,
      name: kind === 'character' ? 'Nhân vật mới' : kind === 'location' ? 'Bối cảnh mới' : 'Cảnh quay mới',
      role: kind === 'shot' ? 'Medium Shot' : 'Supporting',
      description: 'Mô tả chi tiết…',
      prompt: 'Cinematic 35mm shot, warm natural light, photorealistic',
    });
    await this.loadFilmDetail(f.id);
  }

  async saveAsset(asset: DynamicEntity) {
    await this.api.invoke('film.saveAsset', asset);
  }

  async deleteAsset(assetId: string) {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.deleteAsset', { id: assetId });
    await this.loadFilmDetail(f.id);
  }

  async generateSingleAsset(asset: DynamicEntity, mode: 'image' | 'video') {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.generate', { assetId: asset.id, mode });
    this.toastMsg.set(`Đã tạo xong Take ${mode === 'video' ? 'Video AI' : 'Ảnh AI'} mới cho "${asset.name}"!`);
    await this.loadFilmDetail(f.id);
  }

  async generateAllAssets(items: DynamicEntity[], mode: 'image' | 'video') {
    const f = this.currentFilm();
    if (!f) return;
    for (const a of items) {
      await this.api.invoke('film.generate', { assetId: a.id, mode });
    }
    this.toastMsg.set(`Đã chạy xong hàng đợi tạo ${items.length} ${mode === 'video' ? 'Video AI' : 'Ảnh AI'}!`);
    await this.loadFilmDetail(f.id);
  }

  async assembleFilm() {
    const f = this.currentFilm();
    if (!f) return;
    this.busyGenerating.set(true);
    try {
      await this.api.invoke('film.assemble', { filmId: f.id });
      this.toastMsg.set('Đã ghép tập phim Full HD hoàn tất!');
      await this.loadFilmDetail(f.id);
    } finally {
      this.busyGenerating.set(false);
    }
  }

  async renderToContent() {
    const f = this.currentFilm();
    if (!f) return;
    await this.api.invoke('film.renderToContent', { filmId: f.id });
    this.router.navigate(['/content']);
  }
}
export { FilmPage as FilmPageComponent };
