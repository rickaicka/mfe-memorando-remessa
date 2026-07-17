import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowBackOutline,
  briefcaseOutline,
  businessOutline,
  calendarClearOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  documentTextOutline,
  filterOutline,
  personOutline,
  printOutline,
  refreshOutline,
} from 'ionicons/icons';

import {
  MEMORANDO_REMESSA_DEFAULT_FILTERS,
  MEMORANDO_REMESSA_STATUS_OPTIONS,
  MemorandoRemessaFiltros,
  MemorandoRemessaListOptions,
  MemorandoRemessaResumo,
  PaginatedResponse,
} from '../../models/memorando-remessa.models';

import { MemorandoRemessaService } from '../../services/memorando-remessa.service';

import {
  catchError,
  map,
  of,
  Subject,
  switchMap,
} from 'rxjs';

interface MemorandoConsultaResult {
  response: PaginatedResponse<MemorandoRemessaResumo>;
  error: string | null;
}

@Component({
  selector: 'app-memorando-remessa-lista',
  standalone: true,
  templateUrl: './remessas-list.component.html',
  styleUrl: './remessas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonCheckbox,
    IonContent,
    IonIcon,
    IonInput,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
  ],
})
export class MemorandoRemessaListaComponent {
  @ViewChild(IonContent)
  private content?: IonContent;

  private readonly service = inject(MemorandoRemessaService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  private readonly consultarSubject = new Subject<void>();

  private refresherElement: HTMLIonRefresherElement | null = null;

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly filtrosAbertos = signal<boolean>(true);

  readonly filtros = signal<MemorandoRemessaFiltros>({
    ...MEMORANDO_REMESSA_DEFAULT_FILTERS,
  });

  readonly memorandos = signal<MemorandoRemessaResumo[]>([]);
  readonly totalRegistros = signal<number>(0);

  readonly selecionados = signal<ReadonlySet<number>>(new Set<number>());

  readonly opcoes = signal<MemorandoRemessaListOptions>({
    statuses: [...MEMORANDO_REMESSA_STATUS_OPTIONS],
    cost_centers: [],
  });

  readonly pageSizeOptions = [10, 20, 50];
  readonly skeletonItems = [1, 2, 3, 4];

  readonly totalPaginas = computed(() => {
    const pageSize = this.filtros().pageSize;
    const count = this.totalRegistros();

    return Math.max(1, Math.ceil(count / pageSize));
  });

  readonly podeVoltarPagina = computed(() => this.filtros().page > 1);

  readonly podeAvancarPagina = computed(() => this.filtros().page < this.totalPaginas());

  readonly possuiFiltrosAtivos = computed(() => {
    const filtros = this.filtros();

    return Boolean(
      filtros.search.trim() ||
      filtros.shippingDateFrom ||
      filtros.shippingDateTo ||
      filtros.status ||
      filtros.costCenter,
    );
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      arrowBackOutline,
      briefcaseOutline,
      businessOutline,
      calendarClearOutline,
      chevronBackOutline,
      chevronDownOutline,
      chevronForwardOutline,
      chevronUpOutline,
      documentTextOutline,
      filterOutline,
      personOutline,
      printOutline,
      refreshOutline,
    });

    this.configurarConsulta();
    this.carregarOpcoes();
    this.consultar();
  }

  voltar(): void {
    this.location.back();
  }

  imprimir(): void {
    window.print();
  }

  alternarFiltros(): void {
    this.filtrosAbertos.update((aberto) => !aberto);
  }

  onSearchChange(event: Event): void {
    const search = this.obterValorEvento(event);

    this.atualizarFiltros({
      search,
      page: 1,
    });
  }

  onDataInicialChange(event: Event): void {
    const value = this.obterValorEvento(event);

    this.atualizarFiltros({
      shippingDateFrom: value || null,
      page: 1,
    });
  }

  onDataFinalChange(event: Event): void {
    const value = this.obterValorEvento(event);

    this.atualizarFiltros({
      shippingDateTo: value || null,
      page: 1,
    });
  }

  onStatusChange(event: Event): void {
    const value = this.obterValorEvento(event);

    this.atualizarFiltros({
      status: (value as MemorandoRemessaFiltros['status']) || null,
      page: 1,
    });
  }

  onCentroCustoChange(event: Event): void {
    const value = this.obterValorEvento(event);

    this.atualizarFiltros({
      costCenter: value || null,
      page: 1,
    });
  }

  onPageSizeChange(event: Event): void {
    const value = Number(this.obterValorEvento(event));

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.filtros.update((filtros) => ({
      ...filtros,
      page: 1,
      pageSize: value,
    }));

    this.consultar();
  }

  limparFiltros(): void {
    const pageSize = this.filtros().pageSize;

    this.filtros.set({
      ...MEMORANDO_REMESSA_DEFAULT_FILTERS,
      pageSize,
    });

    this.consultar();
  }

  paginaAnterior(): void {
    if (!this.podeVoltarPagina()) {
      return;
    }

    this.irParaPagina(this.filtros().page - 1);
  }

