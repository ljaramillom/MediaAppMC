import { httpResource } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Patient } from "../model/patient";
import { Medic } from "../model/medic";
import { Exam } from "../model/exam";
import { Specialty } from "../model/specialty";
import { PatientService } from "../services/patient.service";
import { MedicService } from "../services/medic.service";
import { ExamService } from "../services/exam.service";
import { SpecialtyService } from "../services/specialty.service";

// Catalogos del wizard de diseño. Ademas de pacientes, medicos y examenes carga especialidades
// para mostrar "nombre — especialidad" en el selector de medico (Medic solo trae idSpecialty)
@Service({ autoProvided: false})
export class ConsultWizardDesignStore{

    private readonly patientService = inject(PatientService);
    private readonly medicService = inject(MedicService);
    private readonly examService = inject(ExamService);
    private readonly specialtyService = inject(SpecialtyService);

    readonly patientsResource = httpResource<Patient[]>( () => this.patientService.resourceUrl, { defaultValue: [] });
    readonly medicsResource = httpResource<Medic[]>( () => this.medicService.resourceUrl, { defaultValue: [] });
    readonly examsResource = httpResource<Exam[]>( () => this.examService.resourceUrl, { defaultValue: [] });
    readonly specialtiesResource = httpResource<Specialty[]>( () => this.specialtyService.resourceUrl, { defaultValue: [] });

    readonly $patients = this.patientsResource.value;
    readonly $medics = this.medicsResource.value;
    readonly $exams = this.examsResource.value;
    readonly $specialties = this.specialtiesResource.value;

    readonly $loading = () => this.patientsResource.isLoading() || this.medicsResource.isLoading()
        || this.examsResource.isLoading() || this.specialtiesResource.isLoading();
}
