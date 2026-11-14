# Query Consult

| | |
| --- | --- |
| **Status** | Implemented — builds verified, runtime pending |
| **Date** | 2026-11-02 |
| **Scope** | `mediapp-backend` + `mediapp-frontend` |
| **Affects** | `IConsultRepo`, `IConsultService`, `ConsultServiceImpl`, `ConsultController`, `IConsultExamRepo`, `ConsultExamController`, `MapperConfig` |
| **Reference** | `Consult` vertical (backend), `Medic` screen (frontend) |

> Part 1 is the specification. Part 2 records the implementation.

---

# Part 1 — Specification

## Problem

Consultations can be created and listed, but there is no way to find a past one. The user needs to locate a consultation either by the patient who received it or by the date on which it took place, and then inspect what that consultation contained: diagnoses, treatments and requested exams.

## Goal

A search screen with two mutually exclusive search modes and a read-only detail dialog, backed by the query endpoints that serve them.

## Scope

In scope:

* Backend query methods over `Consult`: search by patient data, search by date range, and exams by consultation.
* The three endpoints that expose them.
* The `Consult -> ConsultDTO` mapping needed for the result table to render medic and patient names.
* Frontend `search` screen: tabbed form, result table, detail dialog.
* Route `/search` registered in the app routes.

Out of scope:

* Pagination, sorting or server-side filtering of the results.
* Editing or deleting a consultation from the search screen.
* Combining both search modes in a single request.

## Decisions

**Two search modes, one screen, one submit button.**
The active tab decides which mode runs. The component reads the selected tab index and dispatches to one branch or the other. There is no combined query and no server-side mode flag.

**Search by patient data is a `POST` with a body; search by dates is a `GET` with query params.**
The first carries a filter object and is modelled as a command; the second is a plain parameterized read and stays shareable as a URL. This asymmetry is intentional and must be preserved — the frontend store depends on it.

**The filter payload is a `record` declared inside `ConsultController`.**
It has no reuse outside this endpoint and does not belong in `dto`.

**The query methods live in `IConsultRepo` as JPQL `@Query`, not as derived method names.**
The patient search spans three columns with an `OR` and two `LIKE`s.
The date search is expressed with `BETWEEN`.

**Case handling for `fullname` is split between client and query.**
The query lowercases the column with `LOWER(...)` but not the parameter. The caller is therefore responsible for sending a lowercase value. 

**Exams for a consultation come from a separate endpoint, not embedded in `ConsultDTO`.**
The result table never needs them; only the dialog does. Loading them on demand keeps the search response small.

**The date range travels as ISO local date-time strings, not as epoch millis or dates.**
The backend parses them with `LocalDateTime.parse`, so the frontend must send the full `yyyy-MM-dd` + `T` + `HH:mm:ss` form. A bare date fails to parse and surfaces as a `400`.

## Data Flow

```
 tab 0 --> POST /v1/consults/search/others  {dni, fullname} --> repo.search(dni, fullname)
 tab 1 --> GET  /v1/consults/search/dates?date1&date2       --> repo.searchByDates(date1, date2)
                            |
                            v
                     ConsultDTO[] --> result table
                            |
                 "View Details" --> dialog
                            |
                            +--> GET /v1/consultexams/{idConsult} --> ExamDTO[]
```

## Contract

```
POST /v1/consults/search/others   -> 200 OK + ConsultDTO[]
GET  /v1/consults/search/dates    -> 200 OK + ConsultDTO[]
GET  /v1/consultexams/{idConsult} -> 200 OK + ExamDTO[]
```

**`POST /v1/consults/search/others`**

Body, `application/json`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `dni` | `String` | no | Matched with strict equality against `patient.dni` |
| `fullname` | `String` | no | Matched with `LIKE %...%` against `patient.firstName` and `patient.lastName`, both lowercased |

The two fields are combined with `OR`, not `AND`. Sending both widens the result set instead of narrowing it. The endpoint does not validate the body; it is not annotated with `@Valid`.

**`GET /v1/consults/search/dates`**

| Param | Type | Required | Format |
| --- | --- | --- | --- |
| `date1` | `String` | yes | `yyyy-MM-dd` + `T` + `HH:mm:ss` |
| `date2` | `String` | yes | `yyyy-MM-dd` + `T` + `HH:mm:ss` |

Both bounds are inclusive (`BETWEEN`). A `date2` at midnight excludes the consultations recorded later that same day; that behavior is accepted as-is.

**`GET /v1/consultexams/{idConsult}`**

Returns the exams linked to the consultation through the `ConsultExam` join entity. An unknown id returns an empty list, not a `404`.

## Queries

`IConsultRepo`:

