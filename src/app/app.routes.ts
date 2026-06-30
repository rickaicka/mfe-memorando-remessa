import { Routes } from '@angular/router';

export const REMESSAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/remessas/pages/remessas-home/remessas-home.component').then(c => c.RemessasHomeComponent),
  },
];
