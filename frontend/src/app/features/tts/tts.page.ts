import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';

interface SpeakerStat {
  name: string;
  paragraphs: number;
  chars: number;
}

@Component({
  selector: 'app-tts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Top Header -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">🎙</span> Đọc văn bản (Text to Speech)
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Dán truyện, chương sách, kịch bản dài → chọn giọng AI hoặc giọng nhân bản của chính bạn (mỗi nhân vật một giọng bằng thẻ
            <code class="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-xs text-secondary">[Tên]</code>)
            → xuất MP3/WAV kèm phụ đề SRT.
          </p>
        </div>

        @if (localStatus()) {
          <div class="flex items-center gap-2 rounded-xl bg-tertiary/15 px-3 py-1.5 text-label-sm text-tertiary">
            <span>⚡ Omnira Local TTS sẵn sàng:</span>
            <span class="font-mono">{{ localStatus().model }} ({{ localStatus().clonesCount || 2 }} giọng clone)</span>
          </div>
        }
      </div>

      @if (toastMsg()) {
        <div class="rounded-xl bg-tertiary/15 px-4 py-2 text-label-md text-tertiary flex items-center justify-between">
          <span>{{ toastMsg() }}</span>
          <button type="button" (click)="toastMsg.set('')" class="text-xs underline">Đóng</button>
        </div>
      }

      <div class="grid grid-cols-1 items-start gap-space-md xl:grid-cols-[1fr_430px]">
        <!-- Left Column: Editor + Voice Settings + Multi-speaker Cast -->
        <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
          <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Tên bản đọc
            <input
              [(ngModel)]="draftTitle"
              placeholder="VD: Chương 12 – Cuộc gặp gỡ dưới mưa (để trống = lấy dòng đầu)"
              class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface" />
          </label>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-label-sm text-on-surface-variant">
              <span>Văn bản kịch bản / truyện</span>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="insertSampleDialogue()"
                  class="text-secondary hover:underline">
                  ✨ Chèn mẫu đối thoại nhiều vai
                </button>
                <label class="cursor-pointer text-primary hover:underline">
                  📄 Nhập từ file .txt
                  <input type="file" accept=".txt,.md" class="hidden" (change)="onImportTxt($event)" />
                </label>
              </div>
            </div>

            <textarea
              [ngModel]="draftText()"
              (ngModelChange)="draftText.set($event)"
              rows="12"
              placeholder="Dán nội dung cần đọc vào đây… Gõ [Tên nhân vật]: ở đầu dòng để phân vai tự động."
              class="rounded-xl border border-overlay/[0.12] bg-surface-container-lowest p-3 text-body-md leading-relaxed text-on-surface"></textarea>

            <div class="flex flex-wrap items-center justify-between text-label-sm text-outline">
              <span>
                {{ charCount() | number }} / 300,000 ký tự · ~{{ estimatedSec() }}s audio ·
                Phát hiện <strong class="text-secondary">{{ detectedSpeakers().length }}</strong> nhân vật phân vai
              </span>
              <span>Mỗi đoạn xuống dòng được ngắt nghỉ tự nhiên</span>
            </div>
          </div>

          <!-- Provider / Model / Voice / Pause controls -->
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Nhà cung cấp (Giọng chính / Dẫn truyện)
              <select
                [ngModel]="provider()"
                (ngModelChange)="changeProvider($event)"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface">
                <option value="google_tts">Google Gemini TTS (Miễn phí / Key Gemini)</option>
                <option value="local_tts">Omnira Local TTS (Chạy trên máy – Miễn phí)</option>
                <option value="openai_tts">OpenAI Audio TTS (gpt-4o-mini-tts)</option>
                <option value="elevenlabs">ElevenLabs Multilingual v2</option>
              </select>
            </label>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Model tổng hợp giọng
              <select
                [(ngModel)]="model"
                class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface">
                <option value="gemini-2.5-flash-preview-tts">gemini-2.5-flash-preview-tts</option>
                <option value="vieneu-v3-turbo">vieneu-v3-turbo (Local GPU)</option>
                <option value="eleven_multilingual_v2">eleven_multilingual_v2</option>
              </select>
            </label>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Giọng đọc chính
              <div class="flex gap-1.5">
                <select
                  [(ngModel)]="voiceId"
                  class="min-w-0 flex-1 rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface">
                  @for (v of voices(); track v.id) {
                    <option [value]="v.id">{{ v.label }}</option>
                  }
                </select>
                <button
                  type="button"
                  (click)="previewVoice(voiceId)"
                  class="rounded-lg bg-surface-container-high px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-highest"
                  title="Nghe thử giọng">
                  🔊
                </button>
              </div>
            </label>

            <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
              Khoảng nghỉ giữa các đoạn: <strong class="font-mono text-on-surface">{{ pauseSec }}s</strong>
              <div class="flex flex-wrap gap-1 pt-1">
                @for (p of [0, 0.3, 0.5, 0.8, 1.0, 1.5]; track p) {
                  <button
                    type="button"
                    (click)="pauseSec = p"
                    class="rounded-md px-2.5 py-1 font-mono text-xs transition"
                    [ngClass]="pauseSec === p ? 'bg-secondary text-surface font-bold' : 'bg-surface-container-lowest text-on-surface-variant'">
                    {{ p }}s
                  </button>
                }
              </div>
            </label>
          </div>

          <!-- Multi-speaker Cast Assignment Table -->
          @if (detectedSpeakers().length > 0) {
            <div class="rounded-xl border border-secondary/30 bg-surface-container-lowest p-3 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-label-md font-semibold text-secondary">
                  🎭 Phân vai giọng đọc tự động ({{ detectedSpeakers().length }} nhân vật)
                </span>
                <span class="text-xs text-outline">Tự nhớ giọng nhân vật cho các chương sau</span>
              </div>

              <div class="flex flex-col gap-2">
                @for (sp of detectedSpeakers(); track sp.name) {
                  <div class="grid grid-cols-1 items-center gap-2 sm:grid-cols-[150px_1fr_auto] rounded-lg bg-surface-container p-2">
                    <div>
                      <div class="font-semibold text-body-sm text-on-surface">[{{ sp.name }}]</div>
                      <div class="font-mono text-[11px] text-outline">{{ sp.paragraphs }} câu · {{ sp.chars }} ký tự</div>
                    </div>
                    <select
                      [ngModel]="castMap[sp.name] || voiceId"
                      (ngModelChange)="castMap[sp.name] = $event"
                      class="rounded-lg border border-overlay/[0.12] bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface">
                      @for (v of voices(); track v.id) {
                        <option [value]="v.id">{{ v.label }}</option>
                      }
                    </select>
                    <button
                      type="button"
                      (click)="previewVoice(castMap[sp.name] || voiceId)"
                      class="rounded bg-surface-container-high px-2.5 py-1 text-xs text-on-surface">
                      🔊 Nghe thử
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          <button
            type="button"
            [disabled]="creating() || !charCount()"
            (click)="submitTtsJob()"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
            🎙 {{ creating() ? 'Đang tổng hợp âm thanh & phụ đề SRT…' : 'Bắt Đầu Đọc Văn Bản & Xuất MP3 + SRT' }}
          </button>
        </div>

        <!-- Right Column: TTS Jobs Queue & History -->
        <div class="flex flex-col gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
          <div class="flex items-center justify-between border-b border-overlay/[0.06] pb-2">
            <h2 class="text-title-sm font-semibold text-on-surface">Hàng Đợi & Bản Đã Đọc ({{ jobs().length }})</h2>
            <span class="text-xs text-outline">Tự động lưu MP3 + SRT</span>
          </div>

          @if (jobs().length === 0) {
            <p class="py-8 text-center text-body-sm text-outline">Chưa có bản thu nào.</p>
          } @else {
            <ul class="flex flex-col gap-3">
              @for (j of jobs(); track j.id) {
                <li class="flex flex-col gap-2 rounded-xl border border-overlay/[0.08] bg-surface-container-lowest p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-semibold text-label-md text-on-surface">{{ j.title }}</div>
                      <div class="mt-0.5 font-mono text-[11px] text-outline">
                        {{ j.voiceLabel || j.voiceId }} · {{ j.chars | number }} ký tự · {{ j.durationSec || 12 }}s
                      </div>
                    </div>
                    <span class="rounded-md bg-tertiary/15 px-2 py-0.5 text-[11px] font-semibold text-tertiary">
                      Hoàn tất 100%
                    </span>
                  </div>

                  <p class="line-clamp-2 text-xs text-on-surface-variant italic">"{{ j.text }}"</p>

                  <!-- Simulated Audio Player Bar -->
                  <div class="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5">
                    <button
                      type="button"
                      (click)="previewVoice(j.voiceId)"
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
                      ▶
                    </button>
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                      <div class="h-full w-full bg-secondary"></div>
                    </div>
                    <span class="font-mono text-[11px] text-on-surface-variant">00:{{ (j.durationSec || 12) | number:'2.0-0' }}</span>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                    <div class="flex gap-1.5">
                      <button
                        type="button"
                        (click)="exportFile(j, 'audio')"
                        class="rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface hover:bg-surface-container-highest">
                        ⬇ Tải Audio (.WAV)
                      </button>
                      <button
                        type="button"
                        (click)="exportFile(j, 'srt')"
                        class="rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-medium text-secondary hover:bg-surface-container-highest">
                        📝 Tải Phụ đề (.SRT)
                      </button>
                    </div>
                    <button
                      type="button"
                      (click)="deleteJob(j.id)"
                      class="rounded-lg bg-surface-container-high px-2 py-1 text-xs text-error hover:bg-error/20">
                      🗑 Xóa
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  `,
})
export class TtsPage implements OnInit {
  private readonly api = inject(OmniApiService);

  readonly jobs = signal<DynamicEntity[]>([]);
  readonly voices = signal<DynamicEntity[]>([]);
  readonly localStatus = signal<DynamicEntity | null>(null);
  readonly provider = signal('google_tts');
  readonly draftText = signal(
    `[Người dẫn]: Chào mừng bạn đến với Omnira Studio — nền tảng tự động hóa sáng tạo đa kênh.\n[Minh Anh]: Chỉ cần nhập kịch bản phân vai như thế này, mỗi nhân vật sẽ tự động đọc bằng một giọng riêng biệt!\n[Hoàng Nam]: Và đặc biệt là xuất kèm file phụ đề SRT khớp từng mili-giây để dựng phim ngay lập tức.`
  );
  readonly creating = signal(false);
  readonly toastMsg = signal('');

  draftTitle = 'Bản thu phân vai mẫu Omnira Studio';
  model = 'gemini-2.5-flash-preview-tts';
  voiceId = 'vi-VN-HoaiMy';
  pauseSec = 0.5;
  castMap: Record<string, string> = {};

  readonly charCount = computed(() => this.draftText().trim().length);
  readonly estimatedSec = computed(() => Math.max(3, Math.round(this.charCount() / 14)));

  readonly detectedSpeakers = computed<SpeakerStat[]>(() => {
    const map = new Map<string, SpeakerStat>();
    const re = /^\[([^[\]\n]{1,40})\]\s*:?\s*/u;
    for (const rawLine of this.draftText().split(/\r?\n/)) {
      const line = rawLine.trim();
      const m = re.exec(line);
      if (!m) continue;
      const name = m[1].trim();
      const content = line.slice(m[0].length).trim();
      if (!name || !content) continue;
      const prev = map.get(name) || { name, paragraphs: 0, chars: 0 };
      prev.paragraphs += 1;
      prev.chars += content.length;
      map.set(name, prev);
    }
    return [...map.values()];
  });

  async ngOnInit() {
    const [jobList, vList, loc] = await Promise.all([
      this.api.invoke<DynamicEntity[]>('tts.list', {}),
      this.api.invoke<DynamicEntity[]>('media.voices', { provider: this.provider() }),
      this.api.invoke<DynamicEntity>('localtts.status', {}),
    ]);
    this.jobs.set(jobList || []);
    this.voices.set(vList || []);
    this.localStatus.set(loc);
  }

  async changeProvider(prov: string) {
    this.provider.set(prov);
    const vList = await this.api.invoke<DynamicEntity[]>('media.voices', { provider: prov });
    this.voices.set(vList || []);
    if (vList?.length) {
      this.voiceId = vList[0].id;
    }
  }

  insertSampleDialogue() {
    this.draftText.set(
      `[Người dẫn]: Đêm Sài Gòn mưa tầm tã, ánh đèn neon phản chiếu trên mặt đường ướt lạnh.\n[Minh Anh]: Anh đã biết trước chuyện hợp đồng đó từ đầu phải không?\n[Hoàng Nam]: Anh chỉ muốn bảo vệ dự án mà chúng ta đã dành cả thanh xuân để gây dựng.`
    );
  }

  onImportTxt(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      this.draftText.set(txt.slice(0, 300000));
      if (!this.draftTitle) {
        this.draftTitle = file.name.replace(/\.[^.]+$/, '');
      }
    });
  }

  async previewVoice(vid: string) {
    const res = await this.api.invoke<DynamicEntity>('media.previewVoice', {
      provider: this.provider(),
      voiceId: vid,
    });
    this.toastMsg.set(`Đang phát mẫu thử giọng đọc: ${vid} (${res?.sampleUrl || 'sẵn sàng'})`);
  }

  async submitTtsJob() {
    if (!this.charCount()) return;
    this.creating.set(true);
    try {
      const selectedVoice = this.voices().find((v) => v.id === this.voiceId);
      const job = await this.api.invoke<DynamicEntity>('tts.create', {
        title: this.draftTitle.trim() || 'Bản thu TTS mới',
        text: this.draftText(),
        provider: this.provider(),
        model: this.model,
        voiceId: this.voiceId,
        voiceLabel: selectedVoice?.label || this.voiceId,
        pauseSec: this.pauseSec,
        cast: this.castMap,
      });
      this.jobs.set([job, ...this.jobs()]);
      this.toastMsg.set(`Đã hoàn tất tổng hợp giọng đọc "${job.title}" kèm phụ đề SRT!`);
    } finally {
      this.creating.set(false);
    }
  }

  async exportFile(job: DynamicEntity, kind: 'audio' | 'srt') {
    await this.api.invoke('tts.export', { id: job.id, kind });
    this.toastMsg.set(
      kind === 'srt'
        ? `Đã xuất file phụ đề chuẩn thời gian: ${job.srtFile || 'subtitles.srt'}`
        : `Đã xuất file âm thanh chất lượng cao: ${job.file || 'audio.wav'}`
    );
  }

  async deleteJob(id: string) {
    await this.api.invoke('tts.delete', { id });
    this.jobs.set(this.jobs().filter((j) => j.id !== id));
  }
}
export { TtsPage as TtsPageComponent };