```java
@Query("FROM Consult c WHERE c.patient.dni = :dni OR LOWER(c.patient.firstName) LIKE %:fullname% OR LOWER(c.patient.lastName) LIKE %:fullname%")
List<Consult> search(@Param("dni") String dni, @Param("fullname") String fullname);

@Query("FROM Consult c WHERE c.consultDate BETWEEN :date1 AND :date2")
List<Consult> searchByDates(@Param("date1") LocalDateTime date1, @Param("date2") LocalDateTime date2);
```

`IConsultExamRepo`:

```java
@Query("SELECT ce.exam FROM ConsultExam ce WHERE ce.consult.idConsult = :idConsult")
List<Exam> getExamsByConsultId(@Param("idConsult") Integer idConsult);
```

The service layer adds nothing: `ConsultServiceImpl` and `ConsultExamServiceImpl` delegate straight to the repository. The controllers map the entities to DTOs.

## Mapping

The results are returned as `ConsultDTO`, which nests `PatientDTO` and `MedicDTO`. `MedicDTO` renames two entity fields (`firstName -> primaryName`, `lastName -> surname`), so the default mapper leaves them null inside a nested `ConsultDTO` and the result table renders blank medic cells.

A dedicated `consultMapper` bean in `MapperConfig` must declare the nested mapping explicitly, and `ConsultController` must inject it with `@Qualifier("consultMapper")`. `ConsultExamController` uses `defaultMapper`, since `Exam` and `ExamDTO` field names already match.

Verify the read direction against real data before assuming it works. Nested renamed fields are the recurring failure in this project: the request succeeds, the list renders, and only the renamed columns come back empty.

## Expected Files

Backend:

* `repo/IConsultRepo.java` — `search`, `searchByDates`
* `repo/IConsultExamRepo.java` — `getExamsByConsultId`
* `service/IConsultService.java`, `service/impl/ConsultServiceImpl.java`
* `service/IConsultExamService.java`, `service/impl/ConsultExamServiceImpl.java`
* `controller/ConsultController.java` — `FilterConsultDTO` record, `searchByOthers`, `searchByDates`
* `controller/ConsultExamController.java` — `getExamsByConsultId`
* `config/MapperConfig.java` — `consultMapper` bean

Frontend:

* `model/filter-consult-dto.ts` — class with a parameter-property constructor `(dni, fullname)`
* `services/consult.service.ts` — `searchByOthers`, `searchDates` (built with `HttpParams`), `consultExamsUrl`
* `stores/search.store.ts`, `stores/search-dialog.store.ts`
* `forms/search.form.ts`
* `pages/search/search.component.{ts,html,css}`
* `pages/search/search-dialog/search-dialog.component.{ts,html,css}`
* Route entry in `app.routes.ts`

Reuse `ICRUD`, `CRUDImpl` and `IGenericRepo` in the backend, and `GenericService` in the frontend. Do not modify shared abstractions.

## Frontend Behavior

**Form.** `SearchForm` is a `@Service({ autoProvided: false })` holding a `signal` model and a `form()` from `@angular/forms/signals`, with fields `dni`, `fullname`, `startDate`, `endDate`. It is listed in the component `providers`, so each visit to the screen starts empty.

**Screen.** A `mat-tab-group` with two tabs — text fields in the first, a `mat-date-range-input` in the second — a single submit button outside the tabs, and a `mat-table` below. The component holds a `viewChild` reference to the tab group and branches on `selectedIndex`. Dates are formatted with `date-fns` before reaching the store.

**Store.** `SearchStore` exposes a single `$consultData` signal that both modes write into, so the table has one source regardless of which search ran.

* The date search goes through `httpResource`, driven by a request signal. While that signal is `undefined` the resource stays idle and issues no request; an `effect` copies the resource value into `$consultData` once a date search has been requested.
* The patient search goes through `ConsultService` directly and sets `$consultData` in the subscription. `httpResource` is read-only and cannot express a `POST`.

**Table.** Columns `patient`, `medic`, `date`, `actions`. The data source is a `MatTableDataSource`. The action button opens the detail dialog with the row as data.

**Dialog.** `SearchDialogComponent` receives the `Consult` through `MAT_DIALOG_DATA`, renders the diagnoses and treatments already present in `details`, and asks `SearchDialogStore` for the exams. That store follows the same idle-until-set pattern: the exams `httpResource` stays idle until the consultation id is set in the constructor.

## Acceptance Criteria

