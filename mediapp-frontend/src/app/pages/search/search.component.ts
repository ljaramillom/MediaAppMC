import { Component, effect, inject, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { format } from 'date-fns';
import { SearchForm } from '../forms/search.form';
import { SearchStore } from '../../store/search.store';
import { Consult } from '../../model/consult';
import { FilterConsultDTO } from '../../model/filter-consult-dto';
import { SearchDialogComponent } from './search-dialog/search-dialog.component';

// LocalDateTime del backend: sin zona horaria y con la parte de hora (si no, responde 400)
const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

@Component({
  imports: [
    FormField,
    DatePipe,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule
  ],
  // Formulario y store por visita: cada vez que se entra a la pantalla empieza vacia
  providers: [SearchForm, SearchStore, provideNativeDateAdapter()],
  selector: 'app-search',
  styleUrl: './search.component.css',
  templateUrl: './search.component.html',
})
export class SearchComponent {

  protected readonly searchForm = inject(SearchForm);
  private readonly searchStore = inject(SearchStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly $tabGroup = viewChild(MatTabGroup);

  protected readonly dataSource = new MatTableDataSource<Consult>();
  protected readonly displayedColumns: string[] = ['patient', 'medic', 'date', 'actions'];

  constructor() {
    // Una sola fuente para la tabla, sin importar que busqueda se ejecuto
    effect(() => {
      this.dataSource.data = this.searchStore.$consultData();
    });
  }

  // La pestaña activa decide el modo de busqueda
  search(){
    if(this.$tabGroup()?.selectedIndex === 0){
      this.searchByOthers();
    } else {
      this.searchByDates();
    }
  }

  viewDetails(consult: Consult){
    this.dialog.open<SearchDialogComponent, Consult>(SearchDialogComponent, {
      data: consult, width: '600px', maxWidth: '95vw'
    });
  }

  private searchByOthers(){
    if(!this.searchForm.isOthersValid()){
      this.snackBar.open('Enter a DNI or a name', 'INFO', { duration: 2000 });
      return;
    }

    const { dni, fullname } = this.searchForm.value();
    // El backend aplica LOWER solo a la columna: el nombre se envia siempre en minusculas.
    // Un campo vacio viaja como null para no coincidir con todo (LIKE '%%')
    const dto = new FilterConsultDTO(
      dni.trim() || null,
      fullname.trim().toLowerCase() || null
    );
    this.searchStore.searchByOthers(dto);
  }

  private searchByDates(){
    if(!this.searchForm.isDatesValid()){
      this.snackBar.open('Select a date range', 'INFO', { duration: 2000 });
      return;
    }

    const { startDate, endDate } = this.searchForm.value();
    this.searchStore.searchByDates(
      format(startDate, LOCAL_DATE_TIME_FORMAT),
      format(endDate, LOCAL_DATE_TIME_FORMAT)
    );
  }
}
