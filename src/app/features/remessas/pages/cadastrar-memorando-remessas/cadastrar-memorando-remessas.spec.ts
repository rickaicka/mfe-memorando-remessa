import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HUB_USER_KEY } from '@daruix/hub-auth';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CadastrarMemorandoRemessas } from './cadastrar-memorando-remessas';
import { MemorandoRemessaService } from '../../services/memorando-remessa.service';
import { MemorandoObraLegado } from '../../models/memorando-remessa.models';

describe('Cadastro de memorando por PC', () => {
  const work: MemorandoObraLegado = {
    legacy_work_id: 42, legacy_proposal_id: 12, cost_center: 'PC25017',
    work_name: 'Obra teste', client_name: 'Cliente teste', client_document: '123',
  };
  const memo = {
    id: 1, code: 'MR001', legacy_work_id: 42, legacy_proposal_id: 12,
    cost_center: 'PC25017', work_name: 'Obra teste', client_name: 'Cliente teste',
    client_document: '123', shipping_date: '2026-10-21', responsible_users: [],
    selected_options: [], attachments: [], subject: 'Assunto', notes: 'Observações', attention_to: '',
  };
  let service: {
    obterOpcoesFormulario: ReturnType<typeof vi.fn>;
    obterPorId: ReturnType<typeof vi.fn>;
    listarClientesLegado: ReturnType<typeof vi.fn>;
    buscarObrasPorPC: ReturnType<typeof vi.fn>;
  };
  let route: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> }; parent: null };

  beforeEach(async () => {
    service = {
      obterOpcoesFormulario: vi.fn(() => of({ purposes: [] })),
      obterPorId: vi.fn(() => of(memo)),
      listarClientesLegado: vi.fn(),
      buscarObrasPorPC: vi.fn(() => of([work])),
    };
    route = { snapshot: { paramMap: convertToParamMap({}) }, parent: null };
    await TestBed.configureTestingModule({
      imports: [CadastrarMemorandoRemessas],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: Location, useValue: { back: vi.fn() } },
        { provide: HUB_USER_KEY, useValue: 'memorando.pc.test.user' },
        { provide: MemorandoRemessaService, useValue: service },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  const search = (component: CadastrarMemorandoRemessas, value: string) =>
    component.onPCSearch(new CustomEvent('ionInput', { detail: { value } }));

  it('inicia sem consultar clientes ou listar todas as obras', () => {
    const c = TestBed.createComponent(CadastrarMemorandoRemessas).componentInstance;
    expect(service.listarClientesLegado).not.toHaveBeenCalled();
    expect(service.buscarObrasPorPC).not.toHaveBeenCalled();
    expect(c.form.controls.workId.valid).toBe(false);
  });

  it('busca a partir de três caracteres após 300ms', () => {
    vi.useFakeTimers();
    const c = TestBed.createComponent(CadastrarMemorandoRemessas).componentInstance;
    search(c, 'PC');
    vi.advanceTimersByTime(300);
    expect(service.buscarObrasPorPC).not.toHaveBeenCalled();
    search(c, 'PC25017');
    vi.advanceTimersByTime(299);
    expect(service.buscarObrasPorPC).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(service.buscarObrasPorPC).toHaveBeenCalledWith('PC25017');
    expect(c.works()).toEqual([work]);
  });

  it('preenche os dados pela seleção e invalida o vínculo ao alterar a busca', () => {
    const c = TestBed.createComponent(CadastrarMemorandoRemessas).componentInstance;
    c.selecionarPC(work);
    expect(c.form.getRawValue()).toMatchObject({
      workId: 42, clientName: 'Cliente teste', workName: 'Obra teste', costCenter: 'PC25017',
    });
    expect(c.form.controls.clientName.disabled).toBe(true);
    search(c, '');
    expect(c.selectedWork()).toBeNull();
    expect(c.form.controls.workId.valid).toBe(false);
    expect(c.form.controls.clientName.value).toBe('');
  });

  it('descarta respostas de uma busca anterior', () => {
    vi.useFakeTimers();
    const first = new Subject<MemorandoObraLegado[]>();
    const second = new Subject<MemorandoObraLegado[]>();
    service.buscarObrasPorPC.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const c = TestBed.createComponent(CadastrarMemorandoRemessas).componentInstance;
    search(c, 'PC001');
    vi.advanceTimersByTime(300);
    search(c, 'PC002');
    first.next([work]);
    expect(c.works()).toEqual([]);
    vi.advanceTimersByTime(300);
    const other = { ...work, legacy_work_id: 43, cost_center: 'PC002' };
    second.next([other]);
    expect(c.works()).toEqual([other]);
  });

  it('restaura os dados salvos na edição sem consultar clientes', () => {
    route.snapshot.paramMap = convertToParamMap({ id: '1' });
    const c = TestBed.createComponent(CadastrarMemorandoRemessas).componentInstance;
    expect(c.pcSearch()).toBe('PC25017');
    expect(c.selectedWork()?.legacy_work_id).toBe(42);
    expect(c.form.controls.clientName.value).toBe('Cliente teste');
    expect(c.form.controls.notes.value).toBe('Observações');
    expect(c.form.pristine).toBe(true);
    expect(service.listarClientesLegado).not.toHaveBeenCalled();
    expect(service.buscarObrasPorPC).not.toHaveBeenCalled();
  });
});