* [ ] Searching by an exact DNI returns that patient's consultations.
* [ ] Searching by a lowercase partial name matches on either first name or last name.
* [ ] Searching by an uppercase name returns nothing, and the frontend never sends one.
* [ ] Searching with both fields filled returns the union of both matches, not the intersection.
* [ ] A date range returns the consultations recorded between both bounds, inclusive.
* [ ] A `date1`/`date2` without a time component is rejected with `400`.
* [ ] Result rows show patient name, medic name and consultation date, with no blank medic cell.
* [ ] Switching tabs and searching again replaces the previous results instead of appending to them.
* [ ] No request leaves the browser before the first submit.
* [ ] The dialog lists the diagnoses and treatments of the selected consultation.
* [ ] The dialog lists the exams linked to that consultation, and shows none for a consultation without exams.
* [ ] The route `/search` renders the screen.
* [ ] Backend compiles and frontend builds.

## Prerequisites

* The `Consult`, `ConsultDetail`, `ConsultExam`, `Patient`, `Medic` and `Exam` verticals already exist.
* The database holds consultations with linked exams. A consultation with no rows in `consult_exam` is a valid case and must be exercised too.

---

# Part 2 — Implementation

Date: 2026-11-02. Nothing was run against a live database, and the UI was not opened in a browser. Everything below is split into **built/compiled**, **exercised offline** (no DB, no HTTP), and **not exercised**.

## What was implemented

Backend (`mediapp-backend/`):

* `repo/IConsultRepo.java`: `search` and `searchByDates`, with the JPQL exactly as written in Part 1.
* `repo/IConsultExamRepo.java`: `getExamsByConsultId` (JPQL `SELECT ce.exam ...`).
* `service/IConsultService.java`, `service/impl/ConsultServiceImpl.java`: `search` and `searchByDates`, which delegate straight to the repo.
* `service/IConsultExamService.java` and `service/impl/ConsultExamServiceImpl.java` (**new**): `getExamsByConsultId`, which delegates to the repo.
* `controller/ConsultController.java`: nested `record FilterConsultDTO(String dni, String fullname)`, `POST /search/others` (no `@Valid`), and `GET /search/dates?date1&date2` parsed with `LocalDateTime.parse`. The `consultMapper` field is now annotated with `@Qualifier("consultMapper")`.
* `controller/ConsultExamController.java` (**new**): `GET /v1/consultexams/{idConsult}` → `ExamDTO[]`, using `defaultMapper`.
* `exception/ResponseExceptionHandler.java`: new `DateTimeParseException` → `400` handler (see Deviations).
* `lombok.config` (**new**, project root): `lombok.copyableAnnotations += org.springframework.beans.factory.annotation.Qualifier`, so that `@Qualifier` on a `private final` field reaches the constructor that `@RequiredArgsConstructor` generates.
* `config/MapperConfig.java`: **unchanged**. A `consultMapper` bean already existed (STRICT strategy, explicit `Medic <-> MedicDTO` maps in both directions including `firstName/primaryName` and `lastName/surname`, plus `idUser <-> user.idUser`), and `ConsultController` was already using it for its existing endpoints.

Frontend (`mediapp-frontend/`). The folders follow the codebase (`store/`, `pages/forms/`):

* `model/filter-consult-dto.ts` (**new**): class with a parameter-property constructor `(dni, fullname)`.
* `services/consult.service.ts`: `searchByOthers(dto)` (POST), `searchDates(date1, date2)` (builds an `HttpResourceRequest` with `HttpParams`), and `consultExamsUrl(id)`.
* `store/search.store.ts` (**new**): one `$consultData` signal. The date search uses `httpResource`, driven by a `$datesRequest` signal that starts `undefined`, so the resource is idle until the first search. An `effect` copies the value into `$consultData` (guarded by `hasValue()`). The patient search goes through `ConsultService` and sets `$consultData` in the subscription.
* `store/search-dialog.store.ts` (**new**): an exams `httpResource` that stays idle until `setIdConsult` is called. The dialog constructor calls it.
* `pages/forms/search.form.ts` (**new**): `@Service({ autoProvided: false })` with a signal model and `form()` holding `dni`, `fullname`, `startDate`, `endDate`.
* `pages/search/search.component.{ts,html,css}` (**new**): `mat-tab-group` (text fields / `mat-date-range-input`), one Search button outside the tabs, and a `viewChild(MatTabGroup)` whose `selectedIndex` picks the mode. Dates are formatted with `date-fns` (`yyyy-MM-dd'T'HH:mm:ss`), and `fullname` is sent trimmed and lowercased. The `mat-table` (`patient`, `medic`, `date`, `actions`) uses a `MatTableDataSource`, and "View Details" opens the dialog. `SearchForm`, `SearchStore` and `provideNativeDateAdapter()` are listed in the component `providers`.
* `pages/search/search-dialog/search-dialog.component.{ts,html,css}` (**new**): receives the `Consult` through `MAT_DIALOG_DATA`, lists `details` (diagnosis/treatment), then lists exams from the store, with "No exams" when the list is empty.
* `app.routes.ts`: route `pages/search`, lazy-loaded with `loadComponent`.
* `package.json` / `package-lock.json`: added `date-fns@^4.4.0` (it was not installed).

