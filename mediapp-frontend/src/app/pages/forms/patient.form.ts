import { Service, signal } from "@angular/core";
import { Patient } from "../../model/patient";
import { disabled, email, form, maxLength, minLength, required } from "@angular/forms/signals";

const emptyPatient = (): Patient => ({
    idPatient: null,
    firstName: '',
    lastName: '',
    dni: '',
    address: '',
    phone: '',
    email: ''
});

@Service({ autoProvided: false})
export class PatientForm{

    readonly $model = signal<Patient>(emptyPatient());

    // Mismas reglas que PatientDTO en el backend
    readonly $form = form(this.$model, (path) => {

        disabled(path.idPatient);

        required(path.firstName);
        maxLength(path.firstName, 70);

        required(path.lastName);
        maxLength(path.lastName, 70);

        required(path.dni);
        minLength(path.dni, 8);
        maxLength(path.dni, 8);

        // address es opcional
        maxLength(path.address, 150);

        required(path.phone);
        minLength(path.phone, 9);
        maxLength(path.phone, 9);

        required(path.email);
        email(path.email);
        maxLength(path.email, 55);
    });

  readonly isInvalid = () => this.$form().invalid();

  patch(patient: Patient){
    // El backend omite los campos null (JsonInclude NON_NULL), se completan con los valores vacíos
    this.$model.set({ ...emptyPatient(), ...patient, address: patient.address ?? '' });
  }

  value(){
    return this.$model();
  }

  reset(){
    this.$model.set(emptyPatient());
  }
}
