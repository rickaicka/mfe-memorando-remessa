import { HttpErrorResponse } from '@angular/common/http';

import { Location } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonToast,
} from '@ionic/angular/standalone';

import { HUB_USER_KEY } from '@daruix/hub-auth';

import { HubIconComponent } from '@daruix/hub-ui';

import { LucideArrowLeft } from '@lucide/angular';

import { addIcons } from 'ionicons';

import {
  alertCircleOutline,
  attachOutline,
  chatboxOutline,
  documentTextOutline,
} from 'ionicons/icons';

import {
  concatMap,
  finalize,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';

import {
  MemorandoArquivo,
  MemorandoClienteLegado,
  MemorandoCreatePayload,
  MemorandoFormularioOpcao,
  MemorandoFormularioOpcoes,
  MemorandoObraLegado,
  MemorandoRemessaDetalhe,
  MemorandoUsuarioLocal,
  PaginatedResponse,
} from '../../models/memorando-remessa.models';

import { MemorandoRemessaService } from '../../services/memorando-remessa.service';

interface OpcaoFormulario {
  id: number;
  label: string;
}

interface ClienteFormulario {
  id: number;
  name: string;
  document: string;
}

interface ArquivoPendente {
  id: string;
  file: File;
  name: string;
  sizeLabel: string;
  localUrl: string;
}

@Component({
  selector: 'app-cadastrar-memorando-remessas',
  standalone: true,
  imports: [
    ReactiveFormsModule,

    IonButton,
    IonCheckbox,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea,
    IonToast,

    LucideArrowLeft,
    HubIconComponent,
  ],
  templateUrl: './cadastrar-memorando-remessas.html',
  styleUrl: './cadastrar-memorando-remessas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastrarMemorandoRemessas {
  private static readonly PURPOSES_THAT_FOCUS_NOTES = new Set<string>(['DOCUMENTOS', 'OUTROS']);

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024;

  private readonly formBuilder = inject(FormBuilder);

  private readonly service = inject(MemorandoRemessaService);

  private readonly router = inject(Router);

  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly location = inject(Location);

  private readonly destroyRef = inject(DestroyRef);

  private readonly hubUserKey = inject(HUB_USER_KEY);

  @ViewChild('notesTextarea')
  private notesTextarea?: IonTextarea;

  private readonly todasObras = signal<MemorandoObraLegado[]>([]);

  readonly loadingOptions = signal<boolean>(true);

  readonly loadingWorks = signal<boolean>(false);

  readonly loadingMemorando = signal<boolean>(false);

  readonly processing = signal<boolean>(false);

  readonly error = signal<string | null>(null);

  readonly toastOpen = signal<boolean>(false);

  readonly toastMessage = signal<string>('');

  readonly isDragging = signal<boolean>(false);

  readonly purposes = signal<OpcaoFormulario[]>([]);

  readonly clients = signal<ClienteFormulario[]>([]);

  readonly works = signal<MemorandoObraLegado[]>([]);

  readonly selectedPurposes = signal<ReadonlySet<number>>(new Set<number>());

  readonly selectedPurposeOptions = computed<OpcaoFormulario[]>(() => {
    const selectedIds = this.selectedPurposes();

    return this.purposes().filter((purpose) => selectedIds.has(purpose.id));
  });

  readonly selectedPurposeIds = computed<number[]>(() =>
    this.selectedPurposeOptions().map((purpose) => purpose.id),
  );

  /**
   * Arquivos selecionados no navegador,
   * mas que ainda não foram enviados.
   */
  readonly pendingAttachments = signal<ArquivoPendente[]>([]);

  /**
   * Arquivos já salvos e retornados pela API.
   */
  readonly existingAttachments = signal<MemorandoArquivo[]>([]);

  readonly memorandoId = signal<number | null>(null);

  readonly isEditing = computed<boolean>(() => this.memorandoId() !== null);

  readonly form = this.formBuilder.group({
    code: [
      {
        value: 'Gerado ao salvar',
        disabled: true,
      },
    ],

    responsible: [
      {
        value: '',
        disabled: true,
      },
    ],

    costCenter: [
      {
        value: '',
        disabled: true,
      },
      Validators.required,
    ],

    shippingDate: [this.obterDataAtual(), Validators.required],

    clientId: [null as number | null, Validators.required],

    workId: [
      {
        value: null as number | null,
        disabled: true,
      },
      Validators.required,
    ],

    subject: [''],

    attentionTo: [''],

    notes: ['', Validators.maxLength(1000)],
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      attachOutline,
      chatboxOutline,
      documentTextOutline,
    });

    this.preencherResponsavelLogado();
    this.configurarAlteracoesFormulario();

    const rotaValida = this.configurarModoFormulario();

    if (rotaValida) {
      this.carregarDadosIniciais();
    }

    this.destroyRef.onDestroy(() => {
      for (const attachment of this.pendingAttachments()) {
        URL.revokeObjectURL(attachment.localUrl);
      }
    });
  }

  get notesLength(): number {
    return this.form.controls.notes.value?.length ?? 0;
  }

  voltar(): void {
    this.location.back();
  }

  salvar(): void {
    this.persistirMemorando(false);
  }

  enviar(): void {
    this.persistirMemorando(true);
  }

  selecionarFinalidade(option: OpcaoFormulario, event: Event): void {
    const checked = this.obterChecked(event);

    this.atualizarSelecao(this.selectedPurposes, option.id, checked);

    if (checked && this.deveFocarObservacoes(option.label)) {
      this.focarObservacoes();
    }
  }

  estaFinalidadeSelecionada(id: number): boolean {
    return this.selectedPurposes().has(id);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    const files = Array.from(input.files ?? []);

    this.adicionarArquivos(files);

    input.value = '';
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);

    const files = Array.from(event.dataTransfer?.files ?? []);

    this.adicionarArquivos(files);
  }

  removerArquivoPendente(attachmentId: string): void {
    const attachment = this.pendingAttachments().find((item) => item.id === attachmentId);

    if (attachment) {
      URL.revokeObjectURL(attachment.localUrl);
    }

    this.pendingAttachments.update((attachments) =>
      attachments.filter((item) => item.id !== attachmentId),
    );
  }

  visualizarArquivoPendente(attachment: ArquivoPendente): void {
    window.open(attachment.localUrl, '_blank', 'noopener,noreferrer');
  }

  visualizarArquivoExistente(attachment: MemorandoArquivo): void {
    const memorandoId = this.memorandoId();

    if (memorandoId === null) {
      return;
    }

    const previewWindow = window.open('', '_blank');

    if (!previewWindow) {
      this.exibirMensagem('Permita pop-ups para visualizar o arquivo.');

      return;
    }

    previewWindow.opener = null;

    this.service
      .baixarArquivo(memorandoId, attachment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const localUrl = URL.createObjectURL(blob);

          previewWindow.location.href = localUrl;

          window.setTimeout(
            () => {
              URL.revokeObjectURL(localUrl);
            },
            5 * 60 * 1000,
          );
        },

        error: () => {
          previewWindow.close();

          this.exibirMensagem('Não foi possível abrir o arquivo.');
        },
      });
  }

  removerArquivoExistente(attachment: MemorandoArquivo): void {
    const memorandoId = this.memorandoId();

    if (memorandoId === null) {
      return;
    }

    const confirmed = window.confirm(`Remover o arquivo "${attachment.original_name}"?`);

    if (!confirmed) {
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    this.service
      .removerArquivo(memorandoId, attachment.id)
      .pipe(
        finalize(() => {
          this.processing.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.existingAttachments.update((attachments) =>
            attachments.filter((item) => item.id !== attachment.id),
          );

          this.exibirMensagem(`Arquivo ${attachment.original_name} removido.`);
        },

        error: (httpError: HttpErrorResponse) => {
          const message = this.obterMensagemErro(httpError, 'Não foi possível remover o arquivo.');

          this.error.set(message);
          this.exibirMensagem(message);
        },
      });
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private carregarDadosIniciais(): void {
    const memorandoId = this.memorandoId();

    this.loadingOptions.set(true);

    this.loadingMemorando.set(memorandoId !== null);

    this.error.set(null);

    forkJoin({
      options: this.service.obterOpcoesFormulario(),

      clients: this.service.listarClientesLegado(),

      memorando: memorandoId === null ? of(null) : this.service.obterPorId(memorandoId),
    })
      .pipe(
        switchMap(({ options, clients, memorando }) => {
          const clientName = memorando?.client_name?.trim();

          if (!memorando || !clientName) {
            return of({
              options,
              clients,
              memorando,
              works: [] as MemorandoObraLegado[],
            });
          }

          return this.service.listarObrasLegado(clientName, memorando.client_document ?? '').pipe(
            map((worksResponse) => ({
              options,
              clients,
              memorando,
              works: this.extrairResultados(worksResponse),
            })),
          );
        }),

        finalize(() => {
          this.loadingOptions.set(false);
          this.loadingMemorando.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ options, clients, works, memorando }) => {
          this.preencherOpcoes(options);

          this.clients.set(this.normalizarClientes(this.extrairResultados(clients)));

          this.todasObras.set(works);

          if (memorando) {
            this.preencherFormularioEdicao(memorando);
          }
        },

        error: (httpError: HttpErrorResponse) => {
          let fallback = 'Não foi possível carregar os dados do formulário.';

          if (memorandoId !== null && httpError.status === 404) {
            fallback = 'O memorando informado não foi encontrado.';

            void this.router.navigate(['lista'], {
              relativeTo: this.activatedRoute.parent,
              replaceUrl: true,
            });
          } else if (httpError.status === 403) {
            fallback = 'Você não possui permissão para acessar este memorando.';
          }

          const message = this.obterMensagemErro(httpError, fallback);

          this.error.set(message);
          this.exibirMensagem(message);
        },
      });
  }

  private configurarAlteracoesFormulario(): void {
    this.form.controls.clientId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clientId) => {
        this.onClienteAlterado(clientId);
      });

    this.form.controls.workId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((workId) => {
        this.onObraAlterada(workId);
      });
  }

  private preencherResponsavelLogado(): void {
    const rawUser = localStorage.getItem(this.hubUserKey);

    if (!rawUser) {
      this.form.controls.responsible.setValue('');

      return;
    }

    try {
      const user = JSON.parse(rawUser) as MemorandoUsuarioLocal;

      const userName = user.name || user.nome || user.username || '';

      this.form.controls.responsible.setValue(userName);
    } catch {
      this.form.controls.responsible.setValue('');
    }
  }

  private preencherOpcoes(response: MemorandoFormularioOpcoes): void {
    this.purposes.set(this.normalizarOpcoes(response.purposes ?? response.finalidades ?? []));
  }

  private onClienteAlterado(clientId: number | null): void {
    this.form.controls.workId.reset(null, {
      emitEvent: false,
    });

    this.form.controls.costCenter.setValue('');
    this.form.controls.workId.disable({
      emitEvent: false,
    });

    this.works.set([]);
    this.todasObras.set([]);
    this.error.set(null);

    if (clientId === null) {
      return;
    }

    const client = this.clients().find((item) => item.id === clientId);

    if (!client) {
      return;
    }

    this.loadingWorks.set(true);

    this.service
      .listarObrasLegado(client.name, client.document)
      .pipe(
        finalize(() => {
          this.loadingWorks.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const works = this.extrairResultados(response);

          this.todasObras.set(works);
          this.works.set(works);

          if (works.length > 0) {
            this.form.controls.workId.enable({
              emitEvent: false,
            });
          } else {
            this.exibirMensagem('Nenhuma obra encontrada para o cliente selecionado.');
          }
        },

        error: (httpError: HttpErrorResponse) => {
          const message = this.obterMensagemErro(
            httpError,
            'Não foi possível carregar as obras do cliente.',
          );

          this.error.set(message);
          this.exibirMensagem(message);
        },
      });
  }

  private onObraAlterada(workId: number | null): void {
    if (workId === null) {
      this.form.controls.costCenter.setValue('');

      return;
    }

    const work = this.works().find((item) => item.legacy_work_id === workId);

    this.form.controls.costCenter.setValue(work?.cost_center ?? '');
  }

  private persistirMemorando(shouldSend: boolean): void {
    if (!this.validarFormulario()) {
      return;
    }

    let payload: MemorandoCreatePayload;

    try {
      payload = this.criarPayload();
    } catch {
      this.exibirMensagem('Selecione o cliente e a obra.');

      return;
    }

    const existingId = this.memorandoId();

    const request$ =
      existingId === null
        ? this.service.criar(payload)
        : this.service.atualizar(existingId, payload);

    this.processing.set(true);
    this.error.set(null);

    request$
      .pipe(
        concatMap((memorando) => this.enviarArquivosPendentes(memorando)),

        concatMap((memorando) => {
          if (!shouldSend) {
            return of(memorando);
          }

          return this.service.enviar(memorando.id);
        }),

        finalize(() => {
          this.processing.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (memorando) => {
          const wasCreated = existingId === null;

          this.memorandoId.set(memorando.id);

          this.form.controls.code.setValue(memorando.code);

          this.existingAttachments.set(memorando.attachments ?? []);

          this.selectedPurposes.set(
            new Set(
              (memorando.selected_options ?? [])
                .filter((option) => option.option_type === 'FINALIDADE')
                .map((option) => option.id),
            ),
          );

          this.form.markAsPristine();
          this.form.markAsUntouched();

          let message: string;

          if (shouldSend) {
            message = `Memorando ${memorando.code} enviado com sucesso.`;
          } else if (wasCreated) {
            message = `Memorando ${memorando.code} salvo com sucesso.`;
          } else {
            message = `Memorando ${memorando.code} atualizado com sucesso.`;
          }

          this.exibirMensagem(message);

          if (wasCreated) {
            void this.router.navigate(['editar-memorando', memorando.id], {
              relativeTo: this.activatedRoute.parent,

              replaceUrl: true,
            });
          }
        },

        error: (httpError: HttpErrorResponse) => {
          let fallback: string;

          if (shouldSend) {
            fallback = 'Não foi possível enviar o memorando.';
          } else if (existingId === null) {
            fallback = 'Não foi possível salvar o memorando.';
          } else {
            fallback = 'Não foi possível atualizar o memorando.';
          }

          if (httpError.status === 404) {
            fallback = 'O memorando não existe mais ou foi removido.';
          } else if (httpError.status === 403) {
            fallback = 'Você não possui permissão para alterar este memorando.';
          }

          const message = this.obterMensagemErro(httpError, fallback);

          this.error.set(message);
          this.exibirMensagem(message);
        },
      });
  }

  private enviarArquivosPendentes(
    memorando: MemorandoRemessaDetalhe,
  ): Observable<MemorandoRemessaDetalhe> {
    const attachments = [...this.pendingAttachments()];

    if (attachments.length === 0) {
      return of(memorando);
    }

    return from(attachments).pipe(
      concatMap((attachment) =>
        this.service.adicionarArquivo(memorando.id, attachment.file).pipe(
          tap((uploadedAttachment) => {
            URL.revokeObjectURL(attachment.localUrl);

            this.pendingAttachments.update((currentAttachments) =>
              currentAttachments.filter((item) => item.id !== attachment.id),
            );

            this.existingAttachments.update((currentAttachments) => [
              uploadedAttachment,

              ...currentAttachments.filter((item) => item.id !== uploadedAttachment.id),
            ]);
          }),
        ),
      ),

      toArray(),

      concatMap(() => this.service.obterPorId(memorando.id)),
    );
  }

  private criarPayload(): MemorandoCreatePayload {
    const raw = this.form.getRawValue();

    if (raw.clientId === null || raw.workId === null) {
      throw new Error('Cliente e obra obrigatórios.');
    }

    const client = this.clients().find((item) => item.id === raw.clientId);

    const work = this.works().find((item) => item.legacy_work_id === raw.workId);

    if (!client || !work) {
      throw new Error('Cliente ou obra inválidos.');
    }

    return {
      legacy_work_id: work.legacy_work_id,

      shipping_date: raw.shippingDate ?? '',

      subject: raw.subject?.trim() ?? '',

      attention_to: raw.attentionTo?.trim() ?? '',

      notes: raw.notes?.trim() ?? '',

      option_ids: [...this.selectedPurposes()],
    };
  }

  private validarFormulario(): boolean {
    if (this.form.valid) {
      return true;
    }

    this.form.markAllAsTouched();

    this.exibirMensagem('Preencha os campos obrigatórios.');

    return false;
  }

  private adicionarArquivos(files: File[]): void {
    if (files.length === 0) {
      return;
    }

    const currentAttachments = this.pendingAttachments();

    const validFiles = files.filter((file) => {
      if (file.size > CadastrarMemorandoRemessas.MAX_FILE_SIZE) {
        this.exibirMensagem(`O arquivo ${file.name} ultrapassa 20 MB.`);

        return false;
      }

      const alreadyExists = currentAttachments.some(
        (attachment) =>
          attachment.file.name === file.name &&
          attachment.file.size === file.size &&
          attachment.file.lastModified === file.lastModified,
      );

      if (alreadyExists) {
        this.exibirMensagem(`O arquivo ${file.name} já foi adicionado.`);

        return false;
      }

      return true;
    });

    const newAttachments = validFiles.map((file, index): ArquivoPendente => ({
      id: this.gerarId(index),
      file,
      name: file.name,

      sizeLabel: this.formatarTamanho(file.size),

      localUrl: URL.createObjectURL(file),
    }));

    this.pendingAttachments.update((attachments) => [...attachments, ...newAttachments]);
  }

  private atualizarSelecao(
    selectionSignal: {
      (): ReadonlySet<number>;

      update(updater: (value: ReadonlySet<number>) => ReadonlySet<number>): void;
    },

    id: number,
    checked: boolean,
  ): void {
    selectionSignal.update((current) => {
      const updated = new Set(current);

      if (checked) {
        updated.add(id);
      } else {
        updated.delete(id);
      }

      return updated;
    });
  }

  private deveFocarObservacoes(label: string): boolean {
    const normalizedLabel = this.normalizarTexto(label);

    return CadastrarMemorandoRemessas.PURPOSES_THAT_FOCUS_NOTES.has(normalizedLabel);
  }

  private focarObservacoes(): void {
    window.setTimeout(() => {
      const textarea = this.notesTextarea;

      if (!textarea) {
        return;
      }

      void textarea.getInputElement().then((input) => {
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        return textarea.setFocus();
      });
    });
  }

  private obterChecked(event: Event): boolean {
    const customEvent = event as CustomEvent<{
      checked?: boolean;
    }>;

    return Boolean(customEvent.detail?.checked);
  }

  private normalizarOpcoes(options: MemorandoFormularioOpcao[]): OpcaoFormulario[] {
    return options.map((option) => ({
      id: option.id,

      label: option.name || option.nome || option.label || option.code || `Opção ${option.id}`,
    }));
  }

  private normalizarClientes(clients: MemorandoClienteLegado[]): ClienteFormulario[] {
    const uniqueClients = new Map<string, ClienteFormulario>();

    clients.forEach((client, index) => {
      const normalizedClient: ClienteFormulario = {
        id: client.id ?? client.legacy_id ?? client.legacy_client_id ?? index + 1,

        name: (client.name ?? client.nome ?? client.client_name ?? '').trim(),

        document: (client.document ?? client.client_document ?? '').trim(),
      };

      if (!normalizedClient.name) {
        return;
      }

      const key = this.normalizarTexto(normalizedClient.name);
      const existingClient = uniqueClients.get(key);

      if (!existingClient) {
        uniqueClients.set(key, normalizedClient);

        return;
      }

      if (!existingClient.document && normalizedClient.document) {
        existingClient.document = normalizedClient.document;
      }
    });

    return Array.from(uniqueClients.values());
  }

  private extrairResultados<T>(response: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.results ?? [];
  }

  private normalizarTexto(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private somenteNumeros(value: string): string {
    return value.replace(/\D/g, '');
  }

  private obterDataAtual(): string {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private gerarId(index: number): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${index}`;
  }

  private exibirMensagem(message: string): void {
    this.toastMessage.set(message);
    this.toastOpen.set(false);

    window.setTimeout(() => {
      this.toastOpen.set(true);
    });
  }

  private configurarModoFormulario(): boolean {
    const idParam = this.activatedRoute.snapshot.paramMap.get('id');

    if (idParam === null) {
      this.memorandoId.set(null);

      return true;
    }

    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('O identificador do memorando é inválido.');

      this.exibirMensagem('O identificador do memorando é inválido.');

      void this.router.navigate(['lista'], {
        relativeTo: this.activatedRoute.parent,

        replaceUrl: true,
      });

      return false;
    }

    this.memorandoId.set(id);

    return true;
  }

  private preencherFormularioEdicao(memorando: MemorandoRemessaDetalhe): void {
    const primaryResponsible =
      memorando.responsible_users.find((responsible) => responsible.is_primary) ??
      memorando.responsible_users[0];

    this.form.patchValue(
      {
        code: memorando.code,

        responsible: primaryResponsible?.name || primaryResponsible?.username || '',

        costCenter: memorando.cost_center,

        shippingDate: memorando.shipping_date,

        subject: memorando.subject ?? '',

        attentionTo: memorando.attention_to ?? '',

        notes: memorando.notes ?? '',
      },
      {
        emitEvent: false,
      },
    );

    const purposeIds = (memorando.selected_options ?? [])
      .filter((option) => option.option_type === 'FINALIDADE')
      .map((option) => option.id);

    this.selectedPurposes.set(new Set(purposeIds));

    this.existingAttachments.set(memorando.attachments ?? []);

    const client = this.localizarClienteDoMemorando(memorando);

    if (!client) {
      const message = 'Não foi possível localizar o cliente deste memorando.';

      this.error.set(message);
      this.exibirMensagem(message);

      return;
    }

    const clientWorks = this.filtrarObrasPorCliente(client);

    const selectedWork = clientWorks.find(
      (work) => work.legacy_work_id === memorando.legacy_work_id,
    );

    if (!selectedWork) {
      const message = 'Não foi possível localizar a obra deste memorando.';

      this.error.set(message);
      this.exibirMensagem(message);

      return;
    }

    this.works.set(clientWorks);

    this.form.controls.workId.enable({
      emitEvent: false,
    });

    this.form.patchValue(
      {
        clientId: client.id,

        workId: selectedWork.legacy_work_id,

        costCenter: memorando.cost_center,
      },
      {
        emitEvent: false,
      },
    );

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private localizarClienteDoMemorando(
    memorando: MemorandoRemessaDetalhe,
  ): ClienteFormulario | undefined {
    const document = this.somenteNumeros(memorando.client_document ?? '');

    const name = this.normalizarTexto(memorando.client_name ?? '');

    return this.clients().find((client) => {
      const clientDocument = this.somenteNumeros(client.document);

      const clientName = this.normalizarTexto(client.name);

      const sameDocument = Boolean(document) && document === clientDocument;

      const sameName = Boolean(name) && name === clientName;

      return sameDocument || sameName;
    });
  }

  private filtrarObrasPorCliente(client: ClienteFormulario): MemorandoObraLegado[] {
    const clientName = this.normalizarTexto(client.name);

    const clientDocument = this.somenteNumeros(client.document);

    return this.todasObras().filter((work) => {
      const workClientName = this.normalizarTexto(work.client_name ?? '');

      const workDocument = this.somenteNumeros(work.client_document ?? '');

      const sameDocument = Boolean(clientDocument) && clientDocument === workDocument;

      const sameName = Boolean(clientName) && clientName === workClientName;

      return sameDocument || sameName;
    });
  }

  private obterMensagemErro(httpError: HttpErrorResponse, fallback: string): string {
    const response = httpError.error;

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const errorObject = response as Record<string, unknown>;

    const detail = errorObject['detail'];

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    const sendError = errorObject['send_error'];

    if (typeof sendError === 'string' && sendError.trim()) {
      return sendError;
    }

    for (const value of Object.values(errorObject)) {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }

      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
    }

    return fallback;
  }
}
