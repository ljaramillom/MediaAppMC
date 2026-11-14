import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormRoot, FormField } from '@angular/forms/signals';
import { MedicForm } from '../../forms/medic.form';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MedicEditStore } from '../../../store/medic-edit.store';
import { Medic } from '../../../model/medic';
import { MedicService } from '../../../services/medic.service';
import { SpecialtyStore } from '../../../store/specialty.store';

// Datos que recibe el dialogo: idMedic null significa registro nuevo
export interface MedicDialogData {
  idMedic: number | null;
}

// Limite de la foto; el backend vuelve a validar tipo y tamano
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

@Component({
  imports: [
    FormRoot,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    FormField,
    MatDialogModule
  ],
  selector: 'app-medic-edit',
  styleUrl: './medic-edit.component.css',
  templateUrl: './medic-edit.component.html',
  // SpecialtyStore alimenta el selector de especialidades (usa el SpecialtyService existente)
  providers: [MedicForm, MedicEditStore, SpecialtyStore]
})
export class MedicEditComponent {

  protected readonly medicForm = inject(MedicForm);
  protected readonly medicEditStore = inject(MedicEditStore);
  private readonly medicService = inject(MedicService);
  private readonly specialtyStore = inject(SpecialtyStore);
  protected readonly $specialties = this.specialtyStore.$specialties;

  // El dialogo se crea desde el injector raiz: no ve el MedicStore del listado,
  // por eso solo se cierra con true y el padre recarga y notifica
  private readonly data = inject<MedicDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<MedicEditComponent, boolean>>(MatDialogRef);

  protected $id = signal<number | null>(this.data?.idMedic ?? null);

  protected $isEdit = computed(()=> this.$id() !== null);

  // Archivo elegido (opcional) y su error de validacion en el cliente
  protected readonly $file = signal<File | null>(null);
  protected readonly $fileError = signal<string | null>(null);

  constructor(){
    effect( ()=> {
      this.medicEditStore.setId(this.$id());
    });

    // Cuando llega el medico desde el backend, se carga en el formulario
    effect( ()=> {
      if(this.medicEditStore.medicResource.hasValue()){
        this.medicForm.patch(this.medicEditStore.medicResource.value());
      }
    });
  }

  operate(){
    if(this.medicForm.isInvalid()) return;

    const isEdit = this.$isEdit();
    const id = this.$id();
    const medic: Medic = this.medicForm.value();

    const file = this.$file();

    const operation$ = isEdit ? this.medicService.update(id, medic, file) : this.medicService.save(medic, file);

    operation$.subscribe(()=> {
      this.dialogRef.close(true);
    });
  }

  onFileSelected(e: Event){
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if(!file){
      this.$file.set(null);
      this.$fileError.set(null);
      return;
    }

    if(!file.type.startsWith('image/')){
      this.$file.set(null);
      this.$fileError.set('Only image files are allowed');
    } else if(file.size > MAX_PHOTO_SIZE){
      this.$file.set(null);
      this.$fileError.set('The image must not exceed 2MB');
    } else {
      this.$file.set(file);
      this.$fileError.set(null);
    }
  }
}
