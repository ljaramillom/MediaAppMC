# Specialty CRUD

| |                                                     |
| --- |-----------------------------------------------------|
| **Status** | Implemented — both builds and the backend context-load test pass; endpoints and screen not exercised at runtime |
| **Date** | 2026-10-28 |
| **Scope** | `mediapp-backend` + `mediapp-frontend`              |
| **Reference** | `Exam` vertical (backend), `Exam` screen (frontend) |

> Part 1 is the specification. Part 2 records what was implemented and verified.

---

# Part 1 — Specification

## Goal

A complete CRUD for `Specialty`: REST endpoints in the backend and a management screen in the frontend, following the patterns already established in the project.

## Scope

In scope:

* Backend vertical: entity, DTO, repository, service, controller.
* Frontend screen: list with filter, pagination and sorting, plus a create/edit dialog and delete confirmation.
* Route `/specialty` registered in the app routes.

Out of scope:
* Search, reports, or any bulk operation.

## Data Model

| Entity field | Type | Rules | DTO field |
| --- | --- | --- | --- |
| `idSpecialty` | `Integer` | identity, generated | `idSpecialty` |
| `name` | `String` | required, max 50 | `nameSpecialty` |
| `description` | `String` | required, max 150 | `descriptionSpecialty` |

The DTO field names differ from the entity field names. Confirm the mapping works in **both** directions before assuming it does.

## Contract

```
GET    /v1/specialties        -> 200 OK + SpecialtyDTO[]
GET    /v1/specialties/{id}   -> 200 OK + SpecialtyDTO
POST   /v1/specialties        -> 201 Created + Location header
PUT    /v1/specialties/{id}   -> 200 OK + SpecialtyDTO
DELETE /v1/specialties/{id}   -> 204 No Content
```

Request and response bodies are `application/json`. A missing id returns the project's standard not-found response.

## Expected Files

Backend:

* `model/Specialty.java`
* `dto/SpecialtyDTO.java`
* `repo/ISpecialtyRepo.java`
* `service/ISpecialtyService.java`, `service/impl/SpecialtyServiceImpl.java`
* `controller/SpecialtyController.java`

Frontend:

* `model/specialty.ts`
* `services/specialty.service.ts`
* `stores/specialty.store.ts`, `stores/specialty-dialog.store.ts`
* `forms/specialty.form.ts`
* `pages/specialty/specialty.component.{ts,html,css}`
* `pages/specialty/specialty-dialog/specialty-dialog.component.{ts,html,css}`
* Route entry in `app.routes.ts`

Reuse `ICRUD`, `CRUDImpl` and `IGenericRepo` in the backend, and `GenericService` in the frontend. Do not modify shared abstractions.

## Acceptance Criteria

Legend: `[x]` = verified in this session; `[ ]` = implemented but not exercised at runtime (see Part 2 → Verification).

* [ ] The five endpoints respond as described in the contract. — implemented and compiled; the endpoints were **not called** in this session.
* [ ] A request with an empty name or description is rejected. — `@NotNull` + `@NotBlank` + `@Size(max = 50/150)` on `SpecialtyDTO`, `@Valid` in the controller; **not exercised at runtime**.
* [ ] Creating returns `201` with a `Location` header. — `ResponseEntity.created(location)` built with `ServletUriComponentsBuilder`; **not exercised at runtime**.
* [ ] A missing id returns the standard not-found response. — inherited from `CRUDImpl.findById` → `ModelNotFoundException` → `ResponseExceptionHandler` (`404` + `CustomErrorTemplate`); **not exercised at runtime**.
* [ ] `GET` returns both `nameSpecialty` and `descriptionSpecialty` populated. — explicit bidirectional `specialtyMapper` bean in `MapperConfig`. The context-load test proves both TypeMaps are created at startup, but no entity→DTO conversion was **exercised**.
* [ ] The list screen shows specialties with filter, pagination and sorting. — implemented (`MatTableDataSource` + `MatPaginator` + `MatSort`, column ids match the DTO properties), type-checked by the AOT build; **not exercised in a browser**.
* [ ] The create/edit screen creates and edits, and the list refreshes afterward. — `SpecialtyEditComponent.operate()` calls `SpecialtyStore.reload()` after save/update; type-checked by the AOT build; **not exercised in a browser**.
* [ ] Delete asks for confirmation first. — **implemented** by reusing the existing shared `ConfirmDialogComponent` (the same pattern `ExamComponent.delete` uses): delete only runs when the dialog closes with `true`, then the list reloads. Type-checked by the AOT build; **not exercised in a browser**. (A previous annotation said this was not implemented. That was out of date, see Part 2.)
* [ ] The route renders the screen. — `/pages/specialty` (+ `new` / `edit/:id` children) is registered in `app.routes.ts`, and the layout sidenav already links to `/pages/specialty`; **not exercised in a browser**.
* [x] Backend compiles and frontend builds. — both run in this session, see Part 2 → Verification.

---

# Part 2 — Implementation

## Files

All paths are relative to each project's `src/main/java/com/mitocode/` (backend) or `src/app/` (frontend).

