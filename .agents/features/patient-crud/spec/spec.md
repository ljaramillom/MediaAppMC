# Patient CRUD

| |                                                     |
| --- |-----------------------------------------------------|
| **Status** | Implemented — backend compiles, frontend builds; not exercised at runtime |
| **Date** | 2026-10-28 |
| **Scope** | `mediapp-backend` + `mediapp-frontend`              |
| **Reference** | `Exam` vertical (backend), `Exam` screen (frontend) |

> Part 1 is the specification. Part 2 records what was implemented and verified.

---

# Part 1 — Specification

## Goal

A complete CRUD for `Patient`: REST endpoints in the backend and a management screen in the frontend, following the patterns already established in the project.

## Scope

In scope:

* Backend vertical: entity, DTO, repository, service, controller. **These files already exist**; review them against this spec and the `Exam` reference, and change them only where they don't comply.
* Frontend screen: list with filter, pagination and sorting, a create/edit screen on child routes, and delete confirmation.
* Route `/pages/patient` (with `new` and `edit/:id` children) registered in `app.routes.ts`. The layout sidenav already links to `/pages/patient`.

Out of scope:
* Search by DNI or name on the server, reports, or any bulk operation.
* Relationships with other entities (e.g. consults).

## Data Model

| Entity field | Type | Rules | DTO field |
| --- | --- | --- | --- |
| `idPatient` | `Integer` | identity, generated | `idPatient` |
| `firstName` | `String` | required, max 70 | `firstName` |
| `lastName` | `String` | required, max 70 | `lastName` |
| `dni` | `String` | required, exactly 8 | `dni` |
| `address` | `String` | optional, max 150 | `address` |
| `phone` | `String` | required, exactly 9 | `phone` |
| `email` | `String` | required, valid email, max 55 | `email` |

The DTO field names match the entity field names, so the shared `defaultMapper` is enough and no dedicated `ModelMapper` bean is needed. Confirm the mapping works in **both** directions before assuming it does.

## Contract

```
GET    /v1/patients        -> 200 OK + PatientDTO[]
GET    /v1/patients/{id}   -> 200 OK + PatientDTO
POST   /v1/patients        -> 201 Created + Location header
PUT    /v1/patients/{id}   -> 200 OK + PatientDTO
DELETE /v1/patients/{id}   -> 204 No Content
```

Request and response bodies are `application/json`. A missing id returns the project's standard not-found response.

## Expected Files

All paths are relative to each project's `src/main/java/com/mitocode/` (backend) or `src/app/` (frontend).

Backend (already present, review only):

* `model/Patient.java`
* `dto/PatientDTO.java`
* `repo/IPatientRepo.java`
* `service/IPatientService.java`, `service/impl/PatientServiceImpl.java`
* `controller/PatientController.java`

Frontend:

* `model/patient.ts`
* `services/patient.service.ts`
* `store/patient.store.ts`, `store/patient-edit.store.ts`
* `pages/forms/patient.form.ts`
* `pages/patient/patient.component.{ts,html,css}`
* `pages/patient/patient-edit/patient-edit.component.{ts,html,css}`
* Route entry in `app.routes.ts`

Reuse `ICRUD`, `CRUDImpl` and `IGenericRepo` in the backend, and `GenericService`, `NotificationService` and the shared `ConfirmDialogComponent` in the frontend. Do not modify shared abstractions.

## Acceptance Criteria

Legend: `[x]` = verified in this session; `[ ]` = not yet verified (see Part 2 → Verification).

* [ ] The five endpoints respond as described in the contract.
* [ ] A request with an empty `firstName`, `lastName`, `dni`, `phone` or `email` is rejected; a `dni` that is not 8 characters, a `phone` that is not 9 characters, or an invalid `email` is rejected. `address` may be empty.
* [ ] Creating returns `201` with a `Location` header.
* [ ] A missing id returns the standard not-found response.
* [ ] `GET` returns all DTO fields populated.
* [ ] The list screen shows patients with filter, pagination and sorting.
* [ ] The create/edit screen creates and edits, applies the same validation rules as the DTO, and the list refreshes afterward.
* [ ] Delete asks for confirmation first.
* [ ] The route renders the screen.
* [x] Backend compiles and frontend builds.

---

# Part 2 — Implementation

