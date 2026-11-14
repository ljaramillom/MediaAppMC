import { Service } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Medic } from '../model/medic';
import { GenericService } from './generic.service';

@Service()
export class MedicService extends GenericService<Medic>{

    protected override url: string = `${environment.HOST}/v1/medics`;

    // El backend consume multipart/form-data: parte "medic" (JSON) + parte opcional "file" (imagen)
    override save(medic: Medic, file?: File | null){
        return this.http.post(this.url, this.toFormData(medic, file));
    }

    override update(id: number, medic: Medic, file?: File | null){
        return this.http.put(`${this.url}/${id}`, this.toFormData(medic, file));
    }

    private toFormData(medic: Medic, file?: File | null){
        const formData = new FormData();
        // La parte "medic" debe viajar como application/json, si no el backend responde 415
        formData.append('medic', new Blob([JSON.stringify(medic)], { type: 'application/json' }));
        if(file){
            formData.append('file', file);
        }
        // No se fija el Content-Type: el navegador agrega el boundary del multipart
        return formData;
    }

}
