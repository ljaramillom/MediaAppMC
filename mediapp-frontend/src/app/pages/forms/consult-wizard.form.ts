import { Service, signal } from "@angular/core";
import { form, maxLength, required } from "@angular/forms/signals";

// Mismos limites que ConsultDetailDTO (@Size) y que las columnas de consult_detail
export const MAX_DIAGNOSIS_LENGTH = 70;
export const MAX_TREATMENT_LENGTH = 150;

// Paso 1: cabecera (paciente y fecha) + borrador del detalle que se agrega con "Add Detail".
// Medico, numero de consulta, detalles y examenes son listas/selecciones que maneja el componente
export interface ConsultWizardModel {
    idPatient: number | null;
    consultDate: Date | null;
    diagnosis: string;
    treatment: string;
}

const emptyConsultWizard = (): ConsultWizardModel => ({
    idPatient: null,
    consultDate: null,
    diagnosis: '',
    treatment: ''
});

@Service({ autoProvided: false})
export class ConsultWizardForm{

    readonly $model = signal<ConsultWizardModel>(emptyConsultWizard());

    readonly $form = form(this.$model, (path) => {

        required(path.idPatient);
        required(path.consultDate);

        // El borrador no es obligatorio (puede quedar vacio tras agregar), pero no puede exceder el limite
        maxLength(path.diagnosis, MAX_DIAGNOSIS_LENGTH);
        maxLength(path.treatment, MAX_TREATMENT_LENGTH);
    });

    // Cabecera completa: paciente y fecha presentes
    readonly isHeaderValid = () => this.$form.idPatient().valid() && this.$form.consultDate().valid();

    // El borrador se puede agregar si ambos campos tienen texto y respetan los limites
    readonly isDetailValid = () => {
        const { diagnosis, treatment } = this.$model();
        return diagnosis.trim() !== '' && treatment.trim() !== ''
            && this.$form.diagnosis().valid() && this.$form.treatment().valid();
    };

    value(){
        return this.$model();
    }

    clearDetail(){
        this.$model.update(m => ({ ...m, diagnosis: '', treatment: '' }));
    }

    reset(){
        this.$model.set(emptyConsultWizard());
        this.$form().reset();
    }
}
