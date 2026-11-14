import { httpResource } from "@angular/common/http";
import { inject, Service, signal } from "@angular/core";
import { Exam } from "../model/exam";
import { ConsultService } from "../services/consult.service";

@Service({ autoProvided: false})
export class SearchDialogStore{

    private readonly consultService = inject(ConsultService);

    // Inactivo hasta que el dialogo fije el id de la consulta
    private readonly $idConsult = signal<number | undefined>(undefined);

    readonly examsResource = httpResource<Exam[]>(() => {
        const id = this.$idConsult();
        return id ? this.consultService.consultExamsUrl(id) : undefined;
    }, { defaultValue: [] });

    readonly $exams = this.examsResource.value;
    readonly $loading = this.examsResource.isLoading;

    setIdConsult(idConsult: number){
        this.$idConsult.set(idConsult);
    }
}
