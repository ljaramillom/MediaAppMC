import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe, formatDate, NgClass } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConsultWizardForm, MAX_DIAGNOSIS_LENGTH, MAX_TREATMENT_LENGTH } from '../forms/consult-wizard.form';
import { ConsultWizardStore } from '../../store/consult-wizard.store';
import { ConsultService } from '../../services/consult.service';
import { ConsultDetail } from '../../model/consult-detail';
import { Consult } from '../../model/consult';
import { ConsultListExamDTO } from '../../model/consult-list-exam-dto';
import { Exam } from '../../model/exam';
import { Medic } from '../../model/medic';

// TODO: no hay autenticacion aun; cuando exista, el usuario saldra de la sesion
const DEFAULT_USER_ID = 1;

// Consult.numConsult es varchar(3): 'C' + 2 digitos como maximo, por eso la grilla termina en 99
const MAX_CONSULT_NUMBER = 99;

@Component({
  imports: [
    FormField,
    DatePipe,
    NgClass,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatAutocompleteModule,
    MatListModule,
    MatCardModule,
    MatGridListModule,
    MatSnackBarModule
  ],
  selector: 'app-consult-wizard',
  styleUrl: './consult-wizard.component.css',
  templateUrl: './consult-wizard.component.html',
  providers: [ConsultWizardForm, ConsultWizardStore, provideNativeDateAdapter()]
})
export class ConsultWizardComponent {

  protected readonly wizardForm = inject(ConsultWizardForm);
  private readonly wizardStore = inject(ConsultWizardStore);
  private readonly consultService = inject(ConsultService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly $patients = this.wizardStore.$patients;
  protected readonly $medics = this.wizardStore.$medics;
  private readonly $exams = this.wizardStore.$exams;

  protected readonly $stepper = viewChild(MatStepper);
  private readonly $examInput = viewChild<ElementRef<HTMLInputElement>>('examInput');

  protected readonly maxDiagnosisLength = MAX_DIAGNOSIS_LENGTH;
  protected readonly maxTreatmentLength = MAX_TREATMENT_LENGTH;
  // No se permiten consultas en fechas pasadas
  protected readonly minDate = new Date();
  // 1..99 -> se muestran y envian como C1..C99
  protected readonly consultNumbers = Array.from({ length: MAX_CONSULT_NUMBER }, (_, i) => i + 1);

  // Estado del wizard que no vive en el formulario
  protected readonly $details = signal<ConsultDetail[]>([]);
  protected readonly $selectedExams = signal<Exam[]>([]);
  protected readonly $selectedMedic = signal<Medic | null>(null);
  protected readonly $consultNumber = signal<number | null>(null);

  // Autocomplete de examenes: texto escrito y examen elegido (aun no agregado)
  protected readonly $examFilter = signal('');
  protected readonly $examCandidate = signal<Exam | null>(null);

  // Oculta los examenes ya agregados: el mismo examen no puede ir dos veces (PK compuesta en consult_exam)
  protected readonly $filteredExams = computed(() => {
    const text = this.$examFilter().trim().toLowerCase();
    const selectedIds = new Set(this.$selectedExams().map(e => e.idExam));
    return this.$exams()
      .filter(e => !selectedIds.has(e.idExam))
      .filter(e => !text || e.nameExam?.toLowerCase().includes(text));
  });

  protected readonly $selectedPatient = computed(() => {
    const id = this.wizardForm.$model().idPatient;
    return this.$patients().find(p => p.idPatient === id) ?? null;
  });

  protected readonly $numConsultLabel = computed(() => {
    const n = this.$consultNumber();
    return n === null ? null : `C${n}`;
  });

  // Paso 1 completo: paciente, fecha, medico y al menos un detalle
  protected readonly $step1Completed = computed(() =>
    this.wizardForm.isHeaderValid() && this.$selectedMedic() !== null && this.$details().length > 0
  );

  protected readonly $canSave = computed(() => this.$step1Completed() && this.$consultNumber() !== null);

  protected readonly displayExam = (exam: Exam | string | null): string =>
    typeof exam === 'string' ? exam : exam?.nameExam ?? '';

  addDetail(){
    if(!this.wizardForm.isDetailValid()) return;

    const { diagnosis, treatment } = this.wizardForm.value();
    this.$details.update(list => [...list, { diagnosis: diagnosis.trim(), treatment: treatment.trim() }]);
    this.wizardForm.clearDetail();
  }

  removeDetail(index: number){
    this.$details.update(list => list.filter((_, i) => i !== index));
  }

  onExamInput(e: Event){
    this.$examFilter.set((e.target as HTMLInputElement).value);
    this.$examCandidate.set(null);
  }

  onExamSelected(e: MatAutocompleteSelectedEvent){
    this.$examCandidate.set(e.option.value as Exam);
  }

  addExam(){
    const exam = this.$examCandidate();
    if(!exam) return;

    // Segunda defensa contra duplicados, ademas del filtro del autocomplete
    if(this.$selectedExams().some(e => e.idExam === exam.idExam)) return;

    this.$selectedExams.update(list => [...list, exam]);
    this.clearExamInput();
  }

  removeExam(idExam: number){
    this.$selectedExams.update(list => list.filter(e => e.idExam !== idExam));
  }

  selectMedic(medic: Medic){
    this.$selectedMedic.set(medic);
  }

  selectConsultNumber(n: number){
    this.$consultNumber.set(n);
  }

  // Siguiente manual del paso 2: sin numero de consulta no avanza
  nextManualStep(){
    if(this.$consultNumber() === null){
      this.snackBar.open('Please select a consult number', 'INFO', { duration: 2000 });
      return;
    }
    this.$stepper()?.next();
  }

  save(){
    // Misma condicion que deshabilita el boton: nunca se envia una consulta incompleta
    if(!this.$canSave()) return;

    const { consultDate } = this.wizardForm.value();

    const consult: Consult = {
      patient: this.$selectedPatient(),
      medic: this.$selectedMedic(),
      idUser: DEFAULT_USER_ID,
      numConsult: this.$numConsultLabel(),
      consultDate: this.toLocalDateTime(consultDate),
      details: this.$details()
    };

    const dto: ConsultListExamDTO = {
      consult,
      lstExam: this.$selectedExams()
    };

    this.consultService.saveTransactional(dto).subscribe(() => {
      this.snackBar.open('CREATED', 'INFO', { duration: 2000 });
      this.cleanControls();
    });
  }

  // LocalDateTime sin zona horaria: toISOString() agregaria 'Z' y desplazaria la hora a UTC
  private toLocalDateTime(date: Date): string {
    return formatDate(date, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }

  private clearExamInput(){
    this.$examFilter.set('');
    this.$examCandidate.set(null);
    const input = this.$examInput()?.nativeElement;
    if(input) input.value = '';
  }

  private cleanControls(){
    this.wizardForm.reset();
    this.$details.set([]);
    this.$selectedExams.set([]);
    this.$selectedMedic.set(null);
    this.$consultNumber.set(null);
    this.clearExamInput();
    this.$stepper()?.reset();
  }
}
