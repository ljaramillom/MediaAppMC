import { Component, computed, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FormField } from '@angular/forms/signals';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConsultWizardDesignForm, MAX_DIAGNOSIS_LENGTH, MAX_TREATMENT_LENGTH } from '../forms/consult-wizard-design.form';
import { ConsultWizardDesignStore } from '../../store/consult-wizard-design.store';
import { ConsultService } from '../../services/consult.service';
import { Consult } from '../../model/consult';
import { ConsultListExamDTO } from '../../model/consult-list-exam-dto';
import { Medic } from '../../model/medic';
import { Patient } from '../../model/patient';
import { Consultorio, CONSULTORIOS } from './consultorios';

// TODO: no hay autenticacion aun; cuando exista, el usuario saldra de la sesion
const DEFAULT_USER_ID = 1;

// Meses en español para "d de MMMM de y". Se evita registerLocaleData(localeEs):
// la app no registra ningun locale y no se quiere cambiar el formato global por una sola pantalla
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Lo que muestra el panel de exito; se copia antes de limpiar el formulario
interface SavedSummary {
  patient: string;
  medic: string;
  consultorio: string;
  date: string;
}

@Component({
  imports: [
    FormField,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  selector: 'app-consult-wizard-design',
  styleUrl: './consult-wizard-design.component.css',
  templateUrl: './consult-wizard-design.component.html',
  providers: [ConsultWizardDesignForm, ConsultWizardDesignStore, provideNativeDateAdapter()]
})
export class ConsultWizardDesignComponent {

  protected readonly wizardForm = inject(ConsultWizardDesignForm);
  private readonly wizardStore = inject(ConsultWizardDesignStore);
  private readonly consultService = inject(ConsultService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly $patients = this.wizardStore.$patients;
  protected readonly $medics = this.wizardStore.$medics;
  protected readonly $exams = this.wizardStore.$exams;

  protected readonly consultorios = CONSULTORIOS;
  protected readonly maxDiagnosisLength = MAX_DIAGNOSIS_LENGTH;
  protected readonly maxTreatmentLength = MAX_TREATMENT_LENGTH;
  // No se permiten atenciones en fechas pasadas
  protected readonly minDate = new Date();

  // En pantallas angostas el stepper pasa a orientacion vertical
  protected readonly $orientation = toSignal(
    inject(BreakpointObserver).observe('(max-width: 720px)').pipe(
      map(state => state.matches ? 'vertical' as const : 'horizontal' as const)
    ),
    { initialValue: 'horizontal' as const }
  );

  protected readonly $saving = signal(false);
  protected readonly $saved = signal<SavedSummary | null>(null);

  // idSpecialty -> nameSpecialty, para la etiqueta del medico
  private readonly $specialtyNames = computed(() =>
    new Map(this.wizardStore.$specialties().map(s => [s.idSpecialty, s.nameSpecialty]))
  );

  protected readonly $selectedMedic = computed(() => {
    const id = this.wizardForm.$model().idMedic;
    return this.$medics().find(m => m.idMedic === id) ?? null;
  });

  protected readonly $selectedPatient = computed(() => {
    const id = this.wizardForm.$model().idPatient;
    return this.$patients().find(p => p.idPatient === id) ?? null;
  });

  protected readonly $selectedConsultorio = computed(() => {
    const code = this.wizardForm.$model().numConsult;
    return this.consultorios.find(c => c.code === code) ?? null;
  });

  protected readonly $selectedExams = computed(() => {
    const ids = this.wizardForm.$model().idExams;
    return this.$exams().filter(e => ids.includes(e.idExam));
  });

  protected readonly $dateLabel = computed(() => this.toSpanishLongDate(this.wizardForm.$model().consultDate));

  protected readonly $canSave = computed(() => this.wizardForm.$form().valid() && !this.$saving());

  // "Nombre Apellido — Especialidad"; si la especialidad no aparece, "— CMP <cmp>"
  medicLabel(medic: Medic | null){
    if(!medic) return 'Sin seleccionar';
    const specialty = this.$specialtyNames().get(medic.idSpecialty) ?? `CMP ${medic.cmpMedic}`;
    return `${medic.primaryName} ${medic.surname} — ${specialty}`;
  }

  patientLabel(patient: Patient | null){
    if(!patient) return 'Sin seleccionar';
    return `${patient.firstName} ${patient.lastName} — DNI ${patient.dni}`;
  }

  consultorioLabel(c: Consultorio | null){
    return c ? `${c.name} · ${c.floor} · ${c.area}` : 'Sin seleccionar';
  }

  selectConsultorio(c: Consultorio){
    this.wizardForm.selectConsultorio(c.code);
  }

  save(){
    // Misma condicion que deshabilita el boton: nunca se envia una consulta incompleta
    if(!this.$canSave()) return;

    const { consultDate, diagnosis, treatment } = this.wizardForm.value();
    const medic = this.$selectedMedic();
    const patient = this.$selectedPatient();
    const consultorio = this.$selectedConsultorio();

    const consult: Consult = {
      patient,
      medic,
      idUser: DEFAULT_USER_ID,
      // El codigo del consultorio es el numero de consulta
      numConsult: this.wizardForm.value().numConsult,
      consultDate: this.toLocalDateTime(consultDate),
      // Exactamente un detalle
      details: [{ diagnosis: diagnosis.trim(), treatment: treatment.trim() }]
    };

    const dto: ConsultListExamDTO = {
      consult,
      lstExam: this.$selectedExams()
    };

    // Se arma el resumen antes de limpiar el formulario
    const summary: SavedSummary = {
      patient: patient ? `${patient.firstName} ${patient.lastName}` : '',
      medic: medic ? `${medic.primaryName} ${medic.surname}` : '',
      consultorio: this.consultorioLabel(consultorio),
      date: this.$dateLabel()
    };

    this.$saving.set(true);
    this.consultService.saveTransactional(dto).subscribe({
      next: () => {
        this.$saving.set(false);
        this.$saved.set(summary);
        this.wizardForm.reset();
      },
      // Se queda en el paso 3 con los datos intactos
      error: (err: HttpErrorResponse) => {
        this.$saving.set(false);
        const message = err.error?.message ?? 'No se pudo registrar la atención';
        this.snackBar.open(message, 'ERROR', { duration: 4000 });
      }
    });
  }

  // Vuelve al paso 1 vacio: el stepper se crea de nuevo al ocultar el panel de exito
  registerAnother(){
    this.wizardForm.reset();
    this.$saved.set(null);
  }

  // LocalDateTime sin zona horaria: toISOString() agregaria 'Z' y desplazaria la hora a UTC
  private toLocalDateTime(date: Date | null): string {
    return date ? formatDate(date, "yyyy-MM-dd'T'HH:mm:ss", 'en-US') : '';
  }

  // Equivale a formatDate(d, "d 'de' MMMM 'de' y", 'es') sin registrar el locale
  private toSpanishLongDate(date: Date | null): string {
    if(!date) return 'Sin fecha';
    return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
  }
}
