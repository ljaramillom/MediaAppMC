import { Component, computed, effect, inject } from '@angular/core';
import { FormRoot, FormField } from '@angular/forms/signals';
import { ExamForm } from '../../forms/exam.form';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamEditStore } from '../../../store/exam-edit.store';
import { Exam } from '../../../model/exam';
import { ExamService } from '../../../services/exam.service';
import { ExamStore } from '../../../store/exam.store';
import { NotificationService } from '../../../services/notification.service';


@Component({
  imports: [
    FormRoot,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    FormField,
    RouterLink
],
  selector: 'app-exam-edit',
  styleUrl: './exam-edit.component.css',
  templateUrl: './exam-edit.component.html',
  providers: [ExamForm, ExamEditStore]
})
export class ExamEditComponent {

  protected readonly examForm = inject(ExamForm);
  protected readonly examEditStore = inject(ExamEditStore);
  private readonly examStore = inject(ExamStore);
  private readonly examService = inject(ExamService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifcationService = inject(NotificationService);

  private readonly $params = toSignal(this.route.params, { initialValue: {}});
  
  protected $id = computed( ()=> {
    const id = this.$params()['id'];
    return id ? Number(id) : null;
  });

  protected $isEdit = computed(()=> this.$id() !== null);

  constructor(){
    effect( ()=> {
      this.examEditStore.setId(this.$id());
    });


    effect( ()=> {
      if(this.examEditStore.examResource.hasValue()){
        this.examForm.patch(this.examEditStore.examResource.value())
      }
    })
  }

  operate(){
    if(this.examForm.isInvalid()) return;

    const isEdit = this.$isEdit();
    const id = this.$id();
    const exam: Exam = this.examForm.value();

    const operation$ = isEdit ? this.examService.update(id, exam) : this.examService.save(exam);

    operation$.subscribe(()=> {
      this.examStore.reload();
      this.notifcationService.notify(isEdit ? 'UPDATED' : 'CREATED')
      this.router.navigate(['/pages/exam'])
    });
  }
}
