export type MemorandoRemessaStatus =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'EM_ANDAMENTO'
  | 'CANCELADO';

export interface MemorandoResponsavelResumo {
  id: number;
  user_id: number;
  username: string;
  name: string;
  email: string;
}

export interface MemorandoRemessaResumo {
  id: number;

  code: string;
  sequence_number: number;
  revision: number;
  revised_from: number | null;

  status: MemorandoRemessaStatus;
  status_label: string;

  work_source: string;
  work_source_label: string;

  legacy_work_id: number | null;
  legacy_proposal_id: number | null;

  cost_center: string;
  work_name: string;

  client_name: string;
  client_document: string;

  shipping_date: string;

  subject: string;
  attention_to: string;
  notes: string;

  responsible_users: MemorandoResponsavelResumo[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MemorandoRemessaFiltros {
  search: string;

  shippingDateFrom: string | null;
  shippingDateTo: string | null;

  status: MemorandoRemessaStatus | null;
  costCenter: string | null;

  page: number;
  pageSize: number;
  ordering: string;
}

export interface MemorandoRemessaSelectOption<T = string> {
  value: T;
  label: string;
}

export interface MemorandoRemessaListOptions {
  statuses: MemorandoRemessaSelectOption<MemorandoRemessaStatus>[];
  cost_centers: MemorandoRemessaSelectOption<string>[];
}

export const MEMORANDO_REMESSA_STATUS_OPTIONS: MemorandoRemessaSelectOption<MemorandoRemessaStatus>[] =
  [
    {
      value: 'RASCUNHO',
      label: 'Rascunho',
    },
    {
      value: 'ENVIADO',
      label: 'Enviado',
    },
    {
      value: 'CANCELADO',
      label: 'Cancelado',
    },
  ];

export const MEMORANDO_REMESSA_DEFAULT_FILTERS: MemorandoRemessaFiltros = {
  search: '',

  shippingDateFrom: null,
  shippingDateTo: null,

  status: null,
  costCenter: null,

  page: 1,
  pageSize: 10,
  ordering: '-shipping_date,-id',
};
