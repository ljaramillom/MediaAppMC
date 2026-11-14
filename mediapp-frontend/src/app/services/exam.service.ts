import { inject, Service } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Exam } from '../model/exam';
import { GenericService } from './generic.service';

@Service()
//@Injectable({ providedIn: 'root' })
export class ExamService extends GenericService<Exam>{

    protected override url: string = `${environment.HOST}/v1/exams`;
    
    //private readonly http = inject(HttpClient);

    /*findAll(){
       return this.http.get<Exam[]>(this.url);
    }

    findById(id: number){
        return this.http.get<Exam>(`${this.url}/${id}`);
    }

    save(exam: Exam){
        return this.http.post(this.url, exam);
    }

    update(id: number, exam: Exam){
        return this.http.put(`${this.url}/${id}`, exam);
    }

    delete(id: number){
        return this.http.delete(`${this.url}/${id}`);
    }*/

}
