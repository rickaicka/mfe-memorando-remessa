import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemessasList } from './remessas-list.component';

describe('RemessasList', () => {
  let component: RemessasList;
  let fixture: ComponentFixture<RemessasList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemessasList],
    }).compileComponents();

    fixture = TestBed.createComponent(RemessasList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
