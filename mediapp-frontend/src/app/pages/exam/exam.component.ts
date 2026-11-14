import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { ExamService } from '../../services/exam.service';
import { Exam } from '../../model/exam';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamStore } from '../../store/exam.store';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
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
  providers: [ExamStore],
  selector: 'app-exam',
  styleUrl: './exam.component.css',
  templateUrl: './exam.component.html',
})
export class ExamComponent {

  private readonly examService = inject(ExamService);
  private readonly examStore = inject(ExamStore);
  private readonly notificationService = inject(NotificationService);
  //protected exams = signal<Exam[]>([]);
  //protected $exams = toSignal(this.examService.findAll(), { initialValue: [] });
  protected $exams = this.examStore.$exams;

  protected readonly dataSource = new MatTableDataSource<Exam>();
  protected displayedColumns: string[] = ['idExam', 'nameExam', 'descriptionExam', 'actions'];
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
      const data = this.$exams();
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

  delete(idExam: number){
    this.dialog.open(ConfirmDialogComponent).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => this.examService.delete(idExam)),
      tap(()=> {
        this.examStore.reload();
        this.notificationService.notify('DELETED');
      })
    ).subscribe();
  }
  
  /*constructor(){
    effect( ()=> {
      const data = this.$exams();
      const p = this.$paginator();
      const s = this.$sort();

      this.dataSource.data = data;
      this.dataSource.paginator = p;
      this.dataSource.sort = s;
    });

    effect( ()=> {
      const message = this.notificationService.$message();
      if(message){
        this.snackBar.open(message, 'INFO', { duration: 3000, horizontalPosition: 'left', verticalPosition: 'top'});
        this.notificationService.clear();
      }
    });
  }*/

  /*ngOnInit(): void {
    this.examService.findAll().subscribe(data => {
      console.log(data);
      this.dataSource = new MatTableDataSource(data)
    });
  }*/

  /*ngOnInit(): void {
    this.examService.findAll().subscribe(data => {
      //console.log(data);
      //this.exams = data;
      this.exams.set(data);
    });
  }*/

    applyFilter(e: any){
      const filterValue = e.target.value;
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }
}
