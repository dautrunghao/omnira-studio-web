import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OmniApiService } from '../../core/omni-api.service';

@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="o-page flex flex-col gap-space-md">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
        <div>
          <h1 class="flex items-center gap-space-sm text-headline-md font-semibold text-on-surface">
            <span class="text-secondary">📖</span> Hướng dẫn kết nối & Vận hành Omnira Studio
          </h1>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Quy trình từng bước để kết nối tài khoản mạng xã hội, thiết lập khóa AI BYOK và vận hành dây chuyền sản xuất tự động.
          </p>
        </div>

        <button
          type="button"
          (click)="goAccounts()"
          class="rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90">
          👥 Mở Quản lý Tài khoản & Kênh →
        </button>
      </div>

      <!-- Platform Connection Guides -->
      <div class="grid grid-cols-1 gap-space-md lg:grid-cols-2">
        @for (g of guides; track g.platform) {
          <div class="flex flex-col justify-between gap-space-md rounded-2xl border border-overlay/[0.08] bg-surface-container p-space-md">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="text-2xl">{{ g.icon }}</span>
                  <div>
                    <h2 class="text-title-md font-bold text-on-surface">{{ g.title }}</h2>
                    <span class="text-xs text-outline">{{ g.subtitle }}</span>
                  </div>
                </div>
                <span class="rounded-full bg-tertiary/15 px-3 py-0.5 text-xs font-semibold text-tertiary">
                  ✓ Đã kết nối {{ countByPlatform(g.platform) }} kênh
                </span>
              </div>

              <ol class="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3.5 text-body-sm text-on-surface-variant border border-overlay/[0.06]">
                @for (step of g.steps; track step; let i = $index) {
                  <li class="flex items-start gap-2.5">
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20 font-mono text-xs font-bold text-secondary">
                      {{ i + 1 }}
                    </span>
                    <span>{{ step }}</span>
                  </li>
                }
              </ol>
            </div>

            <div class="flex items-center justify-between border-t border-overlay/[0.06] pt-3">
              <span class="text-xs text-outline">{{ g.note }}</span>
              <button
                type="button"
                (click)="goRoute(g.actionRoute)"
                class="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-semibold text-on-surface hover:bg-primary hover:text-on-primary transition">
                {{ g.actionLabel }} →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class GuidePage implements OnInit {
  private readonly api = inject(OmniApiService);
  private readonly router = inject(Router);

  readonly channels = signal<any[]>([]);

  readonly guides = [
    {
      platform: 'facebook',
      icon: '📘',
      title: 'Facebook Fanpage & Reels',
      subtitle: 'Meta Graph API v21.0 + Browser Profile',
      steps: [
        'Vào mục Tài khoản & Kênh → bấm "Thêm tài khoản Facebook" hoặc "Đăng nhập OAuth Meta".',
        'Cấp quyền pages_manage_posts, pages_read_engagement và pages_messaging cho ứng dụng.',
        'Omnira tự động liệt kê toàn bộ Fanpage trực thuộc tài khoản để gắn vào từng Pocket.',
        'Cấu hình Proxy riêng nếu quản lý trên 5 tài khoản VIA để bảo vệ checkpoint.',
      ],
      note: 'Hỗ trợ đăng bài ảnh, Reels, bình luận đầu tiên (First Comment) & tự động trả lời Inbox.',
      actionLabel: 'Kết nối Facebook',
      actionRoute: '/accounts',
    },
    {
      platform: 'tiktok',
      icon: '🎵',
      title: 'TikTok Creator & TikTok Shop',
      subtitle: 'TikTok Content Posting API + Antidetect Profile',
      steps: [
        'Mở mục Tài khoản & Kênh → chọn tab TikTok → bấm "Kết nối kênh TikTok".',
        'Quét mã QR bằng ứng dụng TikTok trên điện thoại hoặc đăng nhập trong hồ sơ trình duyệt cô lập.',
        'Bật kiểm tra sức khỏe kênh định kỳ để nhận cảnh báo sớm khi video bị bóp tương tác.',
        'Kết hợp với lịch Giờ vàng (11:30 & 20:00) để tối ưu phân phối lên xu hướng.',
      ],
      note: 'Hỗ trợ đăng video 9:16 tới 10 phút, gắn hashtag tự động và đồng bộ bình luận.',
      actionLabel: 'Kết nối TikTok',
      actionRoute: '/accounts',
    },
    {
      platform: 'instagram',
      icon: '📸',
      title: 'Instagram Business & Creator',
      subtitle: 'Instagram Graph API (Reels & Carousel)',
      steps: [
        'Chuyển tài khoản Instagram sang chế độ Chuyên nghiệp (Business hoặc Creator) và liên kết với Fanpage Facebook.',
        'Trong mục Tài khoản & Kênh, bấm "Đồng bộ Instagram từ Meta" để nhận diện tài khoản.',
        'Sử dụng Xưởng Ảnh AI để tạo bộ ảnh Lookbook 4:5 hoặc Carousel nhiều ảnh đăng trực tiếp.',
      ],
      note: 'Hỗ trợ Reels, ảnh đơn, Carousel tới 10 ảnh và quản lý Direct Message hợp nhất.',
      actionLabel: 'Kết nối Instagram',
      actionRoute: '/accounts',
    },
    {
      platform: 'youtube',
      icon: '▶️',
      title: 'YouTube Shorts & Kênh Dài',
      subtitle: 'YouTube Data API v3 (Google OAuth2)',
      steps: [
        'Vào Cài đặt → Kết nối Đăng bài → kiểm tra trạng thái Google OAuth Client.',
        'Thêm kênh YouTube trong mục Tài khoản & Kênh và cấp quyền youtube.upload.',
        'Dùng Xưởng Phim AI hoặc Xưởng Video AI để xuất video 9:16 (Shorts) hoặc 16:9 Full HD.',
      ],
      note: 'Tự động điền Tiêu đề chuẩn SEO, Mô tả, Tags và chọn khung giờ phát hành.',
      actionLabel: 'Kết nối YouTube',
      actionRoute: '/accounts',
    },
  ];

  async ngOnInit() {
    const list = await this.api.invoke<any[]>('channels.list', {}).catch(() => []);
    this.channels.set(list || []);
  }

  countByPlatform(pf: string): number {
    return this.channels().filter((c) => c.platform === pf).length;
  }

  goAccounts() {
    this.router.navigate(['/accounts']);
  }

  goRoute(route: string) {
    this.router.navigate([route]);
  }
}
export { GuidePage as GuidePageComponent };
