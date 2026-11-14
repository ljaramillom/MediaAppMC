import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Consult } from '../../../model/consult';
import { SearchDialogStore } from '../../../store/search-dialog.store';

// Detalle de solo lectura: diagnosticos y tratamientos vienen en la consulta; los examenes se piden aparte
@Component({
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  providers: [SearchDialogStore],
  selector: 'app-search-dialog',
  styleUrl: './search-dialog.component.css',
  templateUrl: './search-dialog.component.html',
})
export class SearchDialogComponent {

  protected readonly consult = inject<Consult>(MAT_DIALOG_DATA);
  private readonly searchDialogStore = inject(SearchDialogStore);

  protected readonly $exams = this.searchDialogStore.$exams;
  protected readonly $loadingExams = this.searchDialogStore.$loading;

  constructor(){
    // Activa el recurso de examenes con el id de la consulta recibida
    this.searchDialogStore.setIdConsult(this.consult.idConsult);
  }
}
