import { HttpClient, HttpParams } from '@angular/common/http';

import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  MemorandoArquivo,
  MemorandoClienteLegado,
  MemorandoCreatePayload,
  MemorandoFormularioOpcoes,
  MemorandoObraLegado,
  MemorandoRemessaDetalhe,
  MemorandoRemessaFiltros,
  MemorandoRemessaListOptions,
  MemorandoRemessaResumo,
  PaginatedResponse,
} from '../models/memorando-remessa.models';

@Injectable({
  providedIn: 'root',
})
export class MemorandoRemessaService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  private readonly baseUrl = `${this.apiUrl}/memorando-remessas`;

  private readonly resourceUrl = `${this.baseUrl}/memorandos`;

  listar(filtros: MemorandoRemessaFiltros): Observable<PaginatedResponse<MemorandoRemessaResumo>> {
    let params = new HttpParams()
      .set('page', filtros.page.toString())
      .set('page_size', filtros.pageSize.toString())
      .set('ordering', filtros.ordering);

    const search = filtros.search.trim();

    if (search) {
      params = params.set('search', search);
    }

    if (filtros.shippingDateFrom) {
      params = params.set('shipping_date_from', filtros.shippingDateFrom);
    }

    if (filtros.shippingDateTo) {
      params = params.set('shipping_date_to', filtros.shippingDateTo);
    }

    if (filtros.status) {
      params = params.set('status', filtros.status);
    }

    if (filtros.costCenter) {
      params = params.set('cost_center', filtros.costCenter);
    }

    return this.http.get<PaginatedResponse<MemorandoRemessaResumo>>(`${this.resourceUrl}/`, {
      params,
    });
  }

  obterOpcoesLista(): Observable<MemorandoRemessaListOptions> {
    return this.http.get<MemorandoRemessaListOptions>(`${this.baseUrl}/opcoes/`);
  }

  obterOpcoesFormulario(): Observable<MemorandoFormularioOpcoes> {
    return this.http.get<MemorandoFormularioOpcoes>(`${this.baseUrl}/opcoes/`);
  }

  listarClientesLegado(): Observable<
    MemorandoClienteLegado[] | PaginatedResponse<MemorandoClienteLegado>
  > {
    return this.http.get<MemorandoClienteLegado[] | PaginatedResponse<MemorandoClienteLegado>>(
      `${this.baseUrl}/legado/clientes/`,
    );
  }

  listarObrasLegado(
    clientName: string,
    clientDocument = '',
  ): Observable<MemorandoObraLegado[] | PaginatedResponse<MemorandoObraLegado>> {
    let params = new HttpParams().set('client_name', clientName.trim());

    const normalizedDocument = clientDocument.trim();

    if (normalizedDocument) {
      params = params.set('client_document', normalizedDocument);
    }

    return this.http.get<MemorandoObraLegado[] | PaginatedResponse<MemorandoObraLegado>>(
      `${this.baseUrl}/legado/obras/`,
      {
        params,
      },
    );
  }

  detalharObraLegado(legacyWorkId: number): Observable<MemorandoObraLegado> {
    return this.http.get<MemorandoObraLegado>(`${this.baseUrl}/legado/obras/${legacyWorkId}/`);
  }

  obterPorId(memorandoId: number): Observable<MemorandoRemessaDetalhe> {
    return this.http.get<MemorandoRemessaDetalhe>(`${this.resourceUrl}/${memorandoId}/`);
  }

  criar(payload: MemorandoCreatePayload): Observable<MemorandoRemessaDetalhe> {
    return this.http.post<MemorandoRemessaDetalhe>(`${this.resourceUrl}/`, payload);
  }

  atualizar(
    memorandoId: number,
    payload: Partial<MemorandoCreatePayload>,
  ): Observable<MemorandoRemessaDetalhe> {
    return this.http.patch<MemorandoRemessaDetalhe>(`${this.resourceUrl}/${memorandoId}/`, payload);
  }

  adicionarArquivo(memorandoId: number, file: File): Observable<MemorandoArquivo> {
    const formData = new FormData();

    formData.append('file', file, file.name);

    return this.http.post<MemorandoArquivo>(
      `${this.resourceUrl}/${memorandoId}/arquivos/`,
      formData,
    );
  }

  removerArquivo(memorandoId: number, arquivoId: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${memorandoId}/arquivos/${arquivoId}/`);
  }

  removerMemorando(memorandoId: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${memorandoId}/`);
  }

  baixarArquivo(memorandoId: number, arquivoId: number): Observable<Blob> {
    return this.http.get(`${this.resourceUrl}/${memorandoId}/arquivos/${arquivoId}/download/`, {
      responseType: 'blob',
    });
  }

  enviar(memorandoId: number): Observable<MemorandoRemessaDetalhe> {
    return this.http.post<MemorandoRemessaDetalhe>(
      `${this.resourceUrl}/${memorandoId}/enviar/`,
      {},
    );
  }
}
