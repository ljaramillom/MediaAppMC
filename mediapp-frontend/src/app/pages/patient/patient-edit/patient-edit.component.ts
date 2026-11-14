import { Component, computed, effect, inject } from '@angular/core';
import { FormRoot, FormField } from '@angular/forms/signals';
import { PatientForm } from '../../forms/patient.form';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PatientEditStore } from '../../../store/patient-edit.store';
import { Patient } from '../../../model/patient';
import { PatientService } from '../../../services/patient.service';
import { PatientStore } from '../../../store/patient.store';
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
  selector: 'app-patient-edit',
  styleUrl: './patient-edit.component.css',
  templateUrl: './patient-edit.component.html',
  providers: [PatientForm, PatientEditStore]
})
export class PatientEditComponent {

  protected readonly patientForm = inject(PatientForm);
  protected readonly patientEditStore = inject(PatientEditStore);
  private readonly patientStore = inject(PatientStore);
  private readonly patientService = inject(PatientService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  private readonly $params = toSignal(this.route.params, { initialValue: {}});

  protected $id = computed( ()=> {
    const id = this.$params()['id'];
    return id ? Number(id) : null;
  });

  protected $isEdit = computed(()=> this.$id() !== null);

  constructor(){
    effect( ()=> {
      this.patientEditStore.setId(this.$id());
    });

    effect( ()=> {
      if(this.patientEditStore.patientResource.hasValue()){
        this.patientForm.patch(this.patientEditStore.patientResource.value())
      }
    })
  }

  operate(){
    if(this.patientForm.isInvalid()) return;

    const isEdit = this.$isEdit();
    const id = this.$id();
    const patient: Patient = this.patientForm.value();

    const operation$ = isEdit ? this.patientService.update(id, patient) : this.patientService.save(patient);

    operation$.subscribe(()=> {
      this.patientStore.reload();
      this.notificationService.notify(isEdit ? 'UPDATED' : 'CREATED')
      this.router.navigate(['/pages/patient'])
    });
  }
}
