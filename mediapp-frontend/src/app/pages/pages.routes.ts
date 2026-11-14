import { Routes } from "@angular/router";
import { ExamComponent } from "./exam/exam.component";
import { ExamEditComponent } from "./exam/exam-edit/exam-edit.component";
import { SpecialtyComponent } from "./specialty/specialty.component";
import { SpecialtyEditComponent } from "./specialty/specialty-edit/specialty-edit.component";
import { PatientComponent } from "./patient/patient.component";
import { PatientEditComponent } from "./patient/patient-edit/patient-edit.component";
import { MedicComponent } from "./medic/medic.component";
import { ConsultWizardComponent } from "./consult-wizard/consult-wizard.component";
import { ConsultWizardDesignComponent } from "./consult-wizard-design/consult-wizard-design.component";
import { SearchComponent } from "./search/search.component";
import { ReportComponent } from "./report/report.component";

export const pagesRoutes: Routes = [
    { path: 'exam', component: ExamComponent, children: [
        { path: 'new', component: ExamEditComponent},
        { path: 'edit/:id', component: ExamEditComponent},
    ]},

    { path: 'specialty', component: SpecialtyComponent, children: [
        { path: 'new', component: SpecialtyEditComponent},
        { path: 'edit/:id', component: SpecialtyEditComponent},
    ]},

    { path: 'patient', component: PatientComponent, children: [
        { path: 'new', component: PatientEditComponent},
        { path: 'edit/:id', component: PatientEditComponent},
    ]},

    // El formulario de medico se abre en un MatDialog, sin rutas hijas
    { path: 'medic', component: MedicComponent },

    // Wizard de registro de consulta (solo creacion);
    { path: 'consult-wizard', component: ConsultWizardComponent },

    // Mismo registro de consulta con el diseño de Claude Design
    { path: 'consult-wizard-design', component: ConsultWizardDesignComponent },

    // Busqueda de consultas por datos del paciente o por rango de fechas; el detalle se abre en un MatDialog    
    { path: 'search', component: SearchComponent },

    { path: 'report', component: ReportComponent }
];