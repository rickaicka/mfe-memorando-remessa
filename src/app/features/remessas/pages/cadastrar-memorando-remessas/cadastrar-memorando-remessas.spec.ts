import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastrarMemorandoRemessas } from './cadastrar-memorando-remessas';

describe('CadastrarMemorandoRemessas', () => {
  let component: CadastrarMemorandoRemessas;
  let fixture: ComponentFixture<CadastrarMemorandoRemessas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastrarMemorandoRemessas],
    }).compileComponents();

    fixture = TestBed.createComponent(CadastrarMemorandoRemessas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
