import { Routes } from '@angular/router';

export const REMESSAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../features/remessas/pages/remessas-home/remessas-home.component')
        .then(m => m.RemessasHomeComponent),
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('../features/remessas/pages/remessas-list/remessas-list.component')
        .then(m => m.MemorandoRemessaListaComponent),
  },
];
