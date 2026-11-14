import { Service } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Patient } from '../model/patient';
import { GenericService } from './generic.service';

@Service()
export class PatientService extends GenericService<Patient>{

    protected override url: string = `${environment.HOST}/v1/patients`;

}
