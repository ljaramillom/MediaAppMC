import { Service, signal } from "@angular/core";
import { form, maxLength, required, validate } from "@angular/forms/signals";

// Mismos limites que ConsultDetailDTO (@Size) y que las columnas de consult_detail
export const MAX_DIAGNOSIS_LENGTH = 70;
export const MAX_TREATMENT_LENGTH = 150;

// Todo el wizard de diseño vive en un solo modelo: paso 1 (datos), paso 2 (consultorio).
// Se captura UN solo detalle (diagnostico + tratamiento) por consulta
export interface ConsultWizardDesignModel {
    idMedic: number | null;
    idPatient: number | null;
    consultDate: Date | null;
    diagnosis: string;
    treatment: string;
    // Ids de los examenes marcados; puede quedar vacio
    idExams: number[];
    // Codigo del consultorio ("101".."302"), se envia como numConsult
    numConsult: string;
}

const emptyConsultWizardDesign = (): ConsultWizardDesignModel => ({
    idMedic: null,
    idPatient: null,
    consultDate: null,
    diagnosis: '',
    treatment: '',
    idExams: [],
    numConsult: ''
});

@Service({ autoProvided: false})
export class ConsultWizardDesignForm{

    readonly $model = signal<ConsultWizardDesignModel>(emptyConsultWizardDesign());

    readonly $form = form(this.$model, (path) => {

        required(path.idMedic);
        required(path.idPatient);
        required(path.consultDate);

        // Diagnostico y tratamiento son obligatorios (ConsultDetailDTO los marca @NotBlank)
        required(path.diagnosis);
        required(path.treatment);
        maxLength(path.diagnosis, MAX_DIAGNOSIS_LENGTH);
        maxLength(path.treatment, MAX_TREATMENT_LENGTH);

        // required() acepta solo espacios; el backend no, asi que se valida el texto recortado
        validate(path.diagnosis, ({ value }) =>
            value() !== '' && value().trim() === '' ? { kind: 'required' } : undefined);
        validate(path.treatment, ({ value }) =>
            value() !== '' && value().trim() === '' ? { kind: 'required' } : undefined);

        required(path.numConsult);
    });

    // Paso 1 completo: medico, paciente, fecha, diagnostico y tratamiento validos
    readonly isStep1Valid = () => this.$form.idMedic().valid() && this.$form.idPatient().valid()
        && this.$form.consultDate().valid() && this.$form.diagnosis().valid() && this.$form.treatment().valid();

    // Paso 2 completo: hay un consultorio elegido
    readonly isStep2Valid = () => this.$form.numConsult().valid();

    value(){
        return this.$model();
    }

    isExamSelected(idExam: number){
        return this.$model().idExams.includes(idExam);
    }

    toggleExam(idExam: number, checked: boolean){
        this.$model.update(m => ({
            ...m,
            idExams: checked
                ? (m.idExams.includes(idExam) ? m.idExams : [...m.idExams, idExam])
                : m.idExams.filter(id => id !== idExam)
        }));
    }

    selectConsultorio(code: string){
        this.$model.update(m => ({ ...m, numConsult: code }));
    }

    reset(){
        this.$model.set(emptyConsultWizardDesign());
        this.$form().reset();
    }
}
