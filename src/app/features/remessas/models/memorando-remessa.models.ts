export type MemorandoRemessaStatus =
  | 'RASCUNHO'
  | 'PROCESSANDO_ENVIO'
  | 'ENVIADO'
  | 'FALHA_ENVIO'
  | 'CANCELADO';

export type MemorandoWorkSource = 'ACCESS' | 'HUB';

export type MemorandoOptionType = 'FINALIDADE';

export interface MemorandoResponsavelResumo {
  id: number;
  user_id: number;
  username: string;
  name: string;
  email: string;
  is_primary: boolean;
  created_at: string;
}

export interface MemorandoRemessaResumo {
  id: number;

  code: string;
  sequence_number: number;
  revision: number;
  revised_from: number | null;

  status: MemorandoRemessaStatus;
  status_label: string;

  work_source: MemorandoWorkSource;
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

  responsible_users?: MemorandoResponsavelResumo[];

  primary_responsible_name?: string | null;

  created_at?: string;
  updated_at?: string;
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
      value: 'PROCESSANDO_ENVIO',
      label: 'Processando envio',
    },
    {
      value: 'ENVIADO',
      label: 'Enviado',
    },
    {
      value: 'FALHA_ENVIO',
      label: 'Falha no envio',
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

export interface MemorandoFormularioOpcao {
  id: number;
  option_type?: MemorandoOptionType;
  type_label?: string;

  code?: string;
  name?: string;
  label?: string;
  nome?: string;

  description?: string;
  order?: number;
}

export interface MemorandoFormularioOpcoes {
  purposes?: MemorandoFormularioOpcao[];
  finalidades?: MemorandoFormularioOpcao[];
}

export interface MemorandoClienteLegado {
  id?: number;
  legacy_id?: number;
  legacy_client_id?: number;

  name?: string;
  nome?: string;
  client_name?: string;

  document?: string | null;
  client_document?: string | null;
}

export interface MemorandoObraLegado {
  legacy_work_id: number;
  legacy_proposal_id: number | null;

  cost_center: string;
  work_name: string;

  client_name: string;
  client_document: string | null;
}

export interface MemorandoCreatePayload {
  legacy_work_id: number;

  shipping_date: string;

  subject: string;
  attention_to: string;
  notes: string;

  option_ids: number[];
}

export interface MemorandoOpcaoSelecionada {
  id: number;

  option_type: MemorandoOptionType;
  type_label: string;

  code: string;
  name: string;
  description: string;
  order: number;
}

export interface MemorandoArquivo {
  id: number;
  shipment_memo: number;

  original_name: string;
  content_type: string;
  size: number;

  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_by_username: string;

  download_url: string;
  created_at: string;
}

/**
 * Mantido para não quebrar imports existentes.
 */
export type MemorandoArquivoResponse = MemorandoArquivo;

export interface MemorandoUsuarioLocal {
  id?: number;
  user_id?: number;

  username?: string;
  name?: string;
  nome?: string;
  email?: string;
}

export interface MemorandoRemessaDetalhe
  extends MemorandoRemessaResumo {
  recipient_emails: string[];
  cc_emails: string[];

  responsible_users: MemorandoResponsavelResumo[];

  selected_options: MemorandoOpcaoSelecionada[];
  attachments: MemorandoArquivo[];

  created_by: number;
  created_by_name: string;

  updated_by: number;
  updated_by_name: string;

  sent_by: number | null;
  sent_by_name: string | null;
  sent_at: string | null;

  last_send_error: string;

  cancelled_by: number | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;

  created_at: string;
  updated_at: string;
}
