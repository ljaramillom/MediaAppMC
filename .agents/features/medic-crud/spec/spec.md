# Medic CRUD

| |                                                     |
| --- |-----------------------------------------------------|
| **Status** | Implemented — both builds and the backend context-load test pass, and `medicMapper` was exercised in both directions outside Spring; endpoints and screen not exercised at runtime |
| **Date** | 2026-10-28 |
| **Scope** | `mediapp-backend` + `mediapp-frontend`              |
| **Reference** | `Exam` vertical (backend), `Exam` screen (frontend), `Specialty CRUD` spec |

> Part 1 is the specification. Part 2 records what was implemented and verified.

---

# Part 1 — Specification

## Goal

A complete CRUD for `Medic`: REST endpoints in the backend and a management screen in the frontend, following the patterns already established in the project. A medic belongs to one `Specialty`, so the screen must let the user pick it.

## Scope

In scope:

* Backend vertical: entity, DTO, repository, service, controller. These files **already exist**; review them against the reference and fix only what this spec requires.
* Frontend screen: list with filter, pagination and sorting, plus a create/edit child route and delete confirmation.
* A specialty selector in the create/edit form, fed by the existing `SpecialtyService`.
* Route `/pages/medic` registered in the app routes (the layout sidenav already links to it).

Out of scope:
* Photo upload. `photo` is a plain URL text field.
* Search, reports, or any bulk operation.

## Data Model

| Entity field | Type | Rules | DTO field |
| --- | --- | --- | --- |
| `idMedic` | `Integer` | identity, generated | `idMedic` |
| `specialty` | `Specialty` (`@ManyToOne`, FK `id_specialty`) | required | `idSpecialty` (`Integer`) |
| `firstName` | `String` | required, max 70 | `primaryName` |
| `lastName` | `String` | required, max 70 | `surname` |
| `cmp` | `String` | required, max 12 | `cmpMedic` |
| `photoUrl` | `String` | optional, max 250 | `photo` |

The DTO field names differ from the entity field names. The existing `medicMapper` bean in `MapperConfig` maps `primaryName`, `surname` and `photo` explicitly, but **not** `cmpMedic ↔ cmp` nor `idSpecialty ↔ specialty.idSpecialty`. Confirm every field maps in **both** directions before assuming it does, and add explicit mappings where it doesn't.

## Contract

```
GET    /v1/medics        -> 200 OK + MedicDTO[]
GET    /v1/medics/{id}   -> 200 OK + MedicDTO
POST   /v1/medics        -> 201 Created + Location header
PUT    /v1/medics/{id}   -> 200 OK + MedicDTO
DELETE /v1/medics/{id}   -> 204 No Content
```

Request and response bodies are `application/json`. A missing id returns the project's standard not-found response.

## Expected Files

Backend (existing; modify only if needed):

* `model/Medic.java`
* `dto/MedicDTO.java` — add `@NotBlank` + `@Size(max = ...)` matching the entity column lengths.
* `repo/IMedicRepo.java`
* `service/IMedicService.java`, `service/impl/MedicServiceImpl.java`
* `controller/MedicController.java`
* `config/MapperConfig.java` — complete `medicMapper`.

Frontend:

* `model/medic.ts`
* `services/medic.service.ts`
* `store/medic.store.ts`, `store/medic-edit.store.ts`
* `pages/forms/medic.form.ts`
* `pages/medic/medic.component.{ts,html,css}`
* `pages/medic/medic-edit/medic-edit.component.{ts,html,css}` — includes a `mat-select` of specialties.
* Route entry in `app.routes.ts` (`pages/medic`, with `new` and `edit/:id` children)

Reuse `ICRUD`, `CRUDImpl` and `IGenericRepo` in the backend, and `GenericService`, `SpecialtyService` and the shared `ConfirmDialogComponent` in the frontend. Do not modify shared abstractions.

## Acceptance Criteria

Legend: `[x]` = verified in this session; `[ ]` = implemented but not exercised at runtime (see Part 2 → Verification).

