/** Định dạng nội dung (CONTENT_FORMATS của bản gốc). kind = video → "Tạo video"; text → "Tạo bài viết". */
export interface ContentFormat {
  id: string;
  group: 'entertainment' | 'story' | 'knowledge' | 'product' | 'post';
  label: string;
  kind: 'video' | 'text';
}

export const CONTENT_FORMATS: ContentFormat[] = [
  { id: 'free', group: 'entertainment', label: 'Tự do', kind: 'video' },
  { id: 'episode', group: 'story', label: 'Tập phim ngắn', kind: 'video' },
  { id: 'top_list', group: 'entertainment', label: 'Top danh sách', kind: 'video' },
  { id: 'news', group: 'entertainment', label: 'Tin nhanh', kind: 'video' },
  { id: 'quiz', group: 'entertainment', label: 'Đố vui / thử thách', kind: 'video' },
  { id: 'story', group: 'story', label: 'Kể chuyện / sự thật thú vị', kind: 'video' },
  { id: 'explainer', group: 'knowledge', label: 'Giải thích / kiến thức', kind: 'video' },
  { id: 'lyric', group: 'entertainment', label: 'Video lời bài hát', kind: 'video' },
  { id: 'match_recap', group: 'entertainment', label: 'Tóm tắt trận đấu', kind: 'video' },
  { id: 'quote', group: 'story', label: 'Trích dẫn / truyền cảm hứng', kind: 'video' },
  { id: 'product_review', group: 'product', label: 'Review sản phẩm', kind: 'video' },
  { id: 'fashion_tryon', group: 'product', label: 'Thời trang: người mẫu mặc thử', kind: 'video' },
  { id: 'unboxing', group: 'product', label: 'Mở hộp (Unboxing)', kind: 'video' },
  { id: 'comparison', group: 'product', label: 'So sánh A vs B', kind: 'video' },
  { id: 'teaser', group: 'product', label: 'Teaser / Trailer', kind: 'video' },
  { id: 'how_to', group: 'knowledge', label: 'Hướng dẫn từng bước', kind: 'video' },
  { id: 'recipe', group: 'knowledge', label: 'Công thức nấu ăn', kind: 'video' },
  { id: 'before_after', group: 'knowledge', label: 'Trước – sau', kind: 'video' },
  { id: 'vlog', group: 'entertainment', label: 'Vlog / Du lịch', kind: 'video' },
  { id: 'post_text', group: 'post', label: 'Bài viết (status)', kind: 'text' },
  { id: 'post_image', group: 'post', label: 'Bài ảnh / poster', kind: 'text' },
  { id: 'post_carousel', group: 'post', label: 'Carousel nhiều ảnh', kind: 'text' },
];

export const FORMAT_GROUP_LABEL: Record<ContentFormat['group'], string> = {
  entertainment: 'Giải trí',
  story: 'Câu chuyện',
  knowledge: 'Kiến thức',
  product: 'Bán hàng',
  post: 'Bài viết',
};

export const formatById = (id: string | null | undefined): ContentFormat =>
  CONTENT_FORMATS.find((f) => f.id === id) ?? { id: id ?? 'free', group: 'entertainment', label: id ?? 'Tự do', kind: 'video' };

export const IDEA_STATUS: { v: string; l: string; tone: string }[] = [
  { v: 'idea', l: 'Ý tưởng', tone: '' },
  { v: 'in_progress', l: 'Đang làm', tone: 'secondary' },
  { v: 'done', l: 'Hoàn tất', tone: 'success' },
  { v: 'dropped', l: 'Bỏ', tone: 'danger' },
];
