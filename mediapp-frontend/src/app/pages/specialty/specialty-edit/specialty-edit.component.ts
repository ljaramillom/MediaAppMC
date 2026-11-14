import { Component, computed, effect, inject } from '@angular/core';
import { FormRoot, FormField } from '@angular/forms/signals';
import { SpecialtyForm } from '../../forms/specialty.form';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SpecialtyEditStore } from '../../../store/specialty-edit.store';
import { Specialty } from '../../../model/specialty';
import { SpecialtyService } from '../../../services/specialty.service';
import { SpecialtyStore } from '../../../store/specialty.store';
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
  selector: 'app-specialty-edit',
  styleUrl: './specialty-edit.component.css',
  templateUrl: './specialty-edit.component.html',
  providers: [SpecialtyForm, SpecialtyEditStore]
})
export class SpecialtyEditComponent {

  protected readonly specialtyForm = inject(SpecialtyForm);
  protected readonly specialtyEditStore = inject(SpecialtyEditStore);
  private readonly specialtyStore = inject(SpecialtyStore);
  private readonly specialtyService = inject(SpecialtyService);

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
      this.specialtyEditStore.setId(this.$id());
    });

    // Cuando llega la especialidad desde el backend, se carga en el formulario
    effect( ()=> {
      if(this.specialtyEditStore.specialtyResource.hasValue()){
        this.specialtyForm.patch(this.specialtyEditStore.specialtyResource.value());
      }
    });
  }

  operate(){
    if(this.specialtyForm.isInvalid()) return;

    const isEdit = this.$isEdit();
    const id = this.$id();
    const specialty: Specialty = this.specialtyForm.value();

    const operation$ = isEdit ? this.specialtyService.update(id, specialty) : this.specialtyService.save(specialty);

    operation$.subscribe(()=> {
      this.specialtyStore.reload();
      this.notificationService.notify(isEdit ? 'UPDATED' : 'CREATED');
      this.router.navigate(['/pages/specialty']);
    });
  }
}
