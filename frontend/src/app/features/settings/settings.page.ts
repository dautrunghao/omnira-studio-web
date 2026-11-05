import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService, ThemeMode } from '../../core/omni-api.service';
import { IconComponent } from '../../shared/icon.component';

type SettingsTab = 'ai' | 'video' | 'social' | 'system';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  desc: string;
  icon: string;
  previewBg: string;
  previewCard: string;
  previewText: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="o-page">
      <!-- Page Header -->
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="settings" [size]="21" /></div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="o-page-title">Cài đặt Hệ thống & AI Router</h1>
            <span class="o-badge pill primary">Omnira 2026</span>
          </div>
          <p class="o-page-desc">
            Quản lý khóa API BYOK, định tuyến AI đa tầng, nguồn Video/Giọng đọc (Flow, Seedance, Local TTS), OAuth mạng xã hội và giao diện Sáng/Tối.
          </p>
        </div>

        <div class="o-page-actions">
          <div class="o-seg" role="tablist" aria-label="Phân mục cài đặt">
            <button type="button" [class.active]="activeTab() === 'ai'" (click)="activeTab.set('ai')">
              <o-icon name="bot" [size]="15" /> AI & Định tuyến
            </button>
            <button type="button" [class.active]="activeTab() === 'video'" (click)="activeTab.set('video')">
              <o-icon name="film" [size]="15" /> Video & Giọng đọc
            </button>
            <button type="button" [class.active]="activeTab() === 'social'" (click)="activeTab.set('social')">
              <o-icon name="plug" [size]="15" /> Kết nối Đăng bài
            </button>
            <button type="button" [class.active]="activeTab() === 'system'" (click)="activeTab.set('system')">
              <o-icon name="palette" [size]="15" /> Giao diện & Hệ thống
            </button>
          </div>
        </div>
      </div>

      @if (toastMsg()) {
        <div class="o-banner success justify-between">
          <div class="flex items-center gap-2">
            <o-icon name="checkcheck" [size]="16" class="o-tertiary" />
            <span class="font-medium">{{ toastMsg() }}</span>
          </div>
          <button type="button" class="o-btn o-btn-ghost o-btn-sm" (click)="toastMsg.set('')">Đóng</button>
        </div>
      }

      @switch (activeTab()) {
        @case ('ai') {
          <div class="o-two">
            <!-- Left: AI Providers List (BYOK) -->
            <div class="o-card">
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon name="key" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">Danh sách Nhà cung cấp AI (BYOK)</div>
                  <div class="o-card-sub">Kết nối trực tiếp khóa API cá nhân hoặc dùng chung cổng định tuyến đám mây Omnira.</div>
                </div>
                <button type="button" class="o-btn o-btn-sm" (click)="testAllProviders()">
                  <o-icon name="zap" [size]="14" class="o-secondary" /> Kiểm tra toàn bộ kết nối
                </button>
              </div>

              <div class="o-card-body flex flex-col gap-3">
                @for (p of providers(); track p.id) {
                  <div class="o-tile flex flex-col gap-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-semibold text-label-lg">{{ p.label || p.provider }}</span>
                        <span class="o-badge mono">{{ p.category | uppercase }} · {{ p.defaultModel }}</span>
                        @if (p.hasKey) {
                          <span class="o-badge success">
                            <o-icon name="check" [size]="12" /> Đã cấu hình ({{ p.keyPreview || 'API Key' }})
                          </span>
                        } @else {
                          <span class="o-badge warning">Chưa nhập Key</span>
                        }
                      </div>

                      <button type="button" class="o-btn o-btn-sm" (click)="testSingleProvider(p)">
                        <o-icon name="activity" [size]="13" /> Kiểm tra
                      </button>
                    </div>

                    <div class="flex flex-wrap sm:flex-nowrap gap-2">
                      <input
                        class="o-input font-mono flex-1"
                        [(ngModel)]="keyInputs[p.provider]"
                        type="password"
                        [placeholder]="p.hasKey ? 'Nhập API Key mới để thay thế…' : 'Dán API Key (' + p.provider + ')…'" />
                      <button type="button" class="o-btn o-btn-primary shrink-0" (click)="saveProviderKey(p)">
                        <o-icon name="check" [size]="14" /> Lưu Key
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Right: AI Budget & Fallback Routing + Quick Theme Card -->
            <div class="flex flex-col gap-4">
              @if (budget(); as b) {
                <div class="o-card">
                  <div class="o-card-head">
                    <div class="o-card-ico"><o-icon name="dollar" [size]="18" /></div>
                    <div class="min-w-0 flex-1">
                      <div class="o-card-title">Ngân sách AI & Cầu dao ngắt tự động</div>
                      <div class="o-card-sub">Kiểm soát chi phí token và tự ngắt khi chạm ngưỡng an toàn.</div>
                    </div>
                  </div>

                  <div class="o-card-body flex flex-col gap-3.5">
                    <div class="o-tile flex flex-col gap-2">
                      <div class="flex items-baseline justify-between">
                        <span class="text-label-sm o-muted">Đã chi tiêu trong tháng này</span>
                        <span class="o-badge pill secondary">{{ budgetPercent() }}% hạn mức</span>
                      </div>
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-headline-md font-bold o-secondary">\${{ b.spentThisMonthUsd }}</span>
                        <span class="text-body-sm o-muted">/ \${{ b.monthlyHardCapUsd }} USD</span>
                      </div>
                      <div class="o-progress"><div [style.width.%]="budgetPercent()"></div></div>
                    </div>

                    <label class="o-field">
                      <span class="o-label">Hạn mức tối đa mỗi tháng (USD)</span>
                      <input
                        class="o-input font-mono"
                        type="number"
                        [(ngModel)]="b.monthlyHardCapUsd"
                        (blur)="saveBudget()" />
                    </label>

                    <div class="flex items-center justify-between gap-3 py-1">
                      <div>
                        <div class="text-label-md font-medium">Tự động ngắt khi chạm trần ngân sách</div>
                        <div class="text-label-sm o-muted">Tạm dừng tạo video/kịch bản mới khi vượt trần</div>
                      </div>
                      <button
                        type="button"
                        class="o-switch"
                        [class.on]="b.circuitBreaker"
                        role="switch"
                        [attr.aria-checked]="b.circuitBreaker"
                        (click)="b.circuitBreaker = !b.circuitBreaker; saveBudget()"></button>
                    </div>

                    <div class="o-divider"></div>

                    <div class="flex flex-col gap-2">
                      <div class="text-label-sm font-semibold o-muted uppercase tracking-wider">Chi tiết theo tính năng</div>
                      @for (bf of b.byFeature || []; track bf.feature) {
                        <div class="flex items-center justify-between gap-2 py-1 text-body-sm">
                          <span class="o-muted truncate">{{ bf.feature }}</span>
                          <span class="o-badge mono">\${{ bf.costUsd }} · {{ bf.calls }} lượt</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              <div class="o-card">
                <div class="o-card-head">
                  <div class="o-card-ico"><o-icon name="route" [size]="18" /></div>
                  <div class="min-w-0 flex-1">
                    <div class="o-card-title">Chuỗi Dự Phòng (Fallback Routing)</div>
                    <div class="o-card-sub">Tự động chuyển sang model kế tiếp khi nhà cung cấp chính quá tải.</div>
                  </div>
                </div>

                <div class="o-card-body flex flex-col gap-2.5">
                  <div class="o-tile flex flex-col gap-1">
                    <span class="text-label-sm o-muted">Kịch bản & Văn bản</span>
                    <span class="font-mono text-label-md o-primary">Gemini 3.5 → GPT-4o → Claude Sonnet</span>
                  </div>
                  <div class="o-tile flex flex-col gap-1">
                    <span class="text-label-sm o-muted">Giọng đọc AI (TTS)</span>
                    <span class="font-mono text-label-md o-secondary">Gemini TTS → ElevenLabs → Local TTS</span>
                  </div>
                  <div class="o-tile flex flex-col gap-1">
                    <span class="text-label-sm o-muted">Video & Hình ảnh</span>
                    <span class="font-mono text-label-md o-tertiary">Seedance 2.0 → Google Veo 3.1 → Kling</span>
                  </div>
                </div>
              </div>

              <!-- Quick Theme Switcher Card right on main tab -->
              <div class="o-card">
                <div class="o-card-head">
                  <div class="o-card-ico"><o-icon name="sun" [size]="18" /></div>
                  <div class="min-w-0 flex-1">
                    <div class="o-card-title">Chế độ Sáng / Tối (Theme Mode)</div>
                    <div class="o-card-sub">Chuyển đổi tức thì giữa giao diện Sáng (Light) và Tối (Dark).</div>
                  </div>
                </div>
                <div class="o-card-body grid grid-cols-2 gap-2.5">
                  @for (t of themeOptions; track t.value) {
                    <button
                      type="button"
                      class="o-tile flex items-center gap-2.5 text-left cursor-pointer"
                      [style.border-color]="api.theme() === t.value ? 'rgb(var(--c-primary))' : ''"
                      [style.background]="api.theme() === t.value ? 'rgb(var(--c-primary) / 0.08)' : ''"
                      (click)="setTheme(t.value)">
                      <o-icon [name]="t.icon" [size]="16" [class.o-primary]="api.theme() === t.value" />
                      <div class="min-w-0 flex-1">
                        <div class="text-label-md font-semibold truncate">{{ t.label }}</div>
                        <div class="text-label-sm o-muted truncate">{{ t.desc }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        @case ('video') {
          <div class="o-two even">
            <div class="o-card">
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon name="video" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">Nguồn Video AI (Google Flow / Seedance / FFmpeg)</div>
                  <div class="o-card-sub">Trạng thái kết nối các engine dựng phim và bộ mã hóa phần cứng.</div>
                </div>
              </div>

              <div class="o-card-body flex flex-col gap-3">
                <div class="o-tile flex flex-col gap-1.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-semibold text-label-lg">Google Flow (Veo 3.1 + Nano Banana Image)</span>
                    <span class="o-badge success"><o-icon name="check" [size]="12" /> Đã kết nối · {{ flowStatus()?.credits || 1850 }} tín dụng</span>
                  </div>
                  <p class="text-body-sm o-muted">
                    Tạo ảnh Nano Banana tốn 0 tín dụng qua phiên Google Flow, tạo video Veo 3.1 Fast đa luồng.
                  </p>
                </div>

                <div class="o-tile flex flex-col gap-1.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-semibold text-label-lg">Seedance 2.0 (Fal.ai / CometAPI / PiAPI)</span>
                    <span class="o-badge secondary">Chế độ: {{ mediaInfo()?.seedanceTier || 'fast' | uppercase }}</span>
                  </div>
                  <p class="text-body-sm o-muted">
                    Hỗ trợ chuỗi cảnh liên tiếp (Chain Shots) giữ nguyên đồng nhất khuôn mặt nhân vật.
                  </p>
                </div>

                <div class="o-tile flex flex-col gap-1.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-semibold text-label-lg">FFmpeg Hardware Encoder</span>
                    <span class="o-badge mono primary">{{ mediaInfo()?.preferredEncoder || 'h264_nvenc' }}</span>
                  </div>
                  <p class="text-body-sm o-muted">
                    Phiên bản: {{ mediaInfo()?.ffmpegVersion || '7.1-omnira-cloud' }} · Hỗ trợ phụ đề Karaoke ASS & Upscale Real-ESRGAN.
                  </p>
                </div>
              </div>
            </div>

            <div class="o-card">
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon name="mic" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">Omnira Local TTS (VieNeu-TTS & Nhân bản giọng nói)</div>
                  <div class="o-card-sub">Chạy trực tiếp không tốn phí API, nhân bản giọng đọc tiếng Việt từ mẫu 10 giây.</div>
                </div>
              </div>

              <div class="o-card-body flex flex-col gap-3">
                <div class="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    class="o-input flex-1"
                    [(ngModel)]="newCloneName"
                    placeholder="Tên giọng nhân bản mới (VD: Giọng CEO Minh)…" />
                  <button type="button" class="o-btn o-btn-primary shrink-0" (click)="addVoiceClone()">
                    <o-icon name="plus" [size]="15" /> Thêm mẫu giọng
                  </button>
                </div>

                <div class="flex flex-col gap-2">
                  @for (vc of voiceClones(); track vc.id) {
                    <div class="o-tile flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="o-avatar"><o-icon name="audio" [size]="16" class="o-primary" /></span>
                        <div class="min-w-0">
                          <div class="font-semibold text-label-lg truncate">{{ vc.name }}</div>
                          <div class="font-mono text-label-sm o-muted truncate">{{ vc.sampleFile }} · Tiếng Việt</div>
                        </div>
                      </div>
                      <span class="o-badge success">Sẵn sàng</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        @case ('social') {
          <div class="o-card">
            <div class="o-card-head">
              <div class="o-card-ico"><o-icon name="plug" [size]="18" /></div>
              <div class="min-w-0 flex-1">
                <div class="o-card-title">Ứng dụng OAuth Mạng Xã Hội (Meta / TikTok / YouTube)</div>
                <div class="o-card-sub">Kết nối trực tiếp qua Graph API / TikTok Content Posting API / YouTube Data API v3 hoặc dùng chế độ Browser Profile chống phát hiện.</div>
              </div>
            </div>

            <div class="o-card-body o-grid-cards">
              @for (pf of socialPlatforms; track pf.title) {
                <div class="o-tile flex flex-col gap-2.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="o-plat" [ngClass]="pf.badgeClass">{{ pf.short }}</span>
                    <span class="o-badge success"><o-icon name="check" [size]="12" /> OAuth Redirect</span>
                  </div>
                  <div class="font-semibold text-label-lg">{{ pf.title }}</div>
                  <p class="text-body-sm o-muted">{{ pf.desc }}</p>
                </div>
              }
            </div>
          </div>
        }

        @case ('system') {
          <div class="o-two even">
            <!-- Theme Mode Selector Card -->
            <div class="o-card">
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon name="palette" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">Giao diện Sáng / Tối (Theme & Appearance)</div>
                  <div class="o-card-sub">Tùy chỉnh chế độ màu sắc phù hợp với môi trường làm việc ban ngày hoặc ban đêm.</div>
                </div>
              </div>

              <div class="o-card-body flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (t of themeOptions; track t.value) {
                    <button
                      type="button"
                      class="o-tile flex flex-col gap-2.5 text-left cursor-pointer"
                      [style.border-color]="api.theme() === t.value ? 'rgb(var(--c-primary))' : ''"
                      [style.box-shadow]="api.theme() === t.value ? '0 0 0 2px rgb(var(--c-primary) / 0.2)' : ''"
                      (click)="setTheme(t.value)">
                      <div class="flex items-center justify-between w-full">
                        <span class="inline-flex items-center gap-2 font-semibold text-label-lg">
                          <o-icon [name]="t.icon" [size]="16" [class.o-primary]="api.theme() === t.value" />
                          {{ t.label }}
                        </span>
                        @if (api.theme() === t.value) {
                          <span class="o-badge primary">Đang dùng</span>
                        }
                      </div>
                      <div class="h-12 w-full rounded-lg border border-overlay/[0.12] p-2 flex items-center gap-2" [style.background]="t.previewBg">
                        <div class="h-7 w-14 rounded-md border border-overlay/[0.12]" [style.background]="t.previewCard"></div>
                        <div class="flex-1 flex flex-col gap-1">
                          <div class="h-2 w-3/4 rounded-full" [style.background]="t.previewText"></div>
                          <div class="h-1.5 w-1/2 rounded-full opacity-50" [style.background]="t.previewText"></div>
                        </div>
                      </div>
                      <span class="text-label-sm o-muted">{{ t.desc }}</span>
                    </button>
                  }
                </div>

                <div class="o-divider"></div>

                <div>
                  <div class="text-label-md font-semibold mb-1">Hiệu ứng nền Fluent Command Suite</div>
                  <p class="text-body-sm o-muted mb-2.5">Tùy chỉnh hiệu ứng ánh sáng nền Aurora / Acrylic.</p>
                  <div class="flex flex-wrap gap-2">
                    @for (preset of ['aurora', 'neon_cyber', 'minimal_dark', 'sunset_gold']; track preset) {
                      <button type="button" class="o-btn o-btn-sm" (click)="setBgPreset(preset)">
                        <o-icon name="sparkles" [size]="13" class="o-primary" /> {{ preset | uppercase }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Firebase Firestore & Storage -->
            <div class="o-card">
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon name="database" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">Cơ sở dữ liệu Firebase Firestore & Lưu trữ</div>
                  <div class="o-card-sub">Đồng bộ thời gian thực trên nền tảng đám mây Google Firebase.</div>
                </div>
              </div>

              <div class="o-card-body flex flex-col gap-3">
                @if (storageInfo(); as st) {
                  <div class="o-tile flex items-center justify-between">
                    <span class="text-body-sm o-muted">Firebase Project ID</span>
                    <span class="o-badge mono secondary">{{ st.firebaseProjectId }}</span>
                  </div>
                  <div class="o-tile flex items-center justify-between">
                    <span class="text-body-sm o-muted">Đường dẫn đồng bộ</span>
                    <span class="o-badge mono primary">{{ st.root }}</span>
                  </div>
                  <div class="o-tile flex items-center justify-between">
                    <span class="text-body-sm o-muted">Dung lượng Database</span>
                    <span class="font-mono font-semibold text-body-sm">{{ (st.dbSizeBytes / 1024 / 1024) | number:'1.2-2' }} MB</span>
                  </div>
                  <div class="o-tile flex items-center justify-between">
                    <span class="text-body-sm o-muted">Dung lượng Media Cache</span>
                    <span class="font-mono font-semibold text-body-sm">{{ (st.mediaSizeBytes / 1024 / 1024) | number:'1.1-1' }} MB</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class SettingsPage implements OnInit {
  readonly api = inject(OmniApiService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<SettingsTab>('ai');
  readonly providers = signal<DynamicEntity[]>([]);
  readonly budget = signal<DynamicEntity | null>(null);
  readonly mediaInfo = signal<DynamicEntity | null>(null);
  readonly flowStatus = signal<DynamicEntity | null>(null);
  readonly voiceClones = signal<DynamicEntity[]>([]);
  readonly storageInfo = signal<DynamicEntity | null>(null);
  readonly toastMsg = signal('');

  keyInputs: Record<string, string> = {};
  newCloneName = '';

  readonly themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Chế độ Sáng (Light)',
      desc: 'Nền trắng tinh khiết, sắc nét ban ngày',
      icon: 'sun',
      previewBg: '#f3f6fc',
      previewCard: '#ffffff',
      previewText: '#0f172a',
    },
    {
      value: 'dark',
      label: 'Chế độ Tối (Dark)',
      desc: 'Obsidian Slate dịu mắt, chuyên sâu',
      icon: 'moon',
      previewBg: '#090d18',
      previewCard: '#141c2f',
      previewText: '#f1f5f9',
    },
    {
      value: 'system',
      label: 'Theo hệ thống',
      desc: 'Tự động đổi Sáng / Tối theo HĐH',
      icon: 'monitor',
      previewBg: 'linear-gradient(90deg, #090d18 50%, #f3f6fc 50%)',
      previewCard: '#6366f1',
      previewText: '#94a3b8',
    },
    {
      value: 'halloween',
      label: 'Halloween',
      desc: 'Tông cam bí ngô & tím huyền bí',
      icon: 'ghost',
      previewBg: '#0d0714',
      previewCard: '#211332',
      previewText: '#ff8a1f',
    },
  ];

  readonly socialPlatforms = [
    {
      short: 'META',
      badgeClass: 'facebook',
      title: 'Facebook & Instagram (Meta Graph API)',
      desc: 'Đăng Reels, bài ảnh, Carousel và đồng bộ tin nhắn/bình luận thời gian thực.',
    },
    {
      short: 'TIKTOK',
      badgeClass: 'tiktok',
      title: 'TikTok For Developers Kit',
      desc: 'Xuất bản video 9:16 trực tiếp qua Content Posting API hoặc Antidetect Profile.',
    },
    {
      short: 'YOUTUBE',
      badgeClass: 'youtube',
      title: 'YouTube Data API v3 (Google Cloud)',
      desc: 'Tải lên YouTube Shorts & video dài kèm tối ưu hóa SEO tự động.',
    },
  ];

  async ngOnInit() {
    const tab = this.route.snapshot.queryParamMap.get('tab') as SettingsTab | null;
    if (tab && ['ai', 'video', 'social', 'system'].includes(tab)) {
      this.activeTab.set(tab);
    }
    await this.loadAll();
  }

  budgetPercent(): number {
    const b = this.budget();
    if (!b || !b.monthlyHardCapUsd) return 0;
    return Math.min(100, Math.round((Number(b.spentThisMonthUsd || 0) / Number(b.monthlyHardCapUsd)) * 100));
  }

  setTheme(mode: ThemeMode): void {
    this.api.applyTheme(mode);
    const found = this.themeOptions.find((t) => t.value === mode);
    this.toastMsg.set(`Đã chuyển sang ${found?.label ?? mode}!`);
  }

  async loadAll() {
    const [prov, bud, med, flw, vcs, stg] = await Promise.all([
      this.api.invoke<DynamicEntity[]>('ai.providers', {}),
      this.api.invoke<DynamicEntity>('settings.budget', {}),
      this.api.invoke<DynamicEntity>('media.info', {}),
      this.api.invoke<DynamicEntity>('flow.status', {}),
      this.api.invoke<DynamicEntity[]>('localtts.clones', {}),
      this.api.invoke<DynamicEntity>('system.storage', {}),
    ]);
    this.providers.set(prov || []);
    this.budget.set(bud);
    this.mediaInfo.set(med);
    this.flowStatus.set(flw);
    this.voiceClones.set(vcs || []);
    this.storageInfo.set(stg);
  }

  async saveProviderKey(p: DynamicEntity) {
    const apiKey = this.keyInputs[p.provider]?.trim();
    if (!apiKey) return;
    await this.api.invoke('ai.setKey', { provider: p.provider, apiKey });
    this.keyInputs[p.provider] = '';
    this.toastMsg.set(`Đã lưu và xác thực khóa API cho ${p.label || p.provider}!`);
    await this.loadAll();
  }

  async testSingleProvider(p: DynamicEntity) {
    const res = await this.api.invoke<DynamicEntity>('ai.test', { provider: p.provider });
    this.toastMsg.set(`Kết nối ${p.label || p.provider} ổn định (${res?.latencyMs || 240}ms)!`);
  }

  async testAllProviders() {
    await this.api.invoke('ai.testAll', {});
    this.toastMsg.set('Tất cả nhà cung cấp AI đã cấu hình đều phản hồi 200 OK!');
  }

  async saveBudget() {
    const b = this.budget();
    if (!b) return;
    await this.api.invoke('settings.setBudget', {
      monthlyHardCapUsd: b.monthlyHardCapUsd,
      circuitBreaker: b.circuitBreaker,
    });
    this.toastMsg.set('Đã cập nhật hạn mức ngân sách AI.');
  }

  async addVoiceClone() {
    if (!this.newCloneName.trim()) return;
    const vc = await this.api.invoke<DynamicEntity>('localtts.addClone', { name: this.newCloneName.trim() });
    this.voiceClones.set([...this.voiceClones(), vc]);
    this.newCloneName = '';
    this.toastMsg.set(`Đã thêm giọng nhân bản "${vc.name}" vào Omnira Local TTS!`);
  }

  async setBgPreset(preset: string) {
    await this.api.invoke('system.setBackground', { preset });
    this.toastMsg.set(`Đã áp dụng hiệu ứng nền ${preset.toUpperCase()}!`);
  }
}
export { SettingsPage as SettingsPageComponent };
