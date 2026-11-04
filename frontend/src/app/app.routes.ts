import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'workspaces',
    loadComponent: () =>
      import('./features/workspaces/workspaces.page').then((m) => m.WorkspacesPageComponent),
  },
  {
    path: 'accounts',
    loadComponent: () =>
      import('./features/accounts/accounts.page').then((m) => m.AccountsPageComponent),
  },
  {
    path: 'plan',
    loadComponent: () =>
      import('./features/plan/plan.page').then((m) => m.PlanPageComponent),
  },
  {
    path: 'content',
    loadComponent: () =>
      import('./features/content/content.page').then((m) => m.ContentPageComponent),
  },
  {
    path: 'series',
    loadComponent: () =>
      import('./features/series/series.page').then((m) => m.SeriesPageComponent),
  },
  {
    path: 'studio',
    loadComponent: () =>
      import('./features/studio/studio.page').then((m) => m.StudioPageComponent),
  },
  {
    path: 'film',
    loadComponent: () =>
      import('./features/film/film.page').then((m) => m.FilmPageComponent),
  },
  {
    path: 'film/:id',
    loadComponent: () =>
      import('./features/film/film.page').then((m) => m.FilmPageComponent),
  },
  {
    path: 'clone',
    loadComponent: () =>
      import('./features/clone/clone.page').then((m) => m.ClonePageComponent),
  },
  {
    path: 'image-studio',
    loadComponent: () =>
      import('./features/image-studio/image-studio.page').then((m) => m.ImageStudioPageComponent),
  },
  {
    path: 'tts',
    loadComponent: () =>
      import('./features/tts/tts.page').then((m) => m.TtsPageComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.page').then((m) => m.CalendarPageComponent),
  },
  {
    path: 'inbox',
    loadComponent: () =>
      import('./features/inbox/inbox.page').then((m) => m.InboxPageComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.page').then((m) => m.AnalyticsPageComponent),
  },
  {
    path: 'billing',
    loadComponent: () =>
      import('./features/billing/billing.page').then((m) => m.BillingPageComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.page').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'guide',
    loadComponent: () =>
      import('./features/guide/guide.page').then((m) => m.GuidePageComponent),
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./features/support/support.page').then((m) => m.SupportPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
