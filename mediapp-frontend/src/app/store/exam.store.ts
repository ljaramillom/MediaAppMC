import { httpResource } from "@angular/common/http";
import { Exam } from "../model/exam";
import { inject, Service } from "@angular/core";
import { ExamService } from "../services/exam.service";

@Service({ autoProvided: false})
export class ExamStore{

    private readonly examService = inject(ExamService);

    readonly examsResource = httpResource<Exam[]>( () => this.examService.resourceUrl, { defaultValue: [] });

    readonly $exams = this.examsResource.value;
    readonly $loading = this.examsResource.isLoading;
    readonly $error = this.examsResource.error;

    reload(){
        this.examsResource.reload();
    }
}