Backend (created by the previous pass and reviewed in this one; no changes were needed):

* `model/Specialty.java`: entity. `Integer idSpecialty` (IDENTITY), `name` (`nullable = false, length = 50`), `description` (`nullable = false, length = 150`). Lombok `@Data` generates `setIdSpecialty(Integer)`, which is the method `CRUDImpl.update` resolves by reflection (`"setId" + "Specialty"`).
* `dto/SpecialtyDTO.java`: `idSpecialty`, `nameSpecialty`, `descriptionSpecialty` with `@NotNull @NotBlank @Size(max = ...)`.
* `repo/ISpecialtyRepo.java`: `extends IGenericRepo<Specialty, Integer>`.
* `service/ISpecialtyService.java`, `service/impl/SpecialtyServiceImpl.java`: `ICRUD` / `CRUDImpl`, constructor injection with `@RequiredArgsConstructor`.
* `controller/SpecialtyController.java`: `/v1/specialties`; GET list/by id → `200`, POST → `201` + `Location`, PUT → `200` + DTO, DELETE → `204`. It also has `/hateoas/{id}`, which mirrors `ExamController`.
* `config/MapperConfig.java` (modified): `specialtyMapper` bean with explicit mappings in both directions: write `nameSpecialty→name`, `descriptionSpecialty→description`; read `name→nameSpecialty`, `description→descriptionSpecialty`.

Frontend (created by the previous pass and reviewed in this one; no changes were needed):

* `model/specialty.ts`: mirrors the DTO.
* `services/specialty.service.ts`: `extends GenericService<Specialty>`, URL `${environment.HOST}/v1/specialties`.
* `store/specialty.store.ts`: list `httpResource` + `reload()`.
* `store/specialty-edit.store.ts`: by-id `httpResource` driven by an `$id` signal.
* `pages/forms/specialty.form.ts`: Signal Form; `required` + `maxLength` 50 / 150, `idSpecialty` disabled.
* `pages/specialty/specialty.component.{ts,html,css}`: table with filter, paginator, sort, edit/delete actions, and a FAB to `new`; delete is confirmed through `ConfirmDialogComponent`.
* `pages/specialty/specialty-edit/specialty-edit.component.{ts,html,css}`: create/edit form; on success it reloads the list store, notifies, and navigates back to `/pages/specialty`.
* `app.routes.ts` (modified): `pages/specialty` with `new` and `edit/:id` children.

Reused, not modified: `ICRUD`, `CRUDImpl`, `IGenericRepo`, `GenericService`, `NotificationService`, `shared/components/confirm-dialog/confirm-dialog.component.ts`.

This session only changed this spec file. The code review found no defects to fix.

## Deviations from Part 1

1. **Edit child route instead of a dialog.** The spec asks for `specialty-dialog/specialty-dialog.component.*` and `specialty-dialog.store.ts`. The implementation follows the `Exam` reference (and the root `CLAUDE.md`): `specialty-edit/specialty-edit.component.*` and `store/specialty-edit.store.ts`, rendered through a `<router-outlet>` on the `new` / `edit/:id` child routes.
2. **Folder names.** The spec says `stores/` and `forms/`; the project uses `store/` and `pages/forms/`. The files follow the existing convention and were not renamed.
3. **Route path.** The spec says `/specialty`; the route is `/pages/specialty`, which matches `pages/exam` and the existing sidenav link.
4. **Validation messages.** `ExamDTO` uses i18n message keys (`{name.size}`) and min lengths; `SpecialtyDTO` uses the default Jakarta messages and only the max lengths the spec requires (plus `@NotBlank` for the "empty" rule).
5. **Delete confirmation.** No deviation. An earlier annotation said this was not implemented, but the code reuses the shared `ConfirmDialogComponent` that `ExamComponent` also uses, so no new abstraction was introduced.

## Verification

Compiled and built in this session:

* Backend: `.\mvnw.cmd clean package -DskipTests` → exit code 0, produced `target/mediapp-backend-0.0.1-SNAPSHOT.jar`.
* Frontend: `npm run build` (production, AOT, which type-checks the templates) → exit code 0, output in `dist/mediapp-frontend`. One existing warning: the initial bundle is 878.44 kB, above the 500 kB budget. It is not specific to this feature.

Run at runtime in this session:

* Backend: `.\mvnw.cmd test` → `Tests run: 1, Failures: 0, Errors: 0`, BUILD SUCCESS. The configured PostgreSQL was reachable, so the Spring context started with `SpecialtyController`, `SpecialtyServiceImpl`, `ISpecialtyRepo` and the `specialtyMapper` TypeMaps, and Hibernate accepted the `Specialty` entity mapping.

Not exercised in this session:

* No HTTP request was sent to `/v1/specialties` (the app was not started, and the shared database was not written to). Status codes, the `Location` header, validation rejections, the 404 response and the DTO field population are therefore verified only by code review against the `Exam` reference.
* No browser session: the list, filter, pagination, sorting, create/edit, list refresh, delete confirmation and route rendering are verified only by the AOT build and code review.
