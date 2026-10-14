import { Routes } from '@angular/router';
import { hubPermissionGuard } from '@daruix/hub-auth';

export const REMESSAS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'lista',
  },
  {
    path: 'lista',
    canActivate: [hubPermissionGuard],
    loadComponent: () =>
      import('../features/remessas/pages/remessas-list/remessas-list.component').then(
        (m) => m.MemorandoRemessaListaComponent,
      ),
  },
  {
    path: 'novo-memorando',
    canActivate: [hubPermissionGuard],
    loadComponent: () =>
      import('../features/remessas/pages/cadastrar-memorando-remessas/cadastrar-memorando-remessas').then(
        (m) => m.CadastrarMemorandoRemessas,
      ),
  },
  {
    path: 'editar-memorando/:id',
    loadComponent: () =>
      import('../features/remessas/pages/cadastrar-memorando-remessas/cadastrar-memorando-remessas').then(
        (m) => m.CadastrarMemorandoRemessas,
      ),
  },
];
