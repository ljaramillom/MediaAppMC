import { computed, inject, Service, signal } from "@angular/core";
import { MedicService } from "../services/medic.service";
import { httpResource } from "@angular/common/http";
import { Medic } from "../model/medic";

@Service({ autoProvided: false })
export class MedicEditStore{

    private readonly medicService = inject(MedicService);
    readonly $id = signal<number | null>(null);

    private readonly $medicRequest = computed( ()=> {
        const id = this.$id();
        return id ? `${this.medicService.resourceUrl}/${id}` : null;
    });

    readonly medicResource = httpResource<Medic>(() => this.$medicRequest());

    setId(id: number){
        this.$id.set(id);
    }

}
