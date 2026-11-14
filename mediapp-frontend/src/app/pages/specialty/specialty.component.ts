import { Component, effect, inject, viewChild } from '@angular/core';
import { SpecialtyService } from '../../services/specialty.service';
import { Specialty } from '../../model/specialty';
import { SpecialtyStore } from '../../store/specialty.store';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { filter, switchMap, tap } from 'rxjs';

@Component({
  imports: [
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    RouterOutlet,
    RouterLink,
    MatSnackBarModule
  ],
  providers: [SpecialtyStore],
  selector: 'app-specialty',
  styleUrl: './specialty.component.css',
  templateUrl: './specialty.component.html',
})
export class SpecialtyComponent {

  private readonly specialtyService = inject(SpecialtyService);
  private readonly specialtyStore = inject(SpecialtyStore);
  private readonly notificationService = inject(NotificationService);
  protected $specialties = this.specialtyStore.$specialties;

  protected readonly dataSource = new MatTableDataSource<Specialty>();
  protected displayedColumns: string[] = ['idSpecialty', 'nameSpecialty', 'descriptionSpecialty', 'actions'];
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
      const data = this.$specialties();
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

  // Pide confirmacion antes de eliminar y luego refresca la lista
  delete(idSpecialty: number){
    this.dialog.open(ConfirmDialogComponent).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => this.specialtyService.delete(idSpecialty)),
      tap(()=> {
        this.specialtyStore.reload();
        this.notificationService.notify('DELETED');
      })
    ).subscribe();
  }

  applyFilter(e: Event){
    const filterValue = (e.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
