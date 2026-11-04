/**
 * Lớp component toàn cục (o-*) dựng trên token màu của bản gốc (--c-*, kênh RGB).
 * Được AppComponent nạp với ViewEncapsulation.None nên áp dụng cho mọi trang.
 */
export const UI_KIT_CSS = `
:root { --rail-w: 232px; --rail-w-collapsed: 64px; --titlebar-h: 44px; --statusbar-h: 26px; }
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

/* Thẻ */
.o-card { background: rgb(var(--c-surface-container-low)); border: 1px solid rgb(var(--c-overlay) / 0.06); border-radius: 16px; min-width: 0; }
.o-card-head { display: flex; align-items: flex-start; gap: 12px; padding: 16px 16px 12px; }
.o-card-head .o-card-ico { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgb(var(--c-primary) / 0.12); color: rgb(var(--c-primary)); flex-shrink: 0; }
.o-card-title { font-size: .9375rem; font-weight: 600; line-height: 1.3rem; }
.o-card-sub { font-size: .75rem; color: rgb(var(--c-on-surface-variant)); margin-top: 2px; }
.o-card-body { padding: 0 16px 16px; }
.o-tile { background: rgb(var(--c-surface-container)); border-radius: 12px; padding: 10px 12px; }
.o-skel { background: rgb(var(--c-overlay) / 0.04); border-radius: 12px; animation: o-pulse 1.6s ease-in-out infinite; }

/* Nút */
.o-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 10px; font-size: .8125rem; font-weight: 500; white-space: nowrap; border: 1px solid rgb(var(--c-outline-variant) / 0.6); background: rgb(var(--c-surface-container)); color: rgb(var(--c-on-surface)); cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s, opacity .15s; }
.o-btn:hover:not(:disabled) { background: rgb(var(--c-surface-container-high)); }
.o-btn:disabled { opacity: .5; cursor: not-allowed; }
.o-btn-sm { height: 28px; padding: 0 10px; font-size: .75rem; border-radius: 8px; }
.o-btn-lg { height: 42px; padding: 0 20px; font-size: .875rem; }
.o-btn-primary, .btn-primary { background: rgb(var(--c-primary-container)); color: rgb(var(--c-on-primary-container)); border-color: transparent; font-weight: 600; }
[data-theme='dark'] .o-btn-primary { color: #fff; }
.o-btn-primary:hover:not(:disabled) { background: rgb(var(--c-primary-container)); filter: brightness(1.1); box-shadow: 0 0 18px rgb(var(--c-primary-container) / 0.35); }
[data-theme='halloween'] .o-btn-primary { background: rgb(255 122 0); color: rgb(18 10 2); }
.o-btn-subtle { background: transparent; border-color: transparent; color: rgb(var(--c-on-surface-variant)); }
.o-btn-subtle:hover:not(:disabled) { background: rgb(var(--c-overlay) / 0.06); color: rgb(var(--c-on-surface)); }
.o-btn-danger { background: rgb(var(--c-danger) / 0.12); color: rgb(var(--c-error)); border-color: rgb(var(--c-danger) / 0.3); }
.o-btn-danger:hover:not(:disabled) { background: rgb(var(--c-danger) / 0.2); }
.o-btn-success { background: rgb(var(--c-success) / 0.15); color: rgb(var(--c-tertiary)); border-color: rgb(var(--c-success) / 0.3); }
.o-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; color: rgb(var(--c-on-surface-variant)); background: transparent; border: 0; cursor: pointer; position: relative; }
.o-icon-btn:hover { background: rgb(var(--c-overlay) / 0.07); color: rgb(var(--c-on-surface)); }
.o-icon-btn.active { background: rgb(var(--c-surface-container-high)); color: rgb(var(--c-on-surface)); }

/* Form */
.o-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.o-label { font-size: .75rem; font-weight: 500; color: rgb(var(--c-on-surface-variant)); }
.o-hint { font-size: .6875rem; color: rgb(var(--c-outline)); }
.o-input, .o-select, .o-textarea { width: 100%; background: rgb(var(--c-surface-container-lowest)); border: 1px solid rgb(var(--c-outline-variant) / 0.7); border-radius: 10px; color: rgb(var(--c-on-surface)); font-size: .8125rem; padding: 0 12px; height: 36px; outline: none; transition: border-color .15s, box-shadow .15s; }
.o-textarea { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.45; font-family: inherit; }
.o-input:focus, .o-select:focus, .o-textarea:focus { border-color: rgb(var(--c-primary) / 0.8); box-shadow: 0 0 0 3px rgb(var(--c-primary) / 0.15); }
.o-input::placeholder, .o-textarea::placeholder { color: rgb(var(--c-outline)); }
.o-select { appearance: none; padding-right: 30px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23908fa0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; }
.o-select option { background: rgb(var(--c-surface-container)); color: rgb(var(--c-on-surface)); }
.o-check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: .8125rem; }
.o-check input { accent-color: rgb(var(--c-primary-container)); width: 15px; height: 15px; }
.o-switch { position: relative; width: 36px; height: 20px; border-radius: 999px; background: rgb(var(--c-surface-container-highest)); border: 0; cursor: pointer; flex-shrink: 0; transition: background .15s; }
.o-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: rgb(var(--c-on-surface-variant)); transition: transform .15s, background .15s; }
.o-switch.on { background: rgb(var(--c-primary-container)); }
.o-switch.on::after { transform: translateX(16px); background: #fff; }
.o-range { width: 100%; accent-color: rgb(var(--c-primary-container)); }

/* Badge / chip */
.o-badge { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: 6px; font-size: .6875rem; font-weight: 600; white-space: nowrap; background: rgb(var(--c-overlay) / 0.07); color: rgb(var(--c-on-surface-variant)); }
.o-badge.pill { border-radius: 999px; }
.o-badge.mono { font-family: 'JetBrains Mono Variable', monospace; font-weight: 500; }
.o-badge.success { background: rgb(var(--c-success) / 0.14); color: rgb(var(--c-tertiary)); }
.o-badge.warning { background: rgb(var(--c-warning) / 0.15); color: rgb(var(--c-warning)); }
.o-badge.danger { background: rgb(var(--c-danger) / 0.15); color: rgb(var(--c-error)); }
.o-badge.primary { background: rgb(var(--c-primary) / 0.14); color: rgb(var(--c-primary)); }
.o-badge.secondary { background: rgb(var(--c-secondary) / 0.13); color: rgb(var(--c-secondary)); }
.o-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 999px; font-size: .75rem; border: 1px solid rgb(var(--c-outline-variant) / 0.6); background: transparent; color: rgb(var(--c-on-surface-variant)); cursor: pointer; white-space: nowrap; }
.o-chip:hover { color: rgb(var(--c-on-surface)); background: rgb(var(--c-overlay) / 0.04); }
.o-chip.active { background: rgb(var(--c-primary) / 0.14); border-color: rgb(var(--c-primary) / 0.4); color: rgb(var(--c-primary)); }
.o-plat { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 20px; padding: 0 6px; border-radius: 6px; font-size: .625rem; font-weight: 700; color: #fff; letter-spacing: .02em; }
.o-plat.facebook { background: rgb(var(--c-brand-facebook)); }
.o-plat.tiktok { background: #111; box-shadow: inset 2px 0 rgb(var(--c-brand-tiktok-cyan)), inset -2px 0 rgb(var(--c-brand-tiktok-red)); }
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
.o-kbd { display: inline-flex; align-items: center; height: 18px; padding: 0 5px; border-radius: 4px; font-family: 'JetBrains Mono Variable', monospace; font-size: .625rem; color: rgb(var(--c-on-surface-variant)); background: rgb(var(--c-overlay) / 0.06); border: 1px solid rgb(var(--c-overlay) / 0.08); }
.o-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }

/* Progress */
.o-progress { height: 6px; border-radius: 999px; background: rgb(var(--c-overlay) / 0.07); overflow: hidden; }
.o-progress > div { height: 100%; border-radius: 999px; background: rgb(var(--c-primary-container)); transition: width .3s; }
.o-progress.tertiary > div { background: rgb(var(--c-tertiary)); }
.o-progress.warning > div { background: rgb(var(--c-warning)); }
.o-progress.danger > div { background: rgb(var(--c-danger)); }

/* Bảng */
.o-table-wrap { overflow: auto; border-radius: 12px; border: 1px solid rgb(var(--c-overlay) / 0.06); }
.o-table { width: 100%; border-collapse: collapse; font-size: .8125rem; }
.o-table th { position: sticky; top: 0; background: rgb(var(--c-surface-container)); text-align: left; font-size: .6875rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; color: rgb(var(--c-on-surface-variant)); padding: 8px 12px; white-space: nowrap; z-index: 1; }
.o-table td { padding: 9px 12px; border-top: 1px solid rgb(var(--c-overlay) / 0.05); vertical-align: middle; }
.o-table tbody tr:hover td { background: rgb(var(--c-overlay) / 0.025); }
.o-table tr.selected td { background: rgb(var(--c-primary) / 0.07); }

/* Tabs / segmented */
.o-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: rgb(var(--c-surface-container-lowest)); border: 1px solid rgb(var(--c-overlay) / 0.06); }
.o-seg button { height: 26px; padding: 0 10px; border-radius: 7px; font-size: .75rem; color: rgb(var(--c-on-surface-variant)); background: transparent; border: 0; cursor: pointer; white-space: nowrap; }
.o-seg button.active { background: rgb(var(--c-surface-container-high)); color: rgb(var(--c-on-surface)); font-weight: 600; }
.o-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgb(var(--c-overlay) / 0.07); overflow-x: auto; }
.o-tabs button { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; font-size: .8125rem; color: rgb(var(--c-on-surface-variant)); background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
.o-tabs button.active { color: rgb(var(--c-primary)); border-bottom-color: rgb(var(--c-primary)); font-weight: 600; }

/* Trang */
.o-page { display: flex; flex-direction: column; gap: 20px; padding: 20px 24px 32px; max-width: 1680px; margin: 0 auto; width: 100%; }
.o-page-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px 16px; }
.o-page-head .o-page-ico { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgb(var(--c-primary) / 0.22), rgb(var(--c-secondary) / 0.12)); color: rgb(var(--c-primary)); flex-shrink: 0; }
.o-page-title { font-size: 1.375rem; line-height: 1.8rem; font-weight: 700; letter-spacing: -0.02em; }
[data-theme='halloween'] .o-page-title { font-family: 'Space Grotesk Variable', 'Inter Variable', sans-serif; }
.o-page-desc { font-size: .8125rem; color: rgb(var(--c-on-surface-variant)); margin-top: 2px; }
.o-page-actions { margin-left: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
@media (max-width: 640px) { .o-page { padding: 14px 12px 24px; gap: 14px; } .o-page-actions { margin-left: 0; width: 100%; } .o-page-title { font-size: 1.125rem; } }
.o-banner { flex-wrap: wrap; min-width: 0; }
omni-shell, omni-auth-gate { display: block; }
.main > * { display: block; min-width: 0; }
.o-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 36px 16px; text-align: center; color: rgb(var(--c-on-surface-variant)); font-size: .8125rem; }
.o-empty .o-icon { color: rgb(var(--c-outline)); }
.o-divider { height: 1px; background: rgb(var(--c-overlay) / 0.07); }
.o-scroll { overflow: auto; scrollbar-width: thin; scrollbar-color: rgb(var(--c-overlay) / 0.15) transparent; }
.o-list-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; cursor: pointer; transition: background .12s; min-width: 0; }
.o-list-item:hover { background: rgb(var(--c-overlay) / 0.04); }
.o-list-item.active { background: rgb(var(--c-primary) / 0.1); box-shadow: inset 2px 0 rgb(var(--c-primary)); }
.o-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; font-size: .8125rem; border: 1px solid rgb(var(--c-outline-variant) / 0.4); background: rgb(var(--c-surface-container-lowest)); }
.o-banner.warning { border-color: rgb(var(--c-warning) / 0.3); background: rgb(var(--c-warning) / 0.06); }
.o-banner.danger { border-color: rgb(var(--c-danger) / 0.3); background: rgb(var(--c-danger) / 0.06); }
.o-banner.primary { border-color: rgb(var(--c-primary) / 0.3); background: rgb(var(--c-primary) / 0.06); }
.o-banner.success { border-color: rgb(var(--c-success) / 0.3); background: rgb(var(--c-success) / 0.06); }
.o-code { font-family: 'JetBrains Mono Variable', monospace; font-size: .75rem; }

/* Modal */
.o-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.55); backdrop-filter: blur(3px); z-index: 80; animation: o-fade .15s; }
@keyframes o-fade { from { opacity: 0; } }
.o-modal { position: fixed; z-index: 81; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: rgb(var(--c-surface-container-low)); border: 1px solid rgb(var(--c-overlay) / 0.08); border-radius: 18px; box-shadow: 0 24px 64px rgb(0 0 0 / 0.45); animation: o-fade .15s; }
.o-modal-wide { width: min(920px, calc(100vw - 32px)); }
.o-drawer { left: auto; right: 0; top: 0; transform: none; height: 100vh; max-height: 100vh; border-radius: 18px 0 0 18px; width: min(560px, 100vw); }
.o-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px 10px; }
.o-modal-body { padding: 6px 18px 14px; overflow: auto; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.o-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px 16px; border-top: 1px solid rgb(var(--c-overlay) / 0.05); }
.o-modal-foot:empty { display: none; }

/* Tooltip chart */
.o-tooltip { position: absolute; top: 4px; transform: translateX(-50%); min-width: 150px; pointer-events: none; padding: 8px 10px; border-radius: 10px; background: rgb(var(--c-surface-container-highest)); border: 1px solid rgb(var(--c-overlay) / 0.08); box-shadow: 0 8px 24px rgb(0 0 0 / 0.3); display: flex; flex-direction: column; gap: 3px; z-index: 5; }

/* Popover */
.o-pop { position: absolute; z-index: 60; min-width: 220px; background: rgb(var(--c-surface-container-high)); border: 1px solid rgb(var(--c-overlay) / 0.08); border-radius: 14px; box-shadow: 0 16px 40px rgb(0 0 0 / 0.4); padding: 6px; animation: o-in .12s ease-out; }
.o-pop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: 9px; font-size: .8125rem; color: rgb(var(--c-on-surface)); background: transparent; border: 0; cursor: pointer; text-align: left; }
.o-pop-item:hover, .o-pop-item.active { background: rgb(var(--c-overlay) / 0.06); }

/* Lưới tiện ích nhỏ không phụ thuộc Tailwind */
.o-grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.o-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.o-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
@media (min-width: 1200px) { .o-two { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); } .o-two.even { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .o-two.wide-r { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); } }
.o-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
`;
