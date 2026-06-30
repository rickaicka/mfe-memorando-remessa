import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemessasHome } from './remessas-home.component';

describe('RemessasHome', () => {
  let component: RemessasHome;
  let fixture: ComponentFixture<RemessasHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemessasHome],
    }).compileComponents();

    fixture = TestBed.createComponent(RemessasHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
