import { Service, signal } from "@angular/core";
import { Specialty } from "../../model/specialty";
import { disabled, form, maxLength, required } from "@angular/forms/signals";

const emptySpecialty = (): Specialty => ({
    idSpecialty: null,
    nameSpecialty: '',
    descriptionSpecialty: ''
});

@Service({ autoProvided: false})
export class SpecialtyForm{

    readonly $model = signal<Specialty>(emptySpecialty());

    readonly $form = form(this.$model, (path) => {

        disabled(path.idSpecialty);
        required(path.nameSpecialty);
        maxLength(path.nameSpecialty, 50);

        required(path.descriptionSpecialty);
        maxLength(path.descriptionSpecialty, 150);
    });

    readonly isInvalid = () => this.$form().invalid();

    patch(specialty: Specialty){
        this.$model.set(specialty);
    }

    value(){
        return this.$model();
    }

    reset(){
        this.$model.set(emptySpecialty());
    }
}
