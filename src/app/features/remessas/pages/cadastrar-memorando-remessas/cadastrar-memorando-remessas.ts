import { Location } from '@angular/common';

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

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

import { LucideArrowLeft } from '@lucide/angular';

import { concatMap, finalize, forkJoin, from, map, of, toArray } from 'rxjs';

import {
  MemorandoClienteLegado,
  MemorandoCreatePayload,
  MemorandoFormularioOpcao,
  MemorandoFormularioOpcoes,
  MemorandoObraLegado,
  MemorandoRemessaResumo,
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
  ],
  templateUrl: './cadastrar-memorando-remessas.html',
  styleUrl: './cadastrar-memorando-remessas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastrarMemorandoRemessas {
  private readonly formBuilder = inject(FormBuilder);

  private readonly service = inject(MemorandoRemessaService);

  private readonly router = inject(Router);

  private readonly location = inject(Location);

  private readonly destroyRef = inject(DestroyRef);

  private readonly hubUserKey = inject(HUB_USER_KEY);

  private readonly todasObras = signal<MemorandoObraLegado[]>([]);

  readonly loadingOptions = signal<boolean>(true);

  readonly loadingWorks = signal<boolean>(false);

  readonly processing = signal<boolean>(false);

  readonly error = signal<string | null>(null);

  readonly toastOpen = signal<boolean>(false);

  readonly toastMessage = signal<string>('');

  readonly isDragging = signal<boolean>(false);

  readonly species = signal<OpcaoFormulario[]>([]);

  readonly purposes = signal<OpcaoFormulario[]>([]);

  readonly requests = signal<OpcaoFormulario[]>([]);

  readonly clients = signal<ClienteFormulario[]>([]);

  readonly works = signal<MemorandoObraLegado[]>([]);

  readonly selectedSpecies = signal<ReadonlySet<number>>(new Set<number>());

  readonly selectedPurposes = signal<ReadonlySet<number>>(new Set<number>());

  readonly selectedRequests = signal<ReadonlySet<number>>(new Set<number>());

  readonly attachments = signal<ArquivoPendente[]>([]);

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
    this.preencherResponsavelLogado();
    this.configurarAlteracoesFormulario();
    this.carregarDadosIniciais();

    this.destroyRef.onDestroy(() => {
      for (const attachment of this.attachments()) {
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
    this.criarMemorando(false);
  }

  enviar(): void {
    this.criarMemorando(true);
  }

  selecionarEspecie(id: number, event: Event): void {
    this.atualizarSelecao(this.selectedSpecies, id, this.obterChecked(event));
  }

  selecionarFinalidade(id: number, event: Event): void {
    this.atualizarSelecao(this.selectedPurposes, id, this.obterChecked(event));
  }

  selecionarSolicitacao(id: number, event: Event): void {
    this.atualizarSelecao(this.selectedRequests, id, this.obterChecked(event));
  }

  estaEspecieSelecionada(id: number): boolean {
    return this.selectedSpecies().has(id);
  }

  estaFinalidadeSelecionada(id: number): boolean {
    return this.selectedPurposes().has(id);
  }

  estaSolicitacaoSelecionada(id: number): boolean {
    return this.selectedRequests().has(id);
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

  removerArquivo(attachmentId: string): void {
    const attachment = this.attachments().find((item) => item.id === attachmentId);

    if (attachment) {
      URL.revokeObjectURL(attachment.localUrl);
    }

    this.attachments.update((attachments) =>
      attachments.filter((item) => item.id !== attachmentId),
    );
  }

  visualizarArquivo(attachment: ArquivoPendente): void {
    window.open(attachment.localUrl, '_blank', 'noopener,noreferrer');
  }

  private carregarDadosIniciais(): void {
    this.loadingOptions.set(true);
    this.error.set(null);

    forkJoin({
      options: this.service.obterOpcoesFormulario(),

      clients: this.service.listarClientesLegado(),

      works: this.service.listarObrasLegado(),
    })
      .pipe(
        finalize(() => {
          this.loadingOptions.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ options, clients, works }) => {
          this.preencherOpcoes(options);

          this.clients.set(this.normalizarClientes(this.extrairResultados(clients)));

          this.todasObras.set(this.extrairResultados(works));
        },

        error: () => {
          this.error.set('Não foi possível carregar os dados do formulário.');

          this.exibirMensagem('Não foi possível carregar os dados do formulário.');
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
    this.species.set(this.normalizarOpcoes(response.species ?? response.especies ?? []));

    this.purposes.set(this.normalizarOpcoes(response.purposes ?? response.finalidades ?? []));

    this.requests.set(
      this.normalizarOpcoes(
        response.requests ?? response.solicitamos ?? response.solicitacoes ?? [],
      ),
    );
  }

  private onClienteAlterado(clientId: number | null): void {
    this.form.controls.workId.reset(null, {
      emitEvent: false,
    });

    this.form.controls.costCenter.setValue('');

    this.works.set([]);

    if (clientId === null) {
      this.form.controls.workId.disable();
      return;
    }

    const client = this.clients().find((item) => item.id === clientId);

    if (!client) {
      this.form.controls.workId.disable();
      return;
    }

    this.loadingWorks.set(true);

    const clientName = this.normalizarTexto(client.name);

    const clientDocument = this.somenteNumeros(client.document);

    const filteredWorks = this.todasObras().filter((work) => {
      const workClientName = this.normalizarTexto(work.client_name);

      const workDocument = this.somenteNumeros(work.client_document);

      const sameDocument = Boolean(clientDocument) && clientDocument === workDocument;

      const sameName = Boolean(clientName) && clientName === workClientName;

      return sameDocument || sameName;
    });

    this.works.set(filteredWorks);

    this.form.controls.workId.enable();

    this.loadingWorks.set(false);
  }

  private onObraAlterada(workId: number | null): void {
    if (workId === null) {
      this.form.controls.costCenter.setValue('');

      return;
    }

    const work = this.works().find((item) => item.legacy_work_id === workId);

    this.form.controls.costCenter.setValue(work?.cost_center ?? '');
  }

  private criarMemorando(shouldSend: boolean): void {
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

    this.processing.set(true);
    this.error.set(null);

    this.service
      .criar(payload)
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
          this.form.controls.code.setValue(memorando.code);

          const message = shouldSend
            ? `Memorando ${memorando.code} enviado com sucesso.`
            : `Memorando ${memorando.code} salvo com sucesso.`;

          this.exibirMensagem(message);

          void this.router.navigate(['../', memorando.id]);
        },

        error: () => {
          const message = shouldSend
            ? 'Não foi possível enviar o memorando.'
            : 'Não foi possível salvar o memorando.';

          this.error.set(message);
          this.exibirMensagem(message);
        },
      });
  }

  private enviarArquivosPendentes(memorando: MemorandoRemessaResumo) {
    const files = this.attachments().map((attachment) => attachment.file);

    if (files.length === 0) {
      return of(memorando);
    }

    return from(files).pipe(
      concatMap((file) => this.service.adicionarArquivo(memorando.id, file)),

      toArray(),

      map(() => memorando),
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
      work_source: 'ACCESS',

      legacy_work_id: work.legacy_work_id,

      legacy_proposal_id: work.legacy_proposal_id,

      cost_center: work.cost_center,

      work_name: work.work_name,

      client_name: client.name,

      client_document: client.document,

      shipping_date: raw.shippingDate ?? '',

      subject: raw.subject?.trim() ?? '',

      attention_to: raw.attentionTo?.trim() ?? '',

      notes: raw.notes?.trim() ?? '',

      species_ids: [...this.selectedSpecies()],

      purpose_ids: [...this.selectedPurposes()],

      request_ids: [...this.selectedRequests()],
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

    const maxSize = 20 * 1024 * 1024;

    const validFiles = files.filter((file) => {
      if (file.size <= maxSize) {
        return true;
      }

      this.exibirMensagem(`O arquivo ${file.name} ultrapassa 20 MB.`);

      return false;
    });

    const newAttachments = validFiles.map(
      (file, index): ArquivoPendente => ({
        id: this.gerarId(index),
        file,
        name: file.name,

        sizeLabel: this.formatarTamanho(file.size),

        localUrl: URL.createObjectURL(file),
      }),
    );

    this.attachments.update((attachments) => [...attachments, ...newAttachments]);
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
    return clients
      .map((client, index) => ({
        id: client.id ?? client.legacy_id ?? client.legacy_client_id ?? index + 1,

        name: client.name ?? client.nome ?? client.client_name ?? '',

        document: client.document ?? client.client_document ?? '',
      }))
      .filter((client) => Boolean(client.name));
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

  private formatarTamanho(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private exibirMensagem(message: string): void {
    this.toastMessage.set(message);
    this.toastOpen.set(false);

    window.setTimeout(() => {
      this.toastOpen.set(true);
    });
  }
}
