import { readFileAsDataUrl } from './util';

export interface PickedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

/**
 * Thay hộp thoại chọn file của bản desktop (system.pickImage / pickMedia / pickVideo / support.pickImages…).
 * Trả về file dạng dataURL để gửi lên API (backend lưu vào Firebase Storage và trả đường dẫn).
 */
export function pickFiles(opts: { accept?: string; multiple?: boolean; maxMb?: number } = {}): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = opts.accept ?? '*/*';
    input.multiple = !!opts.multiple;
    input.style.display = 'none';
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const max = (opts.maxMb ?? 12) * 1024 * 1024;
      const out: PickedFile[] = [];
      for (const f of files) {
        if (f.size > max) continue;
        out.push({ name: f.name, type: f.type, size: f.size, dataUrl: await readFileAsDataUrl(f) });
      }
      input.remove();
      resolve(out);
    };
    // Người dùng hủy → không có sự kiện change; dọn sau khi cửa sổ lấy lại focus
    window.addEventListener('focus', () => setTimeout(() => { if (!input.files?.length) { input.remove(); resolve([]); } }, 800), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}
