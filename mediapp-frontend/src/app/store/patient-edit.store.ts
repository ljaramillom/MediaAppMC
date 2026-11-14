import { computed, inject, Service, signal } from "@angular/core";
import { PatientService } from "../services/patient.service";
import { httpResource } from "@angular/common/http";
import { Patient } from "../model/patient";

@Service({ autoProvided: false })
export class PatientEditStore{

    private readonly patientService = inject(PatientService);
    readonly $id = signal<number | null>(null);

    private readonly $patientRequest = computed( ()=> {
        const id = this.$id();
        return id ? `${this.patientService.resourceUrl}/${id}` : null;
    });

    readonly patientResource = httpResource<Patient>(() => this.$patientRequest());

    setId(id: number){
        this.$id.set(id);
    }

}
