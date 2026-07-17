import { Routes } from '@angular/router';

export const REMESSAS_ROUTES: Routes = [
  {
    path: 'lista',
    loadComponent: () =>
      import('../features/remessas/pages/remessas-list/remessas-list.component')
        .then(m => m.MemorandoRemessaListaComponent),
  },
  {
    path: 'cadastrar',
    loadComponent: () =>
      import('../features/remessas/pages/cadastrar-memorando-remessas/cadastrar-memorando-remessas')
        .then(m => m.CadastrarMemorandoRemessas),
  },
];
