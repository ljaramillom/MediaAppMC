import { httpResource } from "@angular/common/http";
import { effect, inject, Service, signal } from "@angular/core";
import { Consult } from "../model/consult";
import { FilterConsultDTO } from "../model/filter-consult-dto";
import { ConsultService } from "../services/consult.service";

// Parametros de la busqueda por fechas (ya formateados como yyyy-MM-ddTHH:mm:ss)
interface DatesRequest {
    date1: string;
    date2: string;
}

@Service({ autoProvided: false})
export class SearchStore{

    private readonly consultService = inject(ConsultService);

    // Unica fuente de la tabla: ambos modos de busqueda escriben aqui y reemplazan el resultado anterior
    readonly $consultData = signal<Consult[]>([]);

    // Mientras sea undefined el recurso queda inactivo y no sale ninguna peticion
    private readonly $datesRequest = signal<DatesRequest | undefined>(undefined);

    readonly datesResource = httpResource<Consult[]>(() => {
        const request = this.$datesRequest();
        return request ? this.consultService.searchDates(request.date1, request.date2) : undefined;
    });

    readonly $loading = this.datesResource.isLoading;
    readonly $error = this.datesResource.error;

    constructor(){
        // Copia el resultado de la busqueda por fechas en $consultData cuando llega
        effect(() => {
            if(this.$datesRequest() && this.datesResource.hasValue()){
                this.$consultData.set(this.datesResource.value());
            }
        });
    }

    // Un objeto nuevo en cada busqueda: repetir las mismas fechas vuelve a consultar
    searchByDates(date1: string, date2: string){
        this.$datesRequest.set({ date1, date2 });
    }

    // POST directo con el servicio; el resultado se asigna en la suscripcion
    searchByOthers(dto: FilterConsultDTO){
        this.consultService.searchByOthers(dto).subscribe(data => this.$consultData.set(data));
    }
}