  proximaPagina(): void {
    if (!this.podeAvancarPagina()) {
      return;
    }

    this.irParaPagina(this.filtros().page + 1);
  }

  atualizarLista(event: Event): void {
    this.refresherElement = event.target as HTMLIonRefresherElement;

    this.consultar();
  }

  abrirMemorando(memorando: MemorandoRemessaResumo): void {
    void this.router.navigate([memorando.id], {
      relativeTo: this.activatedRoute,
    });
  }

  selecionarMemorando(memorandoId: number, event: Event): void {
    const customEvent = event as CustomEvent<{ checked?: boolean }>;

    const checked = Boolean(customEvent.detail?.checked);

    this.selecionados.update((selecionadosAtuais) => {
      const novosSelecionados = new Set(selecionadosAtuais);

      if (checked) {
        novosSelecionados.add(memorandoId);
      } else {
        novosSelecionados.delete(memorandoId);
      }

      return novosSelecionados;
    });
  }

  estaSelecionado(memorandoId: number): boolean {
    return this.selecionados().has(memorandoId);
  }

  formatarData(data: string | null | undefined): string {
    if (!data) {
      return 'Data não informada';
    }

    const partes = data.split('-');

    if (partes.length !== 3) {
      return data;
    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;
  }

  obterResponsaveis(memorando: MemorandoRemessaResumo): string {
    const responsaveis = memorando.responsible_users ?? [];

    if (responsaveis.length === 0) {
      return 'Sem responsável';
    }

    const primeiroResponsavel = responsaveis[0].name || responsaveis[0].username;

    const quantidadeAdicional = responsaveis.length - 1;

    if (quantidadeAdicional <= 0) {
      return primeiroResponsavel;
    }

    return `${primeiroResponsavel} +${quantidadeAdicional}`;
  }

  private configurarConsulta(): void {
    this.consultarSubject
      .pipe(
        switchMap(() => {
          const filtrosAtuais = this.filtros();

          return this.service.listar(filtrosAtuais).pipe(
            map(
              (response): MemorandoConsultaResult => ({
                response,
                error: null,
              }),
            ),
            catchError((error: unknown) =>
              of<MemorandoConsultaResult>({
                response: this.criarRespostaVazia(),
                error: this.obterMensagemErro(error),
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.memorandos.set(result.response.results);
        this.totalRegistros.set(result.response.count);
        this.error.set(result.error);
        this.loading.set(false);

        this.manterSomenteSelecionadosVisiveis(result.response.results);

        this.finalizarAtualizacao();
      });
  }

  private carregarOpcoes(): void {
    this.service
      .obterOpcoes()
      .pipe(
        catchError(() =>
          of<MemorandoRemessaListOptions>({
            statuses: [...MEMORANDO_REMESSA_STATUS_OPTIONS],
            cost_centers: [],
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((opcoes) => {
        this.opcoes.set({
          statuses:
            opcoes.statuses?.length > 0 ? opcoes.statuses : [...MEMORANDO_REMESSA_STATUS_OPTIONS],

          cost_centers: opcoes.cost_centers ?? [],
        });
      });
  }

  private atualizarFiltros(alteracoes: Partial<MemorandoRemessaFiltros>): void {
    this.filtros.update((filtrosAtuais) => ({
      ...filtrosAtuais,
      ...alteracoes,
    }));

    this.consultar();
  }

  protected consultar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.consultarSubject.next();
  }

  private irParaPagina(page: number): void {
    const paginaNormalizada = Math.min(Math.max(page, 1), this.totalPaginas());

    if (paginaNormalizada === this.filtros().page) {
      return;
    }

    this.filtros.update((filtros) => ({
      ...filtros,
      page: paginaNormalizada,
    }));

    this.consultar();

    void this.content?.scrollToTop(250);
  }

  private manterSomenteSelecionadosVisiveis(memorandos: MemorandoRemessaResumo[]): void {
    const idsVisiveis = new Set(memorandos.map((memorando) => memorando.id));

    this.selecionados.update((selecionadosAtuais) => {
      return new Set([...selecionadosAtuais].filter((id) => idsVisiveis.has(id)));
    });
  }

  private obterValorEvento(event: Event): string {
    const customEvent = event as CustomEvent<{
      value?: string | number | null;
    }>;

    const value = customEvent.detail?.value;

    return value === null || value === undefined ? '' : String(value);
  }

  private criarRespostaVazia(): PaginatedResponse<MemorandoRemessaResumo> {
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  }

  private obterMensagemErro(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Não foi possível carregar os memorandos.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente no sistema.';
    }

    if (error.status === 403) {
      return 'Você não possui permissão para consultar os memorandos.';
    }

    if (error.status >= 500) {
      return 'O servidor encontrou um erro ao consultar os memorandos.';
    }

    const apiMessage = error.error?.detail || error.error?.message || error.error?.error;

    return apiMessage || 'Não foi possível carregar os memorandos.';
  }

  private finalizarAtualizacao(): void {
    if (!this.refresherElement) {
      return;
    }

    void this.refresherElement.complete();
    this.refresherElement = null;
  }
}
