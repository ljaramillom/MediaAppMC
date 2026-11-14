import { Component, effect, inject, viewChild } from '@angular/core';
import { MedicService } from '../../services/medic.service';
import { Medic } from '../../model/medic';
import { MedicStore } from '../../store/medic.store';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../services/notification.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { filter, switchMap, tap } from 'rxjs';
import { MedicDialogData, MedicEditComponent } from './medic-edit/medic-edit.component';

@Component({
  imports: [
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatSnackBarModule
  ],
  providers: [MedicStore],
  selector: 'app-medic',
  styleUrl: './medic.component.css',
  templateUrl: './medic.component.html',
})
export class MedicComponent {

  private readonly medicService = inject(MedicService);
  private readonly medicStore = inject(MedicStore);
  private readonly notificationService = inject(NotificationService);
  protected $medics = this.medicStore.$medics;

  protected readonly dataSource = new MatTableDataSource<Medic>();
  protected displayedColumns: string[] = ['idMedic', 'photo', 'primaryName', 'surname', 'cmpMedic', 'actions'];
  protected readonly $paginator = viewChild(MatPaginator);
  protected readonly $sort = viewChild(MatSort);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  constructor() {
    this.setupTableEffect();
    this.setupNotificationEffect();
  }

  private setupTableEffect() {
    effect(() => {
      const data = this.$medics();
      const p = this.$paginator();
      const s = this.$sort();

      this.dataSource.data = data;
      this.dataSource.paginator = p;
      this.dataSource.sort = s;
    });
  }

  private setupNotificationEffect(){
    effect(() => {
      const message = this.notificationService.$message();
      if(message){
        this.snackBar.open(message, 'INFO', { duration: 3000, horizontalPosition: 'left', verticalPosition: 'top' });
        this.notificationService.clear();
      }
    });
  }

  // Abre el formulario en un dialogo (idMedic null = nuevo); al guardar, el listado recarga y notifica
  openDialog(idMedic: number | null = null){
    this.dialog.open<MedicEditComponent, MedicDialogData, boolean>(MedicEditComponent, {
      data: { idMedic }, width: '520px', maxWidth: '95vw'
    }).afterClosed().pipe(
      filter(saved => saved === true),
      tap(() => {
        this.medicStore.reload();
        this.notificationService.notify(idMedic ? 'UPDATED' : 'CREATED');
      })
    ).subscribe();
  }

  // Pide confirmacion antes de eliminar y luego refresca la lista
  delete(idMedic: number){
    this.dialog.open(ConfirmDialogComponent).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => this.medicService.delete(idMedic)),
      tap(()=> {
        this.medicStore.reload();
        this.notificationService.notify('DELETED');
      })
    ).subscribe();
  }

  applyFilter(e: Event){
    const filterValue = (e.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
