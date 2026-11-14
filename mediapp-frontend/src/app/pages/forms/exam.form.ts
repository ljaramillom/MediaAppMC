import { Service, signal } from "@angular/core";
import { Exam } from "../../model/exam";
import { disabled, form, maxLength, minLength, pattern, required } from "@angular/forms/signals";

const emptyExam = (): Exam => ({
    idExam: null,
    nameExam: '',
    descriptionExam: ''
});

@Service({ autoProvided: false})
export class ExamForm{

    readonly $model = signal<Exam>(emptyExam());

        readonly $form = form(this.$model, (path) => {
        
        disabled(path.idExam);
        required(path.nameExam);
        minLength(path.nameExam, 3);
        maxLength(path.nameExam, 50);        

        required(path.descriptionExam);
        minLength(path.descriptionExam, 15);
        maxLength(path.descriptionExam, 150);
        
        //pattern(path.email, '@....');
  });

  readonly isInvalid = () => this.$form().invalid();

  patch(exam: Exam){
    this.$model.set(exam);
  }

  value(){
    return this.$model();
  }

  reset(){
    this.$model.set(emptyExam());
  }
}