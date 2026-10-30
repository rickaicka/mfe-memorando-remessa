import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import {
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonList,
  IonCard,
  IonCardContent,
  IonItem,
  IonCheckbox,
  IonButton,
  IonSpinner,
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
  refreshOutline,
} from 'ionicons/icons';

import { catchError, forkJoin, map, of, Subject, switchMap } from 'rxjs';

import {
  MEMORANDO_REMESSA_DEFAULT_FILTERS,
  MEMORANDO_REMESSA_STATUS_OPTIONS,
  MemorandoRemessaFiltros,
  MemorandoRemessaListOptions,
  MemorandoRemessaResumo,
  PaginatedResponse,
} from '../../models/memorando-remessa.models';

import { MemorandoRemessaService } from '../../services/memorando-remessa.service';
import { ButtonComponent, DrxDataTableComponent, HubIconComponent } from '@daruix/hub-ui';

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
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSearchbar,
    IonList,
    IonCard,
    IonCardContent,
    IonItem,
    IonCheckbox,
    IonButton,
    IonSpinner,
    HubIconComponent,
    ButtonComponent,
    DrxDataTableComponent,
  ],
})
export class MemorandoRemessaListaComponent {
  private readonly service = inject(MemorandoRemessaService);

  private readonly router = inject(Router);

  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly location = inject(Location);

  private readonly destroyRef = inject(DestroyRef);

  private readonly consultarSubject = new Subject<void>();

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

  /** A tabela do DS opera em modo server para preservar a paginação da API. */
  readonly rowKey = (row: MemorandoRemessaResumo) => row.id;

  readonly tableColumns = [
    { key: 'code', label: 'Memorando', value: (row: MemorandoRemessaResumo) => row.code, width: '170px', sortable: false, filterable: false },
    { key: 'revision', label: 'Rev.', value: (row: MemorandoRemessaResumo) => row.revision, width: '70px', sortable: false, filterable: false, align: 'center' as const },
    { key: 'cost_center', label: 'PC', value: (row: MemorandoRemessaResumo) => row.cost_center, width: '115px', sortable: false, filterable: false },
    { key: 'work_name', label: 'Obra', value: (row: MemorandoRemessaResumo) => row.work_name, sortable: false, filterable: false },
    { key: 'client_name', label: 'Cliente', value: (row: MemorandoRemessaResumo) => row.client_name, sortable: false, filterable: false },
    { key: 'shipping_date', label: 'Data de envio', value: (row: MemorandoRemessaResumo) => row.shipping_date ?? '', display: (row: MemorandoRemessaResumo) => this.formatarData(row.shipping_date), width: '125px', sortable: false, filterable: false },
    { key: 'primary_responsible_name', label: 'Responsável', value: (row: MemorandoRemessaResumo) => this.obterResponsaveis(row), sortable: false, filterable: false },
    {
      key: 'status', label: 'Status', value: (row: MemorandoRemessaResumo) => row.status,
      width: '120px', sortable: false, filterable: false,
      badge: (row: MemorandoRemessaResumo) => ({
        label: row.status_label,
        tone: (row.status === 'RASCUNHO' ? 'warning' : row.status === 'ENVIADO' ? 'success' : row.status === 'FALHA_ENVIO' ? 'danger' : 'neutral') as 'warning' | 'success' | 'danger' | 'neutral',
      }),
    },
  ];

  readonly tableActions = [
    { id: 'open', label: 'Abrir memorando', icon: 'eye' },
    { id: 'select', label: 'Selecionar para exclusão', icon: 'square', hidden: (row: MemorandoRemessaResumo) => row.status !== 'RASCUNHO' || this.estaSelecionado(row.id) },
    { id: 'deselect', label: 'Desmarcar seleção', icon: 'square-check', hidden: (row: MemorandoRemessaResumo) => row.status !== 'RASCUNHO' || !this.estaSelecionado(row.id) },
  ];

  onTableQueryChange(query: { search: string; page: number; pageSize: number }): void {
    const current = this.filtros();
    if (current.search === query.search && current.page === query.page && current.pageSize === query.pageSize) return;
    this.filtros.set({ ...current, search: query.search, page: query.page, pageSize: query.pageSize });
    this.consultar();
  }

  onTableAction(event: { action: { id: string }; row: MemorandoRemessaResumo }): void {
    if (event.action.id === 'open') {
      this.abrirMemorando(event.row);
      return;
    }
    if (event.row.status !== 'RASCUNHO') return;
    const selection = new Set(this.selecionados());
    if (event.action.id === 'select') selection.add(event.row.id);
    if (event.action.id === 'deselect') selection.delete(event.row.id);
    this.selecionados.set(selection);
  }

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
      refreshOutline,
    });

    this.configurarConsulta();
    this.carregarOpcoes();
    this.consultar();
  }

  voltar(): void {
    this.location.back();
  }

  novoMemorando(): void {
    void this.router.navigate(['novo-memorando'], {
      relativeTo: this.activatedRoute.parent,
    });
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

  abrirMemorando(memorando: MemorandoRemessaResumo): void {
    void this.router.navigate(['editar-memorando', memorando.id], {
      relativeTo: this.activatedRoute.parent,
    });
  }

  selecionarMemorando(memorandoId: number, event: Event): void {
    const customEvent = event as CustomEvent<{
      checked?: boolean;
    }>;

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
    const responsible = memorando.primary_responsible_name;
    if (Array.isArray(responsible)) return responsible.join(', ') || 'Sem responsável';
    return responsible ? String(responsible) : 'Sem responsável';
  }

  protected consultar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.consultarSubject.next();
  }

  private configurarConsulta(): void {
    this.consultarSubject
      .pipe(
        switchMap(() => {
          const filtrosAtuais = this.filtros();

          return this.service.listar(filtrosAtuais).pipe(
            map((response): MemorandoConsultaResult => ({
              response,
              error: null,
            })),

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
      });
  }

  private carregarOpcoes(): void {
    this.service
      .obterOpcoesLista()
      .pipe(
        catchError(() =>
          of<MemorandoRemessaListOptions>({
            statuses: [...MEMORANDO_REMESSA_STATUS_OPTIONS],
            cost_centers: [],
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((opcoes: MemorandoRemessaListOptions) => {
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

  excluirMemorandos(): void {
    const idsSelecionados = [...this.selecionados()];

    if (idsSelecionados.length === 0) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const paginaFicaraVazia = this.memorandos().every((memorando) =>
      this.selecionados().has(memorando.id),
    );

    forkJoin(idsSelecionados.map((id) => this.service.removerMemorando(id)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selecionados.set(new Set<number>());
          if (paginaFicaraVazia && this.filtros().page > 1) {
            this.filtros.update((filtrosAtuais) => ({
              ...filtrosAtuais,
              page: filtrosAtuais.page - 1,
            }));
          }

          this.consultar();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.obterMensagemErro(error));
        },
      });
  }
}
