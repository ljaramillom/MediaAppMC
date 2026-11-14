import { Service, signal } from "@angular/core";
import { form, maxLength } from "@angular/forms/signals";

// Pestaña 0: dni / fullname (opcionales, el backend los combina con OR).
// Pestaña 1: rango de fechas (ambas obligatorias para buscar)
export interface SearchModel {
    dni: string;
    fullname: string;
    startDate: Date | null;
    endDate: Date | null;
}

const emptySearch = (): SearchModel => ({
    dni: '',
    fullname: '',
    startDate: null,
    endDate: null
});

@Service({ autoProvided: false})
export class SearchForm{

    readonly $model = signal<SearchModel>(emptySearch());

    readonly $form = form(this.$model, (path) => {
        // Mismos limites que las columnas de patient
        maxLength(path.dni, 8);
        maxLength(path.fullname, 70);
    });

    // Al menos un dato del paciente
    readonly isOthersValid = () => {
        const { dni, fullname } = this.$model();
        return (dni.trim() !== '' || fullname.trim() !== '')
            && this.$form.dni().valid() && this.$form.fullname().valid();
    };

    // Ambos limites del rango
    readonly isDatesValid = () => {
        const { startDate, endDate } = this.$model();
        return startDate !== null && endDate !== null;
    };

    value(){
        return this.$model();
    }

    reset(){
        this.$model.set(emptySearch());
        this.$form().reset();
    }
}
