export type FeatureFlag = 'SERIES' | 'STUDIO' | 'FILM' | 'CALENDAR' | 'INBOX' | 'ANALYTICS';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  shortcut?: string;
  feature?: FeatureFlag;
  /** khóa badge (đếm động) do ShellStore cung cấp */
  badge?: 'inbox' | 'calendar' | 'alerts' | 'support';
  group: 'main' | 'create' | 'grow' | 'system';
}

/** 18 mục điều hướng – thứ tự, nhãn, phím tắt và feature flag giữ đúng bản gốc 1.2.9. */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Tổng quan', icon: 'dashboard', shortcut: 'Ctrl+1', group: 'main', badge: 'alerts' },
  { path: '/workspaces', label: 'Không gian làm việc', icon: 'layers', shortcut: 'Ctrl+2', group: 'main' },
  { path: '/accounts', label: 'Quản lý Tài khoản & Trang', icon: 'users', shortcut: 'Ctrl+3', group: 'main' },
  { path: '/plan', label: 'Kế hoạch nội dung', icon: 'lightbulb', group: 'create' },
  { path: '/content', label: 'Kho nội dung', icon: 'folder', shortcut: 'Ctrl+4', group: 'create' },
  { path: '/series', label: 'Series AI', icon: 'book', feature: 'SERIES', group: 'create' },
  { path: '/studio', label: 'Xưởng Video AI', icon: 'clapperboard', shortcut: 'Ctrl+5', feature: 'STUDIO', group: 'create' },
  { path: '/film', label: 'Xưởng Phim', icon: 'film', feature: 'FILM', group: 'create' },
  { path: '/clone', label: 'Clone video', icon: 'copyplus', feature: 'FILM', group: 'create' },
  { path: '/image-studio', label: 'Xưởng Ảnh AI', icon: 'images', feature: 'STUDIO', group: 'create' },
  { path: '/tts', label: 'Đọc văn bản (TTS)', icon: 'audio', feature: 'STUDIO', group: 'create' },
  { path: '/calendar', label: 'Lịch đăng bài', icon: 'calendar', shortcut: 'Ctrl+6', feature: 'CALENDAR', group: 'grow', badge: 'calendar' },
  { path: '/inbox', label: 'Hộp thư hợp nhất', icon: 'inbox', shortcut: 'Ctrl+7', feature: 'INBOX', group: 'grow', badge: 'inbox' },
  { path: '/analytics', label: 'Phân tích', icon: 'chart', feature: 'ANALYTICS', group: 'grow' },
  { path: '/billing', label: 'Gói & thanh toán', icon: 'card', group: 'system' },
  { path: '/settings', label: 'Cài đặt', icon: 'settings', shortcut: 'Ctrl+8', group: 'system' },
  { path: '/guide', label: 'Hướng dẫn kết nối', icon: 'plug', group: 'system' },
  { path: '/support', label: 'Hỗ trợ & Góp ý', icon: 'lifebuoy', group: 'system', badge: 'support' },
];

export const FEATURE_LABEL: Record<FeatureFlag, string> = {
  SERIES: 'Series AI',
  STUDIO: 'Xưởng Video / Ảnh / TTS',
  FILM: 'Xưởng Phim & Clone video',
  CALENDAR: 'Lịch đăng bài',
  INBOX: 'Hộp thư hợp nhất',
  ANALYTICS: 'Phân tích',
};
