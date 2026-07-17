export interface MemorandoOption {
  id: number;
  code: string;
  name: string;
}

export interface MemorandoOptionsResponse {
  species: MemorandoOption[];
  purposes: MemorandoOption[];
  requests: MemorandoOption[];
}

export interface LegacyClient {
  id: number;
  legacy_id: number;
  name: string;
  document?: string | null;
}

export interface LegacyWork {
  legacy_work_id: number;
  legacy_proposal_id: number | null;

  cost_center: string;
  work_name: string;

  client_name: string;
  client_document?: string | null;
}

export interface LoggedUserSummary {
  id: number;
  username: string;
  name: string;
  email?: string;
}

export interface MemorandoCreatePayload {
  work_source: 'ACCESS';

  legacy_work_id: number;
  legacy_proposal_id: number | null;

  cost_center: string;
  work_name: string;

  client_name: string;
  client_document: string;

  shipping_date: string;

  subject: string;
  attention_to: string;
  notes: string;

  species_ids: number[];
  purpose_ids: number[];
  request_ids: number[];
}

export interface MemorandoCreateResponse {
  id: number;

  code: string;
  sequence_number: number;
  revision: number;

  status: string;
  status_label: string;

  work_source: string;

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
}

export interface MemorandoFileResponse {
  id: number;
  name: string;
  original_name?: string;
  file_url?: string;
  created_at?: string;
}

export interface MemorandoHistoryItem {
  id: number;
  code: string;
  revision: number;
  status: string;
  status_label: string;
  shipping_date: string;
}

export interface MemorandoFormularioOpcao {
  id: number;
  code?: string;
  name?: string;
  label?: string;
  nome?: string;
}

export interface MemorandoFormularioOpcoes {
  species?: MemorandoFormularioOpcao[];
  especies?: MemorandoFormularioOpcao[];

  purposes?: MemorandoFormularioOpcao[];
  finalidades?: MemorandoFormularioOpcao[];

  requests?: MemorandoFormularioOpcao[];
  solicitamos?: MemorandoFormularioOpcao[];
  solicitacoes?: MemorandoFormularioOpcao[];
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
  client_document: string;
}

export interface MemorandoCreatePayload {
  work_source: 'ACCESS';

  legacy_work_id: number;
  legacy_proposal_id: number | null;

  cost_center: string;
  work_name: string;

  client_name: string;
  client_document: string;

  shipping_date: string;

  subject: string;
  attention_to: string;
  notes: string;

  species_ids: number[];
  purpose_ids: number[];
  request_ids: number[];
}

export interface MemorandoArquivoResponse {
  id: number;
  name?: string;
  original_name?: string;
  created_at?: string;
}

export interface MemorandoUsuarioLocal {
  id?: number;
  user_id?: number;

  username?: string;
  name?: string;
  nome?: string;
  email?: string;
}
