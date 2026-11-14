import { Component, effect, inject, viewChild } from '@angular/core';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../model/patient';
import { PatientStore } from '../../store/patient.store';
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
  providers: [PatientStore],
  selector: 'app-patient',
  styleUrl: './patient.component.css',
  templateUrl: './patient.component.html',
})
export class PatientComponent {

  private readonly patientService = inject(PatientService);
  private readonly patientStore = inject(PatientStore);
  private readonly notificationService = inject(NotificationService);
  protected $patients = this.patientStore.$patients;

  protected readonly dataSource = new MatTableDataSource<Patient>();
  protected displayedColumns: string[] = ['idPatient', 'firstName', 'lastName', 'dni', 'phone', 'email', 'actions'];
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
      const data = this.$patients();
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

  delete(idPatient: number){
    this.dialog.open(ConfirmDialogComponent).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => this.patientService.delete(idPatient)),
      tap(()=> {
        this.patientStore.reload();
        this.notificationService.notify('DELETED');
      })
    ).subscribe();
  }

  applyFilter(e: any){
    const filterValue = e.target.value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
