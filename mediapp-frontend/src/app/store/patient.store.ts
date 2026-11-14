import { httpResource } from "@angular/common/http";
import { Patient } from "../model/patient";
import { inject, Service } from "@angular/core";
import { PatientService } from "../services/patient.service";

@Service({ autoProvided: false})
export class PatientStore{

    private readonly patientService = inject(PatientService);

    readonly patientsResource = httpResource<Patient[]>( () => this.patientService.resourceUrl, { defaultValue: [] });

    readonly $patients = this.patientsResource.value;
    readonly $loading = this.patientsResource.isLoading;
    readonly $error = this.patientsResource.error;

    reload(){
        this.patientsResource.reload();
    }
}
