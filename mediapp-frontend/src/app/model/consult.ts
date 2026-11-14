import { ConsultDetail } from "./consult-detail";
import { Medic } from "./medic";
import { Patient } from "./patient";

export class Consult{
    idConsult?: number;
    patient: Patient;
    medic: Medic;
    idUser: number;
    numConsult: string;
    // LocalDateTime del backend: 'YYYY-MM-DDTHH:mm:ss' sin zona horaria
    consultDate: string;
    details: ConsultDetail[];
}
