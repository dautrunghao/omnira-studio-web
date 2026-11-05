import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DynamicEntity } from '../../core/models';
import { OmniApiService } from '../../core/omni-api.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="o-page">
      <!-- Header -->
      <div class="o-page-head">
        <div class="o-page-ico"><o-icon name="book" [size]="21" /></div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="o-page-title">Hướng dẫn kết nối & Vận hành Omnira Studio</h1>
            <span class="o-badge pill primary">Tài liệu chuẩn</span>
          </div>
          <p class="o-page-desc">
            Quy trình từng bước để kết nối tài khoản mạng xã hội, thiết lập khóa AI BYOK và vận hành dây chuyền sản xuất tự động.
          </p>
        </div>

        <div class="o-page-actions">
          <button type="button" class="o-btn o-btn-primary" (click)="goAccounts()">
            <o-icon name="users" [size]="15" /> Mở Quản lý Tài khoản & Kênh
          </button>
        </div>
      </div>

      <!-- Platform Connection Guides -->
      <div class="o-two even">
        @for (g of guides; track g.platform) {
          <div class="o-card flex flex-col justify-between">
            <div>
              <div class="o-card-head">
                <div class="o-card-ico"><o-icon [name]="g.icon" [size]="18" /></div>
                <div class="min-w-0 flex-1">
                  <div class="o-card-title">{{ g.title }}</div>
                  <div class="o-card-sub">{{ g.subtitle }}</div>
                </div>
                <span class="o-badge pill success">
                  <o-icon name="check" [size]="12" /> Đã kết nối {{ countByPlatform(g.platform) }} kênh
                </span>
              </div>

              <div class="o-card-body flex flex-col gap-2.5">
                @for (step of g.steps; track step; let i = $index) {
                  <div class="o-tile flex items-start gap-3">
                    <span class="o-badge mono primary">{{ i + 1 }}</span>
                    <span class="text-body-sm">{{ step }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="px-4 py-3 border-t border-overlay/[0.06] flex flex-wrap items-center justify-between gap-2">
              <span class="text-label-sm o-muted">{{ g.note }}</span>
              <button type="button" class="o-btn o-btn-sm" (click)="goRoute(g.actionRoute)">
                {{ g.actionLabel }} <o-icon name="arrowright" [size]="13" />
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

  readonly channels = signal<DynamicEntity[]>([]);

  readonly guides = [
    {
      platform: 'facebook',
      icon: 'facebook',
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
      icon: 'tiktok',
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
      icon: 'instagram',
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
      icon: 'youtube',
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
    const list = await this.api.invoke<DynamicEntity[]>('channels.list', {}).catch((): DynamicEntity[] => []);
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
