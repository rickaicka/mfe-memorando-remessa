import { Component, computed, inject } from '@angular/core';
import { HubSessionService } from '@daruix/hub-auth';

@Component({
  selector: 'app-remessas-home',
  standalone: true,
  templateUrl: './remessas-home.component.html',
})
export class RemessasHomeComponent {
  readonly session = inject(HubSessionService);

  readonly usuario = this.session.usuario;

  readonly nomeUsuario = computed(() =>
    this.usuario()?.nome ?? this.usuario()?.username ?? 'Usuário'
  );

  readonly podeVerFinanceiro = computed(() =>
    this.session.hasPermission('financeiro.ver')
  );
}
