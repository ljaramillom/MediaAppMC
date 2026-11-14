import { computed, inject, Service, signal } from "@angular/core";
import { ExamService } from "../services/exam.service";
import { httpResource } from "@angular/common/http";
import { Exam } from "../model/exam";

@Service({ autoProvided: false })
export class ExamEditStore{

    private readonly examService = inject(ExamService);
    readonly $id = signal<number | null>(null);

    private readonly $examRequest = computed( ()=> {
        const id = this.$id();
        return id ? `${this.examService.resourceUrl}/${id}` : null;
    });

    readonly examResource = httpResource<Exam>(() => this.$examRequest());

    setId(id: number){
        this.$id.set(id);
    }

}