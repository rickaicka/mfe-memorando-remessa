import { Routes } from '@angular/router';

export const REMESSAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/remessas/pages/remessas-list/remessas-list.component').then(
        (c) => c.MemorandoRemessaListaComponent,
      ),
  },
  {
    path: 'novo-memorando',
    loadComponent: () =>
      import('./features/remessas/pages/cadastrar-memorando-remessas/cadastrar-memorando-remessas').then(
        (c) => c.CadastrarMemorandoRemessas,
      ),
  },
];