* [ ] The five endpoints respond as described in the contract. — `MedicController` (already present) was reviewed and compiled; the endpoints were **not called** in this session.
* [ ] A request with an empty first name, last name or CMP, or without a specialty, is rejected. — `@NotNull` + `@NotBlank` + `@Size(max = 70/70/12)` on `primaryName`/`surname`/`cmpMedic`, `@NotNull` on `idSpecialty`, `@Size(max = 250)` on `photo`, `@Valid` in the controller; **not exercised at runtime**.
* [ ] Creating returns `201` with a `Location` header. — `ResponseEntity.created(location)` built with `ServletUriComponentsBuilder`; **not exercised at runtime**.
* [ ] A missing id returns the standard not-found response. — inherited from `CRUDImpl.findById` → `ModelNotFoundException` → `ResponseExceptionHandler` (`404` + `CustomErrorTemplate`); **not exercised at runtime**.
* [ ] `GET` returns `idSpecialty`, `primaryName`, `surname`, `cmpMedic` and `photo` populated. — the read TypeMap (entity→DTO) was exercised by a standalone program against the compiled `MapperConfig.medicMapper()` and filled all five fields (see Part 2 → Verification). No HTTP `GET` was sent, so the criterion is not ticked.
* [ ] `POST`/`PUT` persist the specialty and the CMP sent in the DTO. — the write TypeMap (DTO→entity) was exercised the same way and set `cmp` and `specialty.idSpecialty`; nothing was **persisted** (no request, no database write).
* [ ] The list screen shows medics with filter, pagination and sorting. — implemented (`MatTableDataSource` + `MatPaginator` + `MatSort`, column ids match the DTO properties), type-checked by the AOT build; **not exercised in a browser**.
* [ ] The create/edit screen lists specialties in a selector, creates and edits medics, and the list refreshes afterward. — `mat-select` bound with `[formField]` to `idSpecialty`, options from `SpecialtyStore` (built on `SpecialtyService`); `MedicEditComponent.operate()` calls `MedicStore.reload()` after save/update. Type-checked by the AOT build; **not exercised in a browser**.
* [ ] Delete asks for confirmation first. — reuses the shared `ConfirmDialogComponent`; delete only runs when the dialog closes with `true`, then the list reloads. Type-checked by the AOT build; **not exercised in a browser**.
* [ ] The route renders the screen. — `/pages/medic` (+ `new` / `edit/:id` children) is registered in `app.routes.ts`, and the layout sidenav already links to `/pages/medic`; **not exercised in a browser**.
* [x] Backend compiles and frontend builds. — both run in this session, see Part 2 → Verification.

---

# Part 2 — Implementation

## Files

All paths are relative to each project's `src/main/java/com/mitocode/` (backend) or `src/app/` (frontend).

Backend (existing files reviewed; two needed changes):

* `model/Medic.java`: reviewed, unchanged. `Integer idMedic` (IDENTITY), `@ManyToOne specialty` (`id_specialty`, `nullable = false`, FK `fk_medic_specialty`), `firstName`/`lastName` (`nullable = false, length = 70`), `cmp` (`nullable = false, length = 12`), `photoUrl` (`length = 250`). Lombok `@Data` generates `setIdMedic(Integer)`, which is the method `CRUDImpl.update` resolves by reflection (`"setId" + "Medic"`).
* `dto/MedicDTO.java` (modified): added `@NotBlank` + `@Size(max = 70)` to `primaryName` and `surname`, `@NotBlank` + `@Size(max = 12)` to `cmpMedic`, and `@Size(max = 250)` to the optional `photo`. `@NotNull` kept on `idSpecialty` and on the three required strings.
* `repo/IMedicRepo.java`, `service/IMedicService.java`, `service/impl/MedicServiceImpl.java`: reviewed, unchanged (`IGenericRepo` / `ICRUD` / `CRUDImpl`, `@RequiredArgsConstructor`).
* `controller/MedicController.java`: reviewed, unchanged. `/v1/medics`; GET list/by id → `200`, POST → `201` + `Location`, PUT → `200` + DTO, DELETE → `204`, plus `/hateoas/{id}` like `ExamController`. It injects the `medicMapper` bean by field name.
* `config/MapperConfig.java` (modified): `medicMapper` now also maps write `cmpMedic→cmp` and `idSpecialty→specialty.idSpecialty` (deep destination mapping: `addMappings(m -> m.<Integer>map(MedicDTO::getIdSpecialty, (dest, v) -> dest.getSpecialty().setIdSpecialty(v)))`), and read `cmp→cmpMedic` and `specialty.idSpecialty→idSpecialty`. The existing `primaryName`/`surname`/`photo` mappings were kept. `consultMapper` was not touched.

Frontend (all created, except `app.routes.ts`):