Implemented 2026-10-28 by the `writer-full-stack-code` agent.

## Files

### Backend (reviewed, no changes)

Reviewed against Part 1 and the `Exam` vertical; all already compliant, so none were modified:

* `model/Patient.java` — `Integer idPatient` (IDENTITY) gives Lombok `setIdPatient(Integer)`, which is what `CRUDImpl.update` looks up by reflection. Column lengths match (70/70/8/150/9/55) and `address` is the only nullable column.
* `dto/PatientDTO.java` — `@NotBlank` + `@Size(max = 70)` on `firstName`/`lastName`, `@NotBlank @Size(min = 8, max = 8)` on `dni`, `@Size(max = 150)` on `address`, `@NotBlank @Size(min = 9, max = 9)` on `phone`, `@NotBlank @Email @Size(max = 55)` on `email`.
* `repo/IPatientRepo.java`, `service/IPatientService.java`, `service/impl/PatientServiceImpl.java` — extend `IGenericRepo` / `ICRUD` / `CRUDImpl`.
* `controller/PatientController.java` — `/v1/patients`, `@Valid` on POST/PUT, POST `201` + `Location`, PUT `200` + DTO, DELETE `204`, uses `defaultMapper`.
* `config/MapperConfig.java` — not changed. Entity and DTO have the same seven property names with the same types, so `defaultMapper` (standard matching) maps them one-to-one in both directions (DTO→entity in `convertToEntity`, entity→DTO in `convertToDto`). This was checked by reading the code, not by running a mapping.

### Frontend (created)

* `src/app/model/patient.ts`
* `src/app/services/patient.service.ts` — `extends GenericService<Patient>`, url `${environment.HOST}/v1/patients`
* `src/app/store/patient.store.ts`, `src/app/store/patient-edit.store.ts` — `httpResource`, same shape as the Exam stores
* `src/app/pages/forms/patient.form.ts` — Signal Forms with the DTO's rules: `required` + `maxLength(70)` (names), `required` + `minLength(8)`/`maxLength(8)` (dni), `maxLength(150)` (address), `required` + `minLength(9)`/`maxLength(9)` (phone), `required` + `email` + `maxLength(55)` (email)
* `src/app/pages/patient/patient.component.{ts,html,css}` — table with filter, `MatPaginator`, `MatSort`, edit/delete actions, `ConfirmDialogComponent` before delete, snack-bar via `NotificationService`
* `src/app/pages/patient/patient-edit/patient-edit.component.{ts,html,css}` — create/edit form, reloads `PatientStore` and navigates back to `/pages/patient`

### Frontend (modified)

* `src/app/app.routes.ts` — added `pages/patient` with `new` and `edit/:id` children

## Deviations from Part 1

* Backend: none. No files changed.
* The list table omits the `address` column (ID, first name, last name, DNI, phone, email, actions) to keep the table readable. `address` can be edited on the edit screen.
* `PatientForm.patch` merges the server response over an empty patient and turns a missing `address` into `''`. The DTO has `@JsonInclude(NON_NULL)`, so a patient with no address comes back without that key, and the form field needs a defined value. Exam's `patch` doesn't need this because every Exam field is required.
* The new list component doesn't copy the commented-out teaching code from `ExamComponent`. Its active code is the same.

## Verification

Compiled / built in this session:

* Backend: `.\mvnw.cmd -q clean package -DskipTests` in `mediapp-backend` exited with code 0 (the only output was Lombok `sun.misc.Unsafe` warnings). Tests were skipped because the only test is a `@SpringBootTest` context-load test that needs a reachable PostgreSQL database, which this session doesn't have.
* Frontend: `npm run build` in `mediapp-frontend` printed "Application bundle generation complete" with output in `dist/mediapp-frontend`. It also printed the warning that the initial bundle (890.93 kB) exceeds the 500 kB budget. That is a warning, not an error.

Not exercised at runtime (no running backend/database or browser in this session):

* The five endpoints, validation rejections, `201` + `Location`, not-found responses and fully populated GETs were checked only by reading the code.
* The list screen (filter, pagination, sorting), create/edit flow, list refresh, delete confirmation and route rendering compiled through the Angular build (template type-checking), but nobody clicked through them in a browser.

These acceptance criteria stay unchecked until someone runs them against a live backend and browser.