## Deviations

1. **Route path is `pages/search`, not `/search`.** Every other route uses the `pages/<x>` prefix, and the existing sidenav entry in `layout.component.html` already links to `/pages/search`, so no nav change was needed. The route is lazy-loaded, following the frontend CLAUDE.md.
2. **Added a `DateTimeParseException` → `400` handler.** Without it, a date without a time component falls into the catch-all `Exception` handler and returns `500`, which contradicts the Contract and the acceptance criterion.
3. **Blank patient fields are sent as `null`, not `""`.** With the JPQL as written, an empty `fullname` becomes `LIKE '%%'` and matches every consultation, so a DNI-only search would return everything. A null `LIKE` parameter matches nothing, which keeps OR semantics. The component also requires at least one patient field, and both dates, before it searches.
4. **`MapperConfig` was not changed.** `consultMapper` already met the Mapping section. The only change on the controller side was adding the explicit `@Qualifier("consultMapper")` plus `lombok.config`. Before this, injection relied on parameter-name matching.
5. **`searchDates` returns an `HttpResourceRequest` (built with `HttpParams`), not an `Observable`.** The date search runs through `httpResource`, so the service supplies the request description for the resource.
6. **`IConsultExamService` does not extend `ICRUD`.** It is a read-only query over a composite-key join entity, and no CRUD is needed.
7. Folder names follow the codebase (`store/`, `pages/forms/`) rather than the spec's `stores/` and `forms/`.

## Verification

**Built / compiled**

* Backend: `./mvnw clean package -DskipTests` → **BUILD SUCCESS**. Tests skipped because the only test is a context-load test that needs PostgreSQL.
* Checked with `javap` that the generated `ConsultController` constructor carries `@Qualifier("consultMapper")` on its `ModelMapper` parameter.
* Frontend: `npx ng build --configuration development` → **complete**, with `search-component` as its own lazy chunk.
* Frontend: `npm run build` (production) compiles TypeScript and templates without errors, but **fails on the `initial` bundle budget** (`maximumError: 1MB`, actual 1.28 MB). This was already the case before this feature: with the search route removed, the production build fails the same way at 1.25 MB. The budget in `angular.json` was left unchanged.

**Exercised offline (no DB, no HTTP)**

* Ran a scratch program against the compiled classes, using `new MapperConfig().consultMapper()`:
  * Read: `Consult -> ConsultDTO` filled `medic.primaryName`, `medic.surname`, `cmpMedic`, `photo`, `idSpecialty`, the full `patient`, `idUser` and `details`.
  * Write: `ConsultDTO -> Consult` filled `medic.firstName/lastName/cmp`, `patient`, `user.idUser`, `details` and `consultDate`.
  * `defaultMapper` mapped `Exam -> ExamDTO` with `nameExam`/`descriptionExam` filled.
  * Mapping logic only; this is not data read from the database.

**Not exercised**: no JPQL ran against PostgreSQL, no endpoint was called over HTTP, and the screen was not opened in a browser.

## Acceptance Criteria status

* [ ] Exact DNI search. — *not exercised (needs DB)*
* [ ] Lowercase partial name matches first or last name. — *not exercised*
* [ ] Uppercase name returns nothing; frontend never sends one. — *frontend lowercases in code; backend behavior not exercised*
* [ ] Both fields filled → union. — *not exercised*
* [ ] Date range inclusive. — *not exercised*
* [ ] Date without time component → `400`. — *handler added and compiles; not exercised over HTTP*
* [ ] Rows show patient, medic and date with no blank medic cell. — *mapping verified offline only; not checked against real data or in the UI*
* [ ] Switching tabs and searching again replaces the results. — *by design (single `$consultData.set`); not exercised in a browser*
* [ ] No request before the first submit. — *by design (idle resource, POST only on submit); not exercised in a browser*
* [ ] Dialog lists diagnoses and treatments. — *not exercised*
* [ ] Dialog lists linked exams, and none for a consultation without exams. — *not exercised*
* [ ] Route renders the screen. — *registered as `/pages/search` (lazy); not opened in a browser*
* [x] Backend compiles and frontend builds. — *backend package OK; frontend compiles (dev build OK). The production build fails only on the initial-bundle budget, which already failed before this feature.*

## Runtime caveats to check first

* `[formField]` on `matStartDate`/`matEndDate` compiles, but it has not been confirmed in a browser that the date-range input binds correctly through the Signal Forms CVA interop.
* That a null `fullname` makes `LIKE %:fullname%` match nothing (deviation 3) depends on how Spring Data binds null LIKE parameters. Verify with a DNI-only search.