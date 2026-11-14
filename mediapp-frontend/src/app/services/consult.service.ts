import { HttpParams, HttpResourceRequest } from '@angular/common/http';
import { Service } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Consult } from '../model/consult';
import { ConsultListExamDTO } from '../model/consult-list-exam-dto';
import { FilterConsultDTO } from '../model/filter-consult-dto';
import { GenericService } from './generic.service';

@Service()
export class ConsultService extends GenericService<Consult>{

    protected override url: string = `${environment.HOST}/v1/consults`;
    readonly procedureUrl = `${this.url}/callProcedureNative`;

    // Una sola peticion (y una sola transaccion en el backend): consulta + detalles + examenes
    saveTransactional(dto: ConsultListExamDTO){
        return this.http.post(this.url, dto);
    }

    // Busqueda por datos del paciente: POST con cuerpo (httpResource no puede expresar un POST)
    searchByOthers(dto: FilterConsultDTO){
        return this.http.post<Consult[]>(`${this.url}/search/others`, dto);
    }

    // Busqueda por fechas: GET con query params (yyyy-MM-ddTHH:mm:ss).
    // Devuelve la descripcion de la peticion para que la consuma httpResource en SearchStore
    searchDates(date1: string, date2: string): HttpResourceRequest{
        const params = new HttpParams()
            .set('date1', date1)
            .set('date2', date2);

        return { url: `${this.url}/search/dates`, params };
    }

    // Examenes de una consulta: viven en otro recurso del backend (/v1/consultexams)
    consultExamsUrl(idConsult: number){
        return `${environment.HOST}/v1/consultexams/${idConsult}`;
    }

    //pdfs
    generateReport(){
        return this.http.get(`${this.url}/generateReport`, { responseType: 'blob' });
    }

}
