import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
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

  private readonly resourceUrl =
    `${this.apiUrl}/memorando-remessas/memorandos`;

  listar(
    filtros: MemorandoRemessaFiltros,
  ): Observable<PaginatedResponse<MemorandoRemessaResumo>> {
    let params = new HttpParams()
      .set('page', filtros.page.toString())
      .set('page_size', filtros.pageSize.toString())
      .set('ordering', filtros.ordering);

    const search = filtros.search.trim();

    if (search) {
      params = params.set('search', search);
    }

    if (filtros.shippingDateFrom) {
      params = params.set(
        'shipping_date_from',
        filtros.shippingDateFrom,
      );
    }

    if (filtros.shippingDateTo) {
      params = params.set(
        'shipping_date_to',
        filtros.shippingDateTo,
      );
    }

    if (filtros.status) {
      params = params.set('status', filtros.status);
    }

    if (filtros.costCenter) {
      params = params.set(
        'cost_center',
        filtros.costCenter,
      );
    }

    return this.http.get<
      PaginatedResponse<MemorandoRemessaResumo>
    >(`${this.resourceUrl}/`, {
      params,
    });
  }

  obterOpcoes(): Observable<MemorandoRemessaListOptions> {
    return this.http.get<MemorandoRemessaListOptions>(
      `${this.resourceUrl}/opcoes/`,
    );
  }

  obterPorId(
    memorandoId: number,
  ): Observable<MemorandoRemessaResumo> {
    return this.http.get<MemorandoRemessaResumo>(
      `${this.resourceUrl}/${memorandoId}/`,
    );
  }
}
