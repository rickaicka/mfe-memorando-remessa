MFE Memorando de Remessa
Micro front-end do módulo de Memorando de Remessas do Daruix Hub.
Visão geral
Este projeto é um MFE Angular carregado pelo `daruix-hub-shell` via Native Federation. Ele deve funcionar como módulo independente em desenvolvimento, mas também ser consumido dinamicamente pelo Shell no ambiente do Hub.
Stack principal
Angular 21
TypeScript
SCSS
Angular Router
Native Federation
`@daruix/hub-auth`
Instalação
```bash
npm install
```
Servidor de desenvolvimento
```bash
npm start
```
ou:
```bash
ng serve
```
A porta local pode variar conforme a configuração do `angular.json`. No ambiente de integração com o Shell, este MFE normalmente deve rodar em uma porta dedicada, por exemplo:
```txt
http://localhost:4300
```
Exposição via Native Federation
O MFE expõe suas rotas para o Shell por meio do arquivo configurado no `federation.config.js`.
Exemplo esperado:
```js
module.exports = withNativeFederation({
  name: 'remessas',
  exposes: {
    './Routes': './src/app/remote-entry/entry.routes.ts'
  }
});
```
O Shell deve carregar o remote usando o mesmo nome configurado:
```ts
loadRemoteModule('remessas', './Routes')
```
Rotas remotas
O arquivo exposto deve exportar um array de rotas Angular, por exemplo:
```ts
import { Routes } from '@angular/router';

export const REMESSAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../features/remessas/pages/remessas-home/remessas-home.component')
        .then(c => c.RemessasHomeComponent)
  }
];
```
O nome exportado deve bater com o que o Shell espera.
Autenticação e sessão
Este MFE não deve depender da `AuthStore` do Shell. Para acessar sessão, usuário, token e permissões, use o pacote compartilhado:
```bash
npm install @daruix/hub-auth
```
Exemplo de uso:
```ts
import { Component, computed, inject } from '@angular/core';
import { HubSessionService } from '@daruix/hub-auth';

@Component({
  selector: 'app-remessas-home',
  standalone: true,
  templateUrl: './remessas-home.component.html'
})
export class RemessasHomeComponent {
  private readonly session = inject(HubSessionService);

  readonly usuario = this.session.usuario;
  readonly nomeUsuario = computed(() =>
    this.usuario()?.nome ?? this.usuario()?.username ?? 'Usuário'
  );

  readonly podeVerRemessas = computed(() =>
    this.session.hasPermission('remessas.ver')
  );
}
```
Interceptor HTTP
Configure o interceptor da lib no `app.config.ts`:
```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { hubAuthInterceptor } from '@daruix/hub-auth';

export const appConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([hubAuthInterceptor])
    )
  ]
};
```
Build
```bash
npm run build
```
Testes
```bash
npm test
```
Integração local com o Shell
Suba o Shell.
Suba este MFE na porta configurada.
Confirme se o `remoteEntry.json` ou `remoteEntry.js` está acessível no navegador.
Confirme se o Shell aponta para esse remote no `federation.manifest.json`.
Repositórios relacionados
`daruix-hub-shell`
`daruix-hub-auth`
`daruix-ds`
