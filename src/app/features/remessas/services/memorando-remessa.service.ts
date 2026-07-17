import { HttpClient, HttpParams } from '@angular/common/http';

import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  MemorandoArquivoResponse,
  MemorandoClienteLegado,
  MemorandoCreatePayload,
  MemorandoFormularioOpcoes,
  MemorandoObraLegado,
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

  listarObrasLegado(): Observable<MemorandoObraLegado[] | PaginatedResponse<MemorandoObraLegado>> {
    return this.http.get<MemorandoObraLegado[] | PaginatedResponse<MemorandoObraLegado>>(
      `${this.baseUrl}/legado/obras/`,
    );
  }

  detalharObraLegado(legacyWorkId: number): Observable<MemorandoObraLegado> {
    return this.http.get<MemorandoObraLegado>(`${this.baseUrl}/legado/obras/${legacyWorkId}/`);
  }

  obterPorId(memorandoId: number): Observable<MemorandoRemessaResumo> {
    return this.http.get<MemorandoRemessaResumo>(`${this.resourceUrl}/${memorandoId}/`);
  }

  criar(payload: MemorandoCreatePayload): Observable<MemorandoRemessaResumo> {
    return this.http.post<MemorandoRemessaResumo>(`${this.resourceUrl}/`, payload);
  }

  atualizar(
    memorandoId: number,
    payload: Partial<MemorandoCreatePayload>,
  ): Observable<MemorandoRemessaResumo> {
    return this.http.patch<MemorandoRemessaResumo>(`${this.resourceUrl}/${memorandoId}/`, payload);
  }

  adicionarArquivo(memorandoId: number, file: File): Observable<MemorandoArquivoResponse> {
    const formData = new FormData();

    formData.append('file', file, file.name);

    return this.http.post<MemorandoArquivoResponse>(
      `${this.resourceUrl}/${memorandoId}/arquivos/`,
      formData,
    );
  }

  enviar(memorandoId: number): Observable<MemorandoRemessaResumo> {
    return this.http.post<MemorandoRemessaResumo>(`${this.resourceUrl}/${memorandoId}/enviar/`, {});
  }
}
