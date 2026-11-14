// Cuerpo del POST /v1/consults/search/others (record FilterConsultDTO del backend).
// Ambos campos son opcionales y el backend los combina con OR; fullname debe viajar en minusculas
export class FilterConsultDTO{
    constructor(
        public dni: string | null,
        public fullname: string | null
    ){}
}
