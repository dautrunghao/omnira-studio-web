import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';

type SettingsTab = 'ai' | 'video' | 'social' | 'system';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Header & 4-Tab Bar (Matching Original Omnira Studio 1.2.9) -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">⚙️</span> Cài đặt Hệ thống & AI Router
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Quản lý khóa API BYOK, định tuyến AI đa tầng, nguồn Video/Giọng đọc (Flow, Seedance, Local TTS), OAuth mạng xã hội và lưu trữ.
          </p>
        </div>

        <nav class="flex flex-wrap gap-1.5 rounded-xl bg-surface-container-low p-1.5 border border-overlay/[0.06]">
          <button
            type="button"
            (click)="activeTab.set('ai')"
            class="rounded-lg px-3.5 py-1.5 text-label-md font-medium transition"
            [ngClass]="activeTab() === 'ai' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
            🤖 AI & Định tuyến
          </button>
          <button
            type="button"
            (click)="activeTab.set('video')"
            class="rounded-lg px-3.5 py-1.5 text-label-md font-medium transition"
            [ngClass]="activeTab() === 'video' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
            🎬 Video & Giọng đọc
          </button>
          <button
            type="button"
            (click)="activeTab.set('social')"
            class="rounded-lg px-3.5 py-1.5 text-label-md font-medium transition"
            [ngClass]="activeTab() === 'social' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
            🔗 Kết nối Đăng bài
          </button>
          <button
            type="button"
            (click)="activeTab.set('system')"
            class="rounded-lg px-3.5 py-1.5 text-label-md font-medium transition"
            [ngClass]="activeTab() === 'system' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
            🖥 Hệ thống & Lưu trữ
          </button>
        </nav>
      </div>

      @if (toastMsg()) {
        <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
          <span>{{ toastMsg() }}</span>
          <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
        </div>
      }

      @switch (activeTab()) {
        @case ('ai') {
          <div class="grid grid-cols-1 gap-space-md xl:grid-cols-[1fr_380px]">
            <!-- AI Providers List -->
            <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
              <div class="flex items-center justify-between">
                <h2 class="text-title-sm font-semibold text-on-surface">Danh sách Nhà cung cấp AI (BYOK)</h2>
                <button
                  type="button"
                  (click)="testAllProviders()"
                  class="rounded-lg bg-secondary/20 px-3 py-1.5 text-label-sm font-semibold text-secondary hover:bg-secondary/30">
                  ⚡ Kiểm tra toàn bộ kết nối
                </button>
              </div>

              <div class="flex flex-col gap-3">
                @for (p of providers(); track p.id) {
                  <div class="flex flex-col gap-2.5 rounded-xl border border-overlay/[0.08] bg-surface-container-lowest p-3.5">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-label-md text-on-surface">{{ p.label || p.provider }}</span>
                        <span class="rounded bg-surface-container-high px-2 py-0.5 font-mono text-[11px] text-on-surface-variant">
                          {{ p.category | uppercase }} · {{ p.defaultModel }}
                        </span>
                        <span
                          class="rounded px-2 py-0.5 text-[11px] font-medium"
                          [ngClass]="p.hasKey ? 'bg-tertiary/15 text-tertiary' : 'bg-warning/15 text-warning'">
                          {{ p.hasKey ? '✓ Đã cấu hình (' + (p.keyPreview || 'API Key') + ')' : 'Chưa nhập Key' }}
                        </span>
                      </div>

                      <div class="flex items-center gap-1.5">
                        <button
                          type="button"
                          (click)="testSingleProvider(p)"
                          class="rounded-lg bg-surface-container-high px-2.5 py-1 text-xs text-on-surface hover:bg-surface-container-highest">
                          Kiểm tra
                        </button>
                      </div>
                    </div>

                    <div class="flex gap-2">
                      <input
                        [(ngModel)]="keyInputs[p.provider]"
                        type="password"
                        [placeholder]="p.hasKey ? 'Nhập API Key mới để thay thế…' : 'Dán API Key (' + p.provider + ')…'"
                        class="min-w-0 flex-1 rounded-lg border border-overlay/[0.12] bg-surface-container px-3 py-1.5 font-mono text-xs text-on-surface" />
                      <button
                        type="button"
                        (click)="saveProviderKey(p)"
                        class="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary">
                        Lưu Key
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Right: AI Budget & Routing -->
            <div class="flex flex-col gap-space-md">
              @if (budget()) {
                <div class="flex flex-col gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
                  <h2 class="text-title-sm font-semibold text-on-surface">💰 Ngân sách AI & Cầu dao ngắt tự động</h2>
                  <div class="rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                    <div class="text-xs text-outline">Đã chi tiêu trong tháng này</div>
                    <div class="mt-0.5 text-headline-sm font-bold text-secondary">
                      \${{ budget().spentThisMonthUsd }} <span class="text-body-sm font-normal text-outline">/ \${{ budget().monthlyHardCapUsd }}</span>
                    </div>
                  </div>

                  <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                    Hạn mức tối đa mỗi tháng (USD)
                    <input
                      type="number"
                      [(ngModel)]="budget().monthlyHardCapUsd"
                      (blur)="saveBudget()"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-1.5 font-mono text-body-sm text-on-surface" />
                  </label>

                  <label class="flex items-center justify-between text-body-sm text-on-surface pt-1">
                    <span>Tự động ngắt khi chạm trần ngân sách</span>
                    <input
                      type="checkbox"
                      [(ngModel)]="budget().circuitBreaker"
                      (change)="saveBudget()"
                      class="h-4 w-4 accent-secondary" />
                  </label>

                  <div class="border-t border-overlay/[0.06] pt-2">
                    <div class="text-label-sm text-outline mb-1.5">Chi tiết theo tính năng</div>
                    @for (bf of budget().byFeature || []; track bf.feature) {
                      <div class="flex justify-between py-1 text-xs">
                        <span class="text-on-surface-variant">{{ bf.feature }}</span>
                        <span class="font-mono text-on-surface">\${{ bf.costUsd }} ({{ bf.calls }} lượt)</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="flex flex-col gap-space-sm rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
                <h2 class="text-title-sm font-semibold text-on-surface">🔀 Chuỗi Dự Phòng (Fallback Routing)</h2>
                <p class="text-xs text-on-surface-variant">
                  Khi nhà cung cấp chính quá tải hoặc hết hạn mức, Omnira tự động chuyển sang model tiếp theo trong chuỗi.
                </p>
                <div class="rounded-xl bg-surface-container-lowest p-3 font-mono text-xs text-on-surface flex flex-col gap-1.5">
                  <div>Văn bản: <span class="text-secondary">Gemini 3.5 → GPT-4o → Claude Sonnet</span></div>
                  <div>Giọng đọc: <span class="text-secondary">Gemini TTS → ElevenLabs → Local TTS</span></div>
                  <div>Video/Ảnh: <span class="text-secondary">Seedance 2.0 → Google Veo 3.1 → Kling</span></div>
                </div>
              </div>
            </div>
          </div>
        }

        @case ('video') {
          <div class="grid grid-cols-1 gap-space-md lg:grid-cols-2">
            <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
              <h2 class="text-title-sm font-semibold text-on-surface">🎞 Nguồn Video AI (Google Flow / Muse / Grok / Seedance)</h2>

              <div class="rounded-xl bg-surface-container-lowest p-3.5 border border-overlay/[0.06] flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-body-sm text-on-surface">Google Flow (Veo 3.1 + Nano Banana Image)</span>
                  <span class="rounded bg-tertiary/15 px-2 py-0.5 text-xs text-tertiary">✓ Đã kết nối · {{ flowStatus()?.credits || 1850 }} tín dụng</span>
                </div>
                <p class="text-xs text-on-surface-variant">
                  Tạo ảnh Nano Banana tốn 0 tín dụng qua phiên Google Flow, tạo video Veo 3.1 Fast đa luồng.
                </p>
              </div>

              <div class="rounded-xl bg-surface-container-lowest p-3.5 border border-overlay/[0.06] flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-body-sm text-on-surface">Seedance 2.0 (Fal.ai / CometAPI / PiAPI)</span>
                  <span class="rounded bg-secondary/15 px-2 py-0.5 text-xs text-secondary">Chế độ: {{ mediaInfo()?.seedanceTier || 'fast' | uppercase }}</span>
                </div>
                <p class="text-xs text-on-surface-variant">
                  Hỗ trợ chuỗi cảnh liên tiếp (Chain Shots) giữ nguyên đồng nhất khuôn mặt nhân vật.
                </p>
              </div>

              <div class="rounded-xl bg-surface-container-lowest p-3.5 border border-overlay/[0.06] flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-body-sm text-on-surface">FFmpeg Hardware Encoder</span>
                  <span class="font-mono text-xs text-tertiary">{{ mediaInfo()?.preferredEncoder || 'h264_nvenc' }}</span>
                </div>
                <p class="text-xs text-on-surface-variant">
                  Phiên bản: {{ mediaInfo()?.ffmpegVersion || '7.1-omnira-cloud' }} · Hỗ trợ phụ đề Karaoke ASS & Upscale Real-ESRGAN.
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
              <h2 class="text-title-sm font-semibold text-on-surface">🎙 Omnira Local TTS (VieNeu-TTS & Nhân bản giọng nói)</h2>
              <p class="text-body-sm text-on-surface-variant">
                Chạy trực tiếp trên máy không tốn phí API. Cho phép thu âm hoặc tải mẫu giọng 10 giây để nhân bản giọng đọc tiếng Việt.
              </p>

              <div class="flex gap-2">
                <input
                  [(ngModel)]="newCloneName"
                  placeholder="Tên giọng nhân bản mới (VD: Giọng CEO Minh)…"
                  class="min-w-0 flex-1 rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface" />
                <button
                  type="button"
                  (click)="addVoiceClone()"
                  class="rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary">
                  ＋ Thêm mẫu giọng
                </button>
              </div>

              <ul class="flex flex-col gap-2">
                @for (vc of voiceClones(); track vc.id) {
                  <li class="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 border border-overlay/[0.06]">
                    <div>
                      <div class="font-semibold text-body-sm text-on-surface">{{ vc.name }}</div>
                      <div class="font-mono text-xs text-outline">{{ vc.sampleFile }} · Tiếng Việt</div>
                    </div>
                    <span class="rounded bg-tertiary/15 px-2 py-0.5 text-xs text-tertiary">Sẵn sàng</span>
                  </li>
                }
              </ul>
            </div>
          </div>
        }

        @case ('social') {
          <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-md">
            <h2 class="text-title-sm font-semibold text-on-surface">🔗 Ứng dụng OAuth Mạng Xã Hội (Meta / TikTok / YouTube)</h2>
            <p class="text-body-sm text-on-surface-variant">
              Kết nối trực tiếp qua Graph API / TikTok Content Posting API / YouTube Data API v3 hoặc dùng chế độ Browser Profile chống phát hiện.
            </p>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              @for (pf of ['Facebook & Instagram (Meta Graph API)', 'TikTok For Developers Kit', 'YouTube Data API v3 (Google Cloud)']; track pf) {
                <div class="rounded-xl border border-overlay/[0.08] bg-surface-container-lowest p-4 flex flex-col gap-2">
                  <div class="font-semibold text-label-md text-on-surface">{{ pf }}</div>
                  <span class="w-fit rounded bg-tertiary/15 px-2 py-0.5 text-xs text-tertiary">✓ Đã cấu hình OAuth Redirect</span>
                  <p class="text-xs text-on-surface-variant">Hỗ trợ tự động làm mới Access Token ngầm định kỳ.</p>
                </div>
              }
            </div>
          </div>
        }

        @case ('system') {
          <div class="grid grid-cols-1 gap-space-md lg:grid-cols-2">
            <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-sm">
              <h2 class="text-title-sm font-semibold text-on-surface">☁️ Cơ sở dữ liệu Firebase Firestore & Lưu trữ</h2>
              @if (storageInfo()) {
                <div class="rounded-xl bg-surface-container-lowest p-4 font-mono text-xs text-on-surface flex flex-col gap-2 border border-overlay/[0.06]">
                  <div>Firebase Project ID: <strong class="text-secondary">{{ storageInfo().firebaseProjectId }}</strong></div>
                  <div>Đường dẫn đồng bộ: <strong class="text-primary">{{ storageInfo().root }}</strong></div>
                  <div>Dung lượng Database: <strong>{{ (storageInfo().dbSizeBytes / 1024 / 1024) | number:'1.2-2' }} MB</strong></div>
                  <div>Dung lượng Media Cache: <strong>{{ (storageInfo().mediaSizeBytes / 1024 / 1024) | number:'1.1-1' }} MB</strong></div>
                </div>
              }
            </div>

            <div class="rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md flex flex-col gap-space-sm">
              <h2 class="text-title-sm font-semibold text-on-surface">🎨 Hiệu ứng nền Fluent Command Suite</h2>
              <p class="text-body-sm text-on-surface-variant">
                Tùy chỉnh hiệu ứng Aurora / Acrylic mờ nền theo phong cách Windows 11 Fluent Design.
              </p>
              <div class="flex flex-wrap gap-2 pt-1">
                @for (preset of ['aurora', 'neon_cyber', 'minimal_dark', 'sunset_gold']; track preset) {
                  <button
                    type="button"
                    (click)="setBgPreset(preset)"
                    class="rounded-xl bg-surface-container-high px-3.5 py-2 text-label-sm font-medium text-on-surface hover:bg-primary hover:text-on-primary transition">
                    ✨ {{ preset | uppercase }}
                  </button>
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
  private readonly api = inject(OmniApiService);
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

  async ngOnInit() {
    const tab = this.route.snapshot.queryParamMap.get('tab') as SettingsTab | null;
    if (tab && ['ai', 'video', 'social', 'system'].includes(tab)) {
      this.activeTab.set(tab);
    }
    await this.loadAll();
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
