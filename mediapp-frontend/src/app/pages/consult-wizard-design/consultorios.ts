// Consultorios del diseño "Wizard · Alta de Atención Médica" (Claude Design).
// No hay entidad ni endpoint: el codigo se guarda tal cual en Consult.numConsult (varchar(3))
export interface Consultorio {
    code: string;
    name: string;
    floor: string;
    area: string;
    equipment: string;
}

export const CONSULTORIOS: readonly Consultorio[] = [
    { code: '101', name: 'Consultorio 101', floor: 'Piso 1', area: 'Medicina General', equipment: '1 camilla de examen' },
    { code: '102', name: 'Consultorio 102', floor: 'Piso 1', area: 'Pediatría', equipment: 'Báscula pediátrica' },
    { code: '201', name: 'Consultorio 201', floor: 'Piso 2', area: 'Cardiología', equipment: 'Electrocardiógrafo' },
    { code: '202', name: 'Consultorio 202', floor: 'Piso 2', area: 'Dermatología', equipment: 'Lámpara de examen' },
    { code: '301', name: 'Consultorio 301', floor: 'Piso 3', area: 'Procedimientos', equipment: 'Camilla + instrumental' },
    { code: '302', name: 'Consultorio 302', floor: 'Piso 3', area: 'Ecografía', equipment: 'Equipo de ultrasonido' }
];
