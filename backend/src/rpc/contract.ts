export type ApiErrorCode =
  | 'VALIDATION'
  | 'AUTH'
  | 'LICENSE'
  | 'FEATURE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'QUOTA'
  | 'BUDGET'
  | 'AI'
  | 'EXTERNAL'
  | 'INTERNAL';

export interface ApiErrorPayload {
  code: ApiErrorCode | string;
  message: string;
}

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

export const PUBLIC_ENDPOINTS = new Set<string>([
  'auth.state',
  'auth.login',
  'auth.register',
  'auth.registerVerify',
  'auth.registerResend',
  'auth.forgotPassword',
  'auth.resetPassword',
  'auth.checkReferral',
  'cloud.appInfo',
  'cloud.updateStatus',
  'cloud.downloadUpdate',
  'cloud.installUpdate',
  'storage.location',
  'storage.useExisting',
  'storage.openRoot',
  'system.logInfo',
  'system.openLogs',
]);

export const UNLICENSED_ENDPOINTS = new Set<string>([
  'auth.logout',
  'auth.changePassword',
  'auth.updateProfile',
  'license.state',
  'license.refresh',
  'license.activate',
  'license.devices',
  'license.removeDevice',
  'billing.plans',
  'billing.createOrder',
  'billing.order',
  'billing.orders',
  'billing.referral',
  'billing.promotions',
  'cloud.notifications',
  'cloud.notificationsSeen',
  'support.list',
  'support.get',
  'support.create',
  'support.reply',
  'support.attachment',
  'support.pickImages',
  'system.openExternal',
]);

export const FEATURE_GATES: Record<string, string> = {
  series: 'SERIES',
  studio: 'STUDIO',
  imagestudio: 'STUDIO',
  tts: 'STUDIO',
  film: 'FILM',
  clone: 'FILM',
  posts: 'CALENDAR',
  inbox: 'INBOX',
  analytics: 'ANALYTICS',
};
