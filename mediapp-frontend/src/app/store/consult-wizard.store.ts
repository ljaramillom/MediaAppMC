import { httpResource } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Patient } from "../model/patient";
import { Medic } from "../model/medic";
import { Exam } from "../model/exam";
import { PatientService } from "../services/patient.service";
import { MedicService } from "../services/medic.service";
import { ExamService } from "../services/exam.service";

// Catalogos que necesita el wizard: pacientes, medicos y examenes
@Service({ autoProvided: false})
export class ConsultWizardStore{

    private readonly patientService = inject(PatientService);
    private readonly medicService = inject(MedicService);
    private readonly examService = inject(ExamService);

    readonly patientsResource = httpResource<Patient[]>( () => this.patientService.resourceUrl, { defaultValue: [] });
    readonly medicsResource = httpResource<Medic[]>( () => this.medicService.resourceUrl, { defaultValue: [] });
    readonly examsResource = httpResource<Exam[]>( () => this.examService.resourceUrl, { defaultValue: [] });

    readonly $patients = this.patientsResource.value;
    readonly $medics = this.medicsResource.value;
    readonly $exams = this.examsResource.value;

    readonly $loading = () => this.patientsResource.isLoading() || this.medicsResource.isLoading() || this.examsResource.isLoading();
}
