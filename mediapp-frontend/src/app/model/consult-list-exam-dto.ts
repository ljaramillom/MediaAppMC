import { Consult } from "./consult";
import { Exam } from "./exam";

// Cuerpo del POST transaccional /v1/consults
export class ConsultListExamDTO{
    consult: Consult;
    lstExam: Exam[];
}
