/**
 * Hệ thống Design System 2026 (o-*) dựng trên token màu động (--c-*, kênh RGB).
 * Hỗ trợ đầy đủ Dark Mode (Obsidian Slate), Light Mode (Crisp Daylight) và Halloween.
 * Được AppComponent nạp với ViewEncapsulation.None nên áp dụng đồng nhất cho mọi trang.
 */
export const UI_KIT_CSS = `
:root {
  --rail-w: 244px;
  --rail-w-collapsed: 64px;
  --titlebar-h: 52px;
  --statusbar-h: 28px;
  --mobile-nav-h: 60px;
}

html, body {
  height: 100%;
  height: 100dvh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  overscroll-behavior-y: none;
  -webkit-font-smoothing: antialiased;
}

.o-muted { color: rgb(var(--c-on-surface-variant)); }
.o-faint { color: rgb(var(--c-outline)); }
.o-primary { color: rgb(var(--c-primary)); }
.o-secondary { color: rgb(var(--c-secondary)); }
.o-tertiary { color: rgb(var(--c-tertiary)); }
.o-warning { color: rgb(var(--c-warning)); }
.o-error { color: rgb(var(--c-error)); }
.o-success { color: rgb(var(--c-success)); }
.o-icon { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; }
.o-icon svg { display: block; }
.o-spin svg, .o-spin { animation: o-spin 1s linear infinite; }
@keyframes o-spin { to { transform: rotate(360deg); } }
@keyframes o-pulse { 50% { opacity: .45; } }
@keyframes o-in { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }

/* Ambient Top Glow cho khung trang hiện đại */
.main::before {
  content: '';
  position: fixed;
  top: var(--titlebar-h);
  left: var(--rail-w);
  right: 0;
  height: 300px;
  background:
    radial-gradient(ellipse 65% 160px at 30% 0%, rgb(var(--c-primary-container) / 0.11), transparent 70%),
    radial-gradient(ellipse 50% 140px at 78% 0%, rgb(var(--c-secondary) / 0.08), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
[data-theme='light'] .main::before {
  background:
    radial-gradient(ellipse 65% 180px at 30% 0%, rgb(var(--c-primary-container) / 0.07), transparent 70%),
    radial-gradient(ellipse 50% 150px at 78% 0%, rgb(var(--c-secondary) / 0.06), transparent 70%);
}

/* Thẻ (Cards) – 2026 Glass & Crisp Surface */
.o-card {
  position: relative;
  background: rgb(var(--c-surface-container-low));
  border: 1px solid rgb(var(--c-overlay) / 0.08);
  border-radius: 16px;
  min-width: 0;
  max-width: 100%;
  box-shadow:
    inset 0 1px 0 0 rgb(255 255 255 / 0.04),
    0 4px 20px -2px rgb(0 0 0 / 0.28);
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
[data-theme='light'] .o-card {
  background: rgb(var(--c-surface-container-lowest));
  border: 1px solid rgb(var(--c-outline-variant) / 0.78);
  box-shadow:
    0 1px 2px rgb(15 23 42 / 0.04),
    0 6px 18px -4px rgb(15 23 42 / 0.06);
}
.o-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 16px 18px 12px;
}
.o-card-head .o-card-ico {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--c-primary) / 0.16), rgb(var(--c-primary-container) / 0.08));
  border: 1px solid rgb(var(--c-primary) / 0.2);
  color: rgb(var(--c-primary));
  flex-shrink: 0;
}
.o-card-title { font-size: .9375rem; font-weight: 600; line-height: 1.35rem; letter-spacing: -0.01em; color: rgb(var(--c-on-surface)); }
.o-card-sub { font-size: .75rem; color: rgb(var(--c-on-surface-variant)); margin-top: 2px; line-height: 1.15rem; }
.o-card-body { padding: 0 18px 18px; min-width: 0; }

.o-tile {
  background: rgb(var(--c-surface-container));
  border: 1px solid rgb(var(--c-overlay) / 0.06);
  border-radius: 12px;
  padding: 12px 14px;
  min-width: 0;
  transition: border-color .15s ease, background .15s ease;
}
[data-theme='light'] .o-tile {
  background: rgb(var(--c-surface-container-low));
  border: 1px solid rgb(var(--c-outline-variant) / 0.65);
}
.o-skel { background: rgb(var(--c-overlay) / 0.06); border-radius: 12px; animation: o-pulse 1.6s ease-in-out infinite; }

/* Nút (Buttons) – Tactile 2026 SaaS Controls */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: .8125rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid rgb(var(--c-outline-variant) / 0.72);
  background: rgb(var(--c-surface-container));
  color: rgb(var(--c-on-surface));
  cursor: pointer;
  user-select: none;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .1s ease, opacity .15s ease;
}
[data-theme='light'] .o-btn {
  background: #ffffff;
  border-color: rgb(var(--c-outline-variant));
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
}
.o-btn:hover:not(:disabled) {
  background: rgb(var(--c-surface-container-high));
  border-color: rgb(var(--c-outline) / 0.65);
}
[data-theme='light'] .o-btn:hover:not(:disabled) {
  background: rgb(var(--c-surface-container-low));
  border-color: rgb(var(--c-outline) / 0.6);
}
.o-btn:active:not(:disabled) { transform: translateY(1px); }
.o-btn:disabled { opacity: .48; cursor: not-allowed; }
.o-btn-sm { min-height: 30px; padding: 0 10px; font-size: .75rem; border-radius: 8px; gap: 5px; }
.o-btn-lg { min-height: 42px; padding: 0 20px; font-size: .875rem; border-radius: 11px; gap: 8px; }

.o-btn-primary, .btn-primary {
  background: linear-gradient(135deg, rgb(var(--c-primary-container)), rgb(var(--c-primary-container) / 0.88)) !important;
  color: #ffffff !important;
  border-color: rgb(255 255 255 / 0.14) !important;
  font-weight: 600;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    0 2px 8px rgb(var(--c-primary-container) / 0.3);
}
.o-btn-primary:hover:not(:disabled), .btn-primary:hover:not(:disabled) {
  filter: brightness(1.07);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.25),
    0 4px 16px rgb(var(--c-primary-container) / 0.42);
}
[data-theme='halloween'] .o-btn-primary {
  background: linear-gradient(135deg, rgb(255 122 0), rgb(234 88 12)) !important;
  color: rgb(18 10 2) !important;
}

.o-btn-subtle, .o-btn-ghost {
  background: transparent !important;
  border-color: transparent !important;
  color: rgb(var(--c-on-surface-variant));
  box-shadow: none !important;
}
.o-btn-subtle:hover:not(:disabled), .o-btn-ghost:hover:not(:disabled) {
  background: rgb(var(--c-overlay) / 0.07) !important;
  color: rgb(var(--c-on-surface));
}
.o-btn-danger {
  background: rgb(var(--c-danger) / 0.12) !important;
  color: rgb(var(--c-error)) !important;
  border-color: rgb(var(--c-danger) / 0.3) !important;
}
.o-btn-danger:hover:not(:disabled) { background: rgb(var(--c-danger) / 0.2) !important; }
.o-btn-success {
  background: rgb(var(--c-success) / 0.14) !important;
  color: rgb(var(--c-tertiary)) !important;
  border-color: rgb(var(--c-success) / 0.3) !important;
}

.o-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: rgb(var(--c-on-surface-variant));
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background .14s ease, color .14s ease, border-color .14s ease;
}
.o-icon-btn:hover { background: rgb(var(--c-overlay) / 0.07); color: rgb(var(--c-on-surface)); }
.o-icon-btn.active {
  background: rgb(var(--c-surface-container-high));
  color: rgb(var(--c-primary));
  border-color: rgb(var(--c-primary) / 0.25);
}

/* Form Controls */
.o-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.o-label { font-size: .75rem; font-weight: 600; color: rgb(var(--c-on-surface-variant)); letter-spacing: 0.01em; }
.o-hint { font-size: .6875rem; color: rgb(var(--c-outline)); }
.o-input, .o-select, .o-textarea {
  width: 100%;
  min-width: 0;
  background: rgb(var(--c-surface-container-lowest));
  border: 1px solid rgb(var(--c-outline-variant) / 0.8);
  border-radius: 10px;
  color: rgb(var(--c-on-surface));
  font-size: .8125rem;
  padding: 0 12px;
  height: 38px;
  outline: none;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.04);
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
[data-theme='light'] .o-input,
[data-theme='light'] .o-select,
[data-theme='light'] .o-textarea {
  background: #ffffff;
  border-color: rgb(var(--c-outline-variant));
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 0.03);
}
.o-input:hover:not(:focus), .o-select:hover:not(:focus), .o-textarea:hover:not(:focus) {
  border-color: rgb(var(--c-outline) / 0.65);
}
.o-textarea { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.45; font-family: inherit; }
.o-input:focus, .o-select:focus, .o-textarea:focus {
  border-color: rgb(var(--c-primary));
  box-shadow: 0 0 0 3px rgb(var(--c-primary-container) / 0.18);
}
.o-input::placeholder, .o-textarea::placeholder { color: rgb(var(--c-outline)); }
.o-select {
  appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  background-size: 16px;
}
.o-select option { background: rgb(var(--c-surface-container)); color: rgb(var(--c-on-surface)); }
.o-check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: .8125rem; color: rgb(var(--c-on-surface)); }
.o-check input { accent-color: rgb(var(--c-primary-container)); width: 16px; height: 16px; }
.o-switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: rgb(var(--c-surface-container-highest));
  border: 1px solid rgb(var(--c-outline-variant) / 0.6);
  cursor: pointer;
  flex-shrink: 0;
  transition: background .18s ease, border-color .18s ease;
}
.o-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgb(var(--c-on-surface-variant));
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  transition: transform .18s cubic-bezier(.16, 1, .3, 1), background .18s ease;
}
.o-switch.on {
  background: rgb(var(--c-primary-container));
  border-color: rgb(var(--c-primary-container));
}
.o-switch.on::after { transform: translateX(18px); background: #fff; }
.o-range { width: 100%; accent-color: rgb(var(--c-primary-container)); }

/* Badge / Chip */
.o-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: .6875rem;
  font-weight: 600;
  white-space: nowrap;
  background: rgb(var(--c-overlay) / 0.07);
  border: 1px solid rgb(var(--c-overlay) / 0.06);
  color: rgb(var(--c-on-surface-variant));
  flex-shrink: 0;
}
.o-badge.pill { border-radius: 999px; padding: 0 9px; }
.o-badge.mono { font-family: 'JetBrains Mono Variable', monospace; font-weight: 500; }
.o-badge.success { background: rgb(var(--c-success) / 0.14); border-color: rgb(var(--c-success) / 0.25); color: rgb(var(--c-tertiary)); }
.o-badge.warning { background: rgb(var(--c-warning) / 0.15); border-color: rgb(var(--c-warning) / 0.28); color: rgb(var(--c-warning)); }
.o-badge.danger { background: rgb(var(--c-danger) / 0.15); border-color: rgb(var(--c-danger) / 0.28); color: rgb(var(--c-error)); }
.o-badge.primary { background: rgb(var(--c-primary) / 0.14); border-color: rgb(var(--c-primary) / 0.26); color: rgb(var(--c-primary)); }
.o-badge.secondary { background: rgb(var(--c-secondary) / 0.13); border-color: rgb(var(--c-secondary) / 0.25); color: rgb(var(--c-secondary)); }

.o-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: .75rem;
  border: 1px solid rgb(var(--c-outline-variant) / 0.75);
  background: rgb(var(--c-surface-container-lowest));
  color: rgb(var(--c-on-surface-variant));
  cursor: pointer;
  white-space: nowrap;
  transition: all .14s ease;
}
.o-chip:hover { color: rgb(var(--c-on-surface)); background: rgb(var(--c-surface-container-high)); }
.o-chip.active {
  background: rgb(var(--c-primary) / 0.14);
  border-color: rgb(var(--c-primary) / 0.45);
  color: rgb(var(--c-primary));
  font-weight: 600;
}

.o-plat { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 20px; padding: 0 6px; border-radius: 6px; font-size: .625rem; font-weight: 700; color: #fff; letter-spacing: .02em; flex-shrink: 0; }
.o-plat.facebook { background: rgb(var(--c-brand-facebook)); }
.o-plat.tiktok { background: #111827; box-shadow: inset 2px 0 rgb(var(--c-brand-tiktok-cyan)), inset -2px 0 rgb(var(--c-brand-tiktok-red)); }
.o-plat.instagram { background: linear-gradient(45deg, #f09433, #dc2743 50%, #bc1888); }
.o-plat.youtube { background: rgb(var(--c-brand-youtube)); }
.o-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: rgb(var(--c-outline)); }
.o-dot.success { background: rgb(var(--c-success)); }
.o-dot.warning { background: rgb(var(--c-warning)); }
.o-dot.danger { background: rgb(var(--c-danger)); }
.o-dot.live { box-shadow: 0 0 0 0 rgb(var(--c-success) / .6); animation: o-ping 1.6s infinite; }
@keyframes o-ping { 0% { box-shadow: 0 0 0 0 rgb(var(--c-success) / .55); } 80%, 100% { box-shadow: 0 0 0 6px rgb(var(--c-success) / 0); } }
.o-avatar { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: rgb(var(--c-surface-container-highest)); color: rgb(var(--c-on-surface-variant)); font-size: .75rem; font-weight: 600; flex-shrink: 0; overflow: hidden; }
.o-avatar img { width: 100%; height: 100%; object-fit: cover; }
.o-kbd { display: inline-flex; align-items: center; height: 19px; padding: 0 5px; border-radius: 5px; font-family: 'JetBrains Mono Variable', monospace; font-size: .625rem; color: rgb(var(--c-on-surface-variant)); background: rgb(var(--c-overlay) / 0.06); border: 1px solid rgb(var(--c-overlay) / 0.1); }
.o-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }

/* Progress */
.o-progress { height: 7px; border-radius: 999px; background: rgb(var(--c-overlay) / 0.09); overflow: hidden; }
.o-progress > div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgb(var(--c-primary-container)), rgb(var(--c-secondary))); transition: width .3s ease; }
.o-progress.tertiary > div { background: rgb(var(--c-tertiary)); }
.o-progress.warning > div { background: rgb(var(--c-warning)); }
.o-progress.danger > div { background: rgb(var(--c-danger)); }

/* Bảng (Tables) */
.o-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
  border: 1px solid rgb(var(--c-overlay) / 0.08);
  max-width: 100%;
  background: rgb(var(--c-surface-container-lowest));
}
[data-theme='light'] .o-table-wrap { border-color: rgb(var(--c-outline-variant) / 0.75); }
.o-table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: .8125rem; }
.o-table th { position: sticky; top: 0; background: rgb(var(--c-surface-container)); text-align: left; font-size: .6875rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: rgb(var(--c-on-surface-variant)); padding: 10px 13px; white-space: nowrap; z-index: 1; }
.o-table td { padding: 11px 13px; border-top: 1px solid rgb(var(--c-overlay) / 0.06); vertical-align: middle; }
.o-table tbody tr:hover td { background: rgb(var(--c-overlay) / 0.03); }
.o-table tr.selected td { background: rgb(var(--c-primary) / 0.08); }

/* Tabs / Segmented Controls */
.o-seg {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 4px;
  gap: 3px;
  border-radius: 12px;
  background: rgb(var(--c-surface-container-lowest));
  border: 1px solid rgb(var(--c-overlay) / 0.08);
  max-width: 100%;
  overflow-x: auto;
}
[data-theme='light'] .o-seg {
  background: rgb(var(--c-surface-container));
  border-color: rgb(var(--c-outline-variant) / 0.75);
}
.o-seg button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: .78rem;
  font-weight: 500;
  color: rgb(var(--c-on-surface-variant));
  background: transparent;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
  transition: all .14s ease;
}
.o-seg button:hover:not(.active) { color: rgb(var(--c-on-surface)); background: rgb(var(--c-overlay) / 0.04); }
.o-seg button.active {
  background: rgb(var(--c-surface-container-high));
  color: rgb(var(--c-on-surface));
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.14);
}
[data-theme='light'] .o-seg button.active {
  background: #ffffff;
  color: rgb(var(--c-primary));
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
}

.o-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgb(var(--c-overlay) / 0.08); overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.o-tabs::-webkit-scrollbar { display: none; }
.o-tabs button { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; font-size: .8125rem; color: rgb(var(--c-on-surface-variant)); background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: color .14s ease; }
.o-tabs button:hover { color: rgb(var(--c-on-surface)); }
.o-tabs button.active { color: rgb(var(--c-primary)); border-bottom-color: rgb(var(--c-primary)); font-weight: 600; }

/* Trang (Page Layout) */
.o-page { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 18px; padding: 22px 26px 40px; max-width: 1680px; margin: 0 auto; width: 100%; min-width: 0; }
.o-page-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px 16px; }
.o-page-head .o-page-ico {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--c-primary-container) / 0.22), rgb(var(--c-secondary) / 0.14));
  border: 1px solid rgb(var(--c-primary) / 0.25);
  color: rgb(var(--c-primary));
  box-shadow: 0 4px 14px rgb(var(--c-primary-container) / 0.12);
  flex-shrink: 0;
}
.o-page-title { font-size: 1.4rem; line-height: 1.8rem; font-weight: 700; letter-spacing: -0.022em; color: rgb(var(--c-on-surface)); }
[data-theme='halloween'] .o-page-title { font-family: 'Space Grotesk Variable', 'Inter Variable', sans-serif; }
.o-page-desc { font-size: .8125rem; color: rgb(var(--c-on-surface-variant)); margin-top: 2px; line-height: 1.3rem; }
.o-page-actions { margin-left: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

omni-shell, omni-auth-gate { display: block; width: 100%; max-width: 100vw; }
.main > * { display: block; min-width: 0; max-width: 100%; }
.o-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 34px 16px; text-align: center; color: rgb(var(--c-on-surface-variant)); font-size: .8125rem; }
.o-empty .o-icon { color: rgb(var(--c-outline)); }
.o-divider { height: 1px; background: rgb(var(--c-overlay) / 0.08); }
[data-theme='light'] .o-divider { background: rgb(var(--c-outline-variant) / 0.65); }
.o-scroll { overflow: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgb(var(--c-overlay) / 0.18) transparent; }
.o-list-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background .12s; min-width: 0; }
.o-list-item:hover { background: rgb(var(--c-overlay) / 0.04); }
.o-list-item.active { background: rgb(var(--c-primary) / 0.1); box-shadow: inset 2px 0 rgb(var(--c-primary)); }
.o-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 15px; border-radius: 12px; font-size: .8125rem; border: 1px solid rgb(var(--c-outline-variant) / 0.5); background: rgb(var(--c-surface-container-lowest)); min-width: 0; }
.o-banner.warning { border-color: rgb(var(--c-warning) / 0.35); background: rgb(var(--c-warning) / 0.08); }
.o-banner.danger { border-color: rgb(var(--c-danger) / 0.35); background: rgb(var(--c-danger) / 0.08); }
.o-banner.primary { border-color: rgb(var(--c-primary) / 0.35); background: rgb(var(--c-primary) / 0.08); }
.o-banner.success { border-color: rgb(var(--c-success) / 0.35); background: rgb(var(--c-success) / 0.08); }
.o-code { font-family: 'JetBrains Mono Variable', monospace; font-size: .75rem; }

/* Modal & Drawer */
.o-backdrop { position: fixed; inset: 0; background: rgb(2 6 23 / 0.62); backdrop-filter: blur(5px); z-index: 80; animation: o-fade .15s; }
@keyframes o-fade { from { opacity: 0; } }
.o-modal {
  position: fixed;
  z-index: 81;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  background: rgb(var(--c-surface-container-low));
  border: 1px solid rgb(var(--c-overlay) / 0.12);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.45);
  animation: o-fade .15s;
}
[data-theme='light'] .o-modal {
  background: #ffffff;
  border-color: rgb(var(--c-outline-variant));
  box-shadow: 0 24px 60px rgb(15 23 42 / 0.22);
}
.o-modal-wide { width: min(920px, calc(100vw - 24px)); }
.o-drawer { left: auto; right: 0; top: 0; transform: none; height: 100dvh; max-height: 100dvh; border-radius: 18px 0 0 18px; width: min(560px, 100vw); }
.o-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px 10px; }
.o-modal-body { padding: 6px 18px 14px; overflow: auto; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.o-modal-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 12px 18px 16px; border-top: 1px solid rgb(var(--c-overlay) / 0.06); }
.o-modal-foot:empty { display: none; }

/* Tooltip chart */
.o-tooltip { position: absolute; top: 4px; transform: translateX(-50%); min-width: 150px; pointer-events: none; padding: 8px 10px; border-radius: 10px; background: rgb(var(--c-surface-container-highest)); border: 1px solid rgb(var(--c-overlay) / 0.1); box-shadow: 0 8px 24px rgb(0 0 0 / 0.25); display: flex; flex-direction: column; gap: 3px; z-index: 5; }

/* Popover */
.o-pop {
  position: absolute;
  z-index: 60;
  min-width: 220px;
  max-width: calc(100vw - 20px);
  background: rgb(var(--c-surface-container-high));
  border: 1px solid rgb(var(--c-overlay) / 0.1);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.38);
  padding: 6px;
  animation: o-in .12s ease-out;
}
[data-theme='light'] .o-pop {
  background: #ffffff;
  border-color: rgb(var(--c-outline-variant));
  box-shadow: 0 16px 40px rgb(15 23 42 / 0.14);
}
.o-pop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 11px; border-radius: 9px; font-size: .8125rem; color: rgb(var(--c-on-surface)); background: transparent; border: 0; cursor: pointer; text-align: left; text-decoration: none; transition: background .12s; }
.o-pop-item:hover, .o-pop-item.active { background: rgb(var(--c-overlay) / 0.06); }

/* Responsive Grids & Split Layouts */
.o-grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 14px; }
.o-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.o-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
@media (min-width: 1120px) {
  .o-two { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .o-two.even { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .o-two.wide-r { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
}
.o-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }

/* ── Tablet & Mobile Responsive Rules ── */
@media (max-width: 1024px) {
  .o-page { padding: 16px 16px 28px; gap: 16px; }
  .main::before { left: 0; }
  .o-page [style*="grid-template-columns: 280px"],
  .o-page [style*="grid-template-columns: 260px"],
  .o-page [style*="grid-template-columns: 300px"],
  .o-page [style*="grid-template-columns: 320px"],
  .o-page [style*="grid-template-columns: 1fr 320px"],
  .o-page [style*="grid-template-columns: 1fr 340px"],
  .o-page [style*="grid-template-columns: 1fr 360px"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}

@media (max-width: 768px) {
  .o-page { padding: 14px 12px 24px; gap: 14px; }
  .o-page-head { gap: 10px 12px; }
  .o-page-head .o-page-ico { width: 36px; height: 36px; border-radius: 10px; }
  .o-page-title { font-size: 1.15rem; line-height: 1.5rem; }
  .o-page-desc { font-size: .775rem; }
  .o-page-actions { margin-left: 0; width: 100%; }
  .o-page-actions > .o-btn { flex: 1 1 auto; }
  .o-card-head { padding: 13px 14px 10px; }
  .o-card-body { padding: 0 14px 14px; }
  .o-grid-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .o-input, .o-select, .o-textarea { font-size: 16px; height: 40px; }
  .o-btn { min-height: 38px; }
  .o-btn-sm { min-height: 32px; }
  .o-modal:not(.o-drawer) {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100vw;
    max-height: 90dvh;
    border-radius: 20px 20px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .o-drawer {
    width: min(100vw, 440px);
    border-radius: 0;
  }
}

@media (max-width: 480px) {
  .o-grid-kpi { grid-template-columns: minmax(0, 1fr); }
}
`;