* `model/medic.ts`: mirrors `MedicDTO` (`idMedic`, `idSpecialty`, `primaryName`, `surname`, `cmpMedic`, `photo`).
* `services/medic.service.ts`: `extends GenericService<Medic>`, URL `${environment.HOST}/v1/medics`.
* `store/medic.store.ts`: list `httpResource` + `reload()`.
* `store/medic-edit.store.ts`: by-id `httpResource` driven by an `$id` signal.
* `pages/forms/medic.form.ts`: Signal Form; `idMedic` disabled, `idSpecialty` required, `required` + `maxLength` 70 / 70 / 12 on the names and CMP, `maxLength` 250 on `photo`. `patch()` merges over an empty medic, because the backend omits null fields (`@JsonInclude(NON_NULL)`), e.g. a medic without a photo.
* `pages/medic/medic.component.{ts,html,css}`: table (ID, first name, last name, CMP, actions) with filter, paginator, sort, edit/delete actions and a FAB to `new`; delete is confirmed through `ConfirmDialogComponent`.
* `pages/medic/medic-edit/medic-edit.component.{ts,html,css}`: create/edit form with a `mat-select` of specialties. It provides its own instance of the existing `SpecialtyStore` (built on `SpecialtyService`). On success it reloads the list store, notifies, and navigates back to `/pages/medic`.
* `app.routes.ts` (modified): `pages/medic` with `new` and `edit/:id` children.

Reused, not modified: `ICRUD`, `CRUDImpl`, `IGenericRepo`, `GenericService`, `SpecialtyService`, `SpecialtyStore`, `NotificationService`, `shared/components/confirm-dialog/confirm-dialog.component.ts`.

## Deviations from Part 1

1. **Specialty not shown in the list.** Part 1 does not require it; the list shows only the medic's own fields, and the specialty is picked and shown in the create/edit screen. Showing its name in the list would need a lookup against the specialty list (the DTO carries only `idSpecialty`), and filtering/sorting would then act on the id, not the name.
2. **`@NotNull` kept alongside `@NotBlank`** on the required strings, matching `SpecialtyDTO`. Validation messages use the default Jakarta messages (no i18n keys), as in `SpecialtyDTO`.
3. **Empty photo.** The form sends `photo: ''` when the field is left empty, so the column stores an empty string rather than `null`. The backend accepts it (`photo` only has `@Size(max = 250)`).

## Verification

Compiled and built in this session:

* Backend: `.\mvnw.cmd clean package -DskipTests` → exit code 0. Only JDK warnings about `sun.misc.Unsafe` from Lombok.
* Frontend: `npm run build` (production, AOT, which type-checks the templates) → exit code 0, output in `dist/mediapp-frontend`. One existing warning: the initial bundle is 901.62 kB, above the 500 kB budget (it was 878.44 kB before this feature). It is not specific to this feature.

Run at runtime in this session:

* Backend: `.\mvnw.cmd test` → `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0`, BUILD SUCCESS, exit code 0. The configured PostgreSQL was reachable, so the Spring context started with the updated `medicMapper` TypeMaps (no error when they were created) and Hibernate accepted the `Medic` entity mapping.
* `medicMapper` in both directions: a throwaway program (in the session scratchpad, not in the project) called `new MapperConfig().medicMapper()` against `target/classes` and the ModelMapper 3.2.7 jar.
  * Write: `MedicDTO(null, 3, "Juan", "Perez", "CMP123", "http://x/p.png")` → `Medic(idMedic=null, specialty=Specialty(idSpecialty=3, name=null, description=null), firstName=Juan, lastName=Perez, cmp=CMP123, photoUrl=http://x/p.png)`.
  * Read: `Medic(7, Specialty(5, "Cardio", "d"), "Ana", "Lopez", "CMP9", "http://y")` → `MedicDTO(idMedic=7, idSpecialty=5, primaryName=Ana, surname=Lopez, cmpMedic=CMP9, photo=http://y)`.
  * `ModelMapper.validate()` reports `Specialty.setName()`/`setDescription()` as unmapped on the write side. That is expected (the DTO carries only the specialty id), and the application never calls `validate()`.

Not exercised in this session:

* No HTTP request was sent to `/v1/medics` (the app was not started, and the shared database was not written to). Status codes, the `Location` header, validation rejections, the 404 response and persisting the specialty/CMP are verified only by code review against the `Exam`/`Specialty` references and the mapper check above.
* No browser session: the list, filter, pagination, sorting, the specialty selector (`mat-select` with `[formField]`, which relies on the Signal Forms `ControlValueAccessor` interop), create/edit, list refresh, delete confirmation and route rendering are verified only by the AOT build and code review.
