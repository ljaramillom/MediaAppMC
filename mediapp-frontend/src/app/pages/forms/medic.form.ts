import { Service, signal } from "@angular/core";
import { Medic } from "../../model/medic";
import { disabled, form, maxLength, required } from "@angular/forms/signals";

const emptyMedic = (): Medic => ({
    idMedic: null,
    idSpecialty: null,
    primaryName: '',
    surname: '',
    cmpMedic: '',
    photo: ''
});

@Service({ autoProvided: false})
export class MedicForm{

    readonly $model = signal<Medic>(emptyMedic());

    readonly $form = form(this.$model, (path) => {

        disabled(path.idMedic);
        required(path.idSpecialty);

        required(path.primaryName);
        maxLength(path.primaryName, 70);

        required(path.surname);
        maxLength(path.surname, 70);

        required(path.cmpMedic);
        maxLength(path.cmpMedic, 12);

        // La foto es opcional: la URL actual la devuelve el backend, el archivo se envia aparte
        maxLength(path.photo, 250);
    });

    readonly isInvalid = () => this.$form().invalid();

    patch(medic: Medic){
        // El backend omite los campos nulos (NON_NULL), se completan para que el formulario no quede con undefined
        this.$model.set({ ...emptyMedic(), ...medic });
    }

    value(){
        return this.$model();
    }

    reset(){
        this.$model.set(emptyMedic());
    }
}
