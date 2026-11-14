# Consult Wizard

| | |
| --- | --- |
| **Status** | Implemented |
| **Date** | 2026-11-02 |
| **Scope** | `mediapp-backend` + `mediapp-frontend` |
| **Affects** | `ConsultController`, `ConsultServiceImpl`, `ConsultDTO`, `ConsultDetailDTO`, `ConsultListExamDTO`, `IConsultExamRepo`, `ConsultWizardComponent`, `ConsultWizardForm`, `ConsultWizardStore`, `ConsultService` |

> Part 1 is the specification; Part 2 records what was implemented and verified.

---

# Part 1 — Specification

## Problem

Registering a consult is not a one-form operation. It needs a patient, a medic, a date, a consult
number, N diagnosis/treatment lines and N exams — three different cardinalities and two different
selection styles (dropdown, card picker, number grid). A single `MatDialog` like the one `Specialty`,
`Patient` or `Medic` use cannot carry that without becoming a wall of controls.

The sidenav already offers the entry point: `pages/layout/layout.component.html` has a
**Register Consult W.** button pointing at `/pages/consult-wizard`.

## Goal

A three-step wizard screen that collects the whole consult in one flow and persists header, details
and exams in **one request and one transaction**. Nothing is written until the user confirms on the
last step.

## UI Rules
Use Figma MCP the project #159xxjka to implement the UI
The UI looks like /resources/image1.png

## Scope

In scope:

* Create a new angular route and new component for consult-wizard, with forms and store.
* Not edit consult-wizard.component, its mandatory
* New Screen `pages/consult-wizard` reached from the existing sidenav entry.
* Step 1 — patient, date, diagnosis/treatment lines, exams, medic.
* Step 2 — consult number picked from a grid.
* Step 3 — review and save.
* One transactional `POST /v1/consults` that writes `consult`, `consult_detail` and `consult_exam`.
* Client-side gating so an incomplete consult can never reach the backend.

Out of scope:

* Editing or deleting a consult from the wizard. It is **create-only**.
* Listing consults, searching them, or any report over them.
* Authentication. `idUser` is fixed (see Decisions).
* Fixing the nested-`MedicDTO` read mapping on `GET /v1/consults` (see Known starting state).
* Creating patients, medics or exams from inside the wizard.

## Data Model

Existing tables, none of them is created by this feature:

| Entity | Key columns | Notes |
| --- | --- | --- |
| `Consult` | `idConsult`, `patient`, `medic`, `user`, `numConsult`, `consultDate`, `details` | `numConsult` is **`length = 3`**; `user` is `nullable = false` |
| `ConsultDetail` | `idDetail`, `consult`, `diagnosis` (70), `treatment` (150) | `@ManyToOne` back to `Consult`, cascaded from it |
| `ConsultExam` | `consult` + `exam` | `@IdClass(ConsultExamPK)`, composite PK, no surrogate id |

The DTO side is asymmetric with the entity side on two points, and both matter:

* `ConsultDTO.idUser` is an `Integer`, `Consult.user` is a `User` entity. The mapping relies on
  ModelMapper's implicit `idUser` <-> `user.idUser` matching — the same mechanism that already
  resolves `MedicDTO.idSpecialty` <-> `Medic.specialty.idSpecialty`. **Verify it in both directions
  before assuming it works**; if it does not, add a `consultMapper` bean to `MapperConfig` rather
  than changing the DTO.
* `ConsultDetailDTO.consult` carries `@JsonBackReference`, so a detail must **not** include its
  parent consult in the request body. The parent link is set server-side.

## UI Flow

**Step 1 — Principal.** Patient `mat-select`, date `mat-datepicker` (`[min]` = today), a
diagnosis + treatment pair with an *Add Detail* button that pushes into a list of
`mat-expansion-panel`s, an exam `mat-autocomplete` with an *Add Exam* button and a removable
`mat-list`, and a grid of medic `mat-card`s where clicking one selects it (visual state through
`ngClass`).

**Step 2 — N° Consult.** A `mat-grid-list` of numbers. The selected tile is highlighted. *Next* is a
manual handler, not `matStepperNext`: with no number chosen it shows a `MatSnackBar` message and
stays.

**Step 3 — Review.** Read-only summary of patient, medic, consult number and date, plus *Save*.

After a successful save the screen resets itself: form, stepper, details, exams, medic and consult
number all go back to empty.

## Decisions

**One request, one transaction, one endpoint.**
`POST /v1/consults` receives `ConsultListExamDTO` and `ConsultServiceImpl.saveTransactional` writes
header, details and exam links under a single `@Transactional`. No "create consult then attach
exams" two-step, which would leave orphan headers when the second call fails.

**The wizard sends whole `Patient`, `Medic` and `Exam` objects, not ids.**
They come straight from `GET /v1/patients`, `/v1/medics` and `/v1/exams`, so they already satisfy the
`@NotNull` fields of the nested DTOs. Only the id drives the foreign key on write; the rest of the
payload is ignored by Hibernate because none of those associations cascades.

**The consult number is picked from a grid and rendered as `C{n}`.**
`Consult.numConsult` is `@Column(length = 3)`, so the grid must stop at **99** — `C100` is four
characters and fails at insert time. Do not widen the column: the schema lives in a shared Supabase
database and `ddl-auto: update` will not reliably alter an existing `varchar(3)`.

**`idUser` is hardcoded to `1`.**
There is no authentication in the project yet. The value must sit behind a single named constant or
TODO in the component, not scattered.

**Nested validation is explicit.**
`@Valid` on the controller argument does **not** cascade into `ConsultListExamDTO.consult` or
`lstExam` on its own. Annotate those fields with `@Valid` so a malformed consult is a `400`, not a
`500` from the database.

**Length constraints live in the DTO, not only in the entity.**
`diagnosis` (70) and `treatment` (150) must carry `@Size` in `ConsultDetailDTO`, and the frontend
must enforce the same limits. Without it, an over-long diagnosis is a constraint violation surfaced
as a `500`.

**The wizard blocks invalid states client-side.**
Save is unreachable unless patient, date, medic, consult number and at least one detail are present.
`consultDate` is dereferenced when building the payload, so a null date must be impossible to reach,
not merely rejected by the server.

**The same exam cannot be added twice.**
`consult_exam` has a composite primary key; a duplicate row is a PK violation and a `500`. The
wizard filters an exam already in the selected list instead of relying on the database to complain.

**The date is sent without a timezone offset.**
`Consult.consultDate` is a `LocalDateTime`. Confirm how the chosen serialization is parsed before
settling on it — a trailing `Z` from `Date.toISOString()` is the risky case; a plain
`YYYY-MM-DDTHH:mm:ss` string is the safe one.

## Contract

```
POST /v1/consults   -> 201 Created + Location header
```

Request body is `application/json` and is a `ConsultListExamDTO`:

```jsonc
{
  "consult": {
    "patient":  { "idPatient": 1, "firstName": "...", "lastName": "...", "dni": "12345678", "phone": "...", "email": "..." },
    "medic":    { "idMedic": 1, "idSpecialty": 1, "primaryName": "...", "surname": "...", "cmpMedic": "..." },
    "idUser":   1,
    "numConsult": "C12",
    "consultDate": "2026-08-20T10:00:00",
    "details": [
      { "diagnosis": "Gripe", "treatment": "Paracetamol" }
    ]
  },
  "lstExam": [
    { "idExam": 3, "nameExam": "...", "descriptionExam": "..." }
  ]
}
```

| Situation | Response |
| --- | --- |
| Valid payload | `201` + `Location: .../v1/consults/{id}` |
| `consult`, `patient`, `medic`, `idUser`, `numConsult`, `consultDate` or `details` missing | `400` |
| `diagnosis` or `treatment` over its length | `400` |
| `lstExam` missing | `400`; an **empty array is valid** |
| Unknown `idPatient` / `idMedic` / `idUser` / `idExam` | `400`-class error, never a silent partial write |

The other four endpoints of `ConsultController` (`GET` all, `GET` by id, `PUT`, `DELETE`) already
exist and are **not** part of this feature. The wizard calls only `POST`.

## Expected Files

Backend:

* `model/Consult.java`, `model/ConsultDetail.java`, `model/ConsultExam.java`, `model/ConsultExamPK.java`
* `dto/ConsultDTO.java`, `dto/ConsultDetailDTO.java`, `dto/ConsultListExamDTO.java`
* `repo/IConsultRepo.java`, `repo/IConsultExamRepo.java`
* `service/IConsultService.java`, `service/impl/ConsultServiceImpl.java`
* `controller/ConsultController.java`

Frontend:

* `model/consult.ts`, `model/consult-detail.ts`, `model/consult-list-exam-dto.ts`
* `services/consult.service.ts`
* `store/consult-wizard.store.ts`
* `forms/consult-wizard.form.ts`
* `pages/consult-wizard/consult-wizard.component.{ts,html,css}`
* Route entry in `app.routes.ts`

Reuse `ICRUD`, `CRUDImpl` and `IGenericRepo` in the backend, and `GenericService` in the frontend.
`ConsultService` extends `GenericService<Consult>` and only **adds** `saveTransactional`; it does not
override the inherited methods. Do not modify shared abstractions.


## Acceptance Criteria

Legend: **[HTTP]** exercised over HTTP against the real backend running on a local **H2** database
(not the Supabase PostgreSQL); **[build]** only compiled / AOT type-checked. Nothing was clicked in a
browser.

* [x] The sidenav entry opens the wizard at `/pages/consult-wizard`. — **[build]** the sidenav button
      already pointed there; the route is registered with `loadComponent` and the AOT build emits the
      lazy `consult-wizard-component` chunk. Not clicked in a browser.
* [ ] Step 1 loads patients, exams and medics from the running backend. — **[build]** the store
      declares three `httpResource` calls over the `resourceUrl` of `PatientService` / `MedicService` /
      `ExamService`; the three endpoints answered over **[HTTP]**, but the Angular app never ran.
* [ ] Details can be added and removed, and the list reflects both. — **[build]** only.
* [ ] Exams can be added and removed; adding an exam already in the list does nothing. — **[build]**
      only (`$filteredExams()` hides selected exams and `addExam()` returns early on a duplicate).
      Server side, a duplicated exam is now a `400` with a full rollback **[HTTP]**.
* [ ] Selecting a medic card highlights it and deselects the previous one. — **[build]** only
      (single-value signal + `[ngClass]="{ 'medic-card-selected': ... }"`, as the spec asks).
* [ ] Step 2 refuses to advance without a consult number and says so. — **[build]** only
      (`nextManualStep()` opens a `MatSnackBar` and returns).
* [x] The highest selectable consult number produces a `numConsult` of at most 3 characters. —
      static fact of the code (`MAX_CONSULT_NUMBER = 99`, label `` `C${n}` ``); **[HTTP]** `C99` was
      saved (`201`) and `C100` was rejected with `400` (`consult.numConsult: size must be between 0 and 3`).
* [ ] *Save* is unreachable while patient, date, medic, consult number or details are missing. —
      **[build]** only (`[disabled]="!$canSave()"` + the same guard inside `save()`).
* [x] A valid save returns `201` with a `Location` header. — **[HTTP]** `201`,
      `Location: http://localhost:8099/v1/consults/1`.
* [x] The saved consult writes one `consult` row, one `consult_detail` row per detail, and one
      `consult_exam` row per exam. — **[HTTP]** + direct SQL on H2: a consult with 2 details and 2 exams
      left 1 / 2 / 2 rows.
* [x] A consult saved with an empty exam list succeeds and writes no `consult_exam` row. — **[HTTP]**
      `lstExam: []` gave `201`; `consult_exam` kept only the 2 rows of the first consult.
* [x] A failure anywhere in the save leaves **no** partial rows in any of the three tables. — **[HTTP]**
      + SQL: an unknown `idExam` (listed after a valid one) and a duplicated exam both failed *after* the
      `consult`, `consult_detail` and first `consult_exam` inserts; afterwards the tables held only the
      rows of the two successful consults (2 / 4 / 2).
* [x] A payload with a missing required field is rejected with `400`, not `500`. — **[HTTP]** missing
      `consult`, `idUser`, `lstExam`, and `patient` / `medic` / `numConsult` / `consultDate` / empty
      `details` each gave `400` with the field path in the message.
* [x] An over-long `diagnosis` or `treatment` is rejected with `400`, not `500`. — **[HTTP]** 71 / 151
      characters gave `400`; exactly 70 / 150 were saved with `201`.
* [x] `consultDate` round-trips to the database with the date the user picked. — **[HTTP]**
      `2026-08-20T10:00:00` was stored as `2026-08-20 10:00:00` and read back unchanged by
      `GET /v1/consults`. The client formatter (`formatDate(..., "yyyy-MM-dd'T'HH:mm:ss")`) was run in
      Node: a picked 20 Aug 2026 becomes `2026-08-20T00:00:00`, whereas `toISOString()` gives
      `2026-08-20T05:00:00.000Z` in UTC-5. The Angular datepicker itself was not exercised.
* [ ] After a successful save the wizard resets to an empty first step. — **[build]** only
      (`cleanControls()` in the `subscribe` callback, then `stepper.reset()`).

## Prerequisite

* A reachable database with `consult`, `consult_detail` and `consult_exam` already created —
  `ddl-auto: update` will create them from the entities, but the composite-key table must be
  verified rather than assumed.
* A row in `user_data` with `id_user = 1`. `Consult.user` is `nullable = false` and the wizard sends
  a fixed `idUser`; without that row every save fails on the foreign key.
* At least one patient, one medic and one exam, otherwise step 1 has nothing to select.

---

# Part 2 — Implementation

## What was found

The backend already had most of the vertical (`ConsultController` POST over `ConsultListExamDTO`,
`ConsultServiceImpl.saveTransactional` with `@Transactional(rollbackFor = Exception.class)`,
`IConsultExamRepo.saveExam` native insert, a `consultMapper` bean). It disagreed with this spec on a
few points, fixed below. The frontend had **nothing** for consults (no model, service, store, form, page
or route). The earlier acceptance notes describing those files did not match the code.

## Changes

Backend (`mediapp-backend/src/main/java/com/mitocode/`):

* `dto/ConsultDTO.java`: `UserDTO user` replaced by `@NotNull Integer idUser`, matching the contract.
  (`dto/UserDTO.java` is now unused and was left in place.)
* `dto/ConsultListExamDTO.java`: `lstExam` is `@NotNull @Valid`. The previous `@NotEmpty` was removed
  so an empty exam list is valid.
* `config/MapperConfig.java`: `consultMapper` (STRICT strategy) gets explicit `ConsultDTO -> Consult`
  (`idUser -> user.idUser`) and `Consult -> ConsultDTO` (`user.idUser -> idUser`) type maps. Both
  directions were confirmed over HTTP (FK `id_user = 1` stored; `"idUser":1` returned by GET). Whether
  STRICT would have matched implicitly was not tested: the explicit maps were added up front.
* `model/ConsultExamPK.java`: `implements Serializable` (JPA requirement for an `@IdClass`). Hibernate
  generated `consult_exam (id_consult, id_exam, primary key (id_consult, id_exam))` with both FKs.
* `exception/ResponseExceptionHandler.java`: new handler `DataIntegrityViolationException -> 400`
  (unknown `idExam` / `idPatient` / `idMedic`, duplicated exam). Before this change, these were `500`.
* Unchanged and verified: `ConsultServiceImpl`, `ConsultController`, `IConsultExamRepo`,
  `IConsultRepo`, `ConsultDetailDTO` (already `@Size(max=70)` / `@Size(max=150)`), the entities.

Frontend (`mediapp-frontend/src/app/`):

* `model/consult.ts`, `model/consult-detail.ts`, `model/consult-list-exam-dto.ts`
* `services/consult.service.ts`: `extends GenericService<Consult>` and only adds `saveTransactional(dto)`.
* `store/consult-wizard.store.ts`: three `httpResource`s (patients, medics, exams).
* `pages/forms/consult-wizard.form.ts`: Signal Forms. `idPatient` and `consultDate` are required, and
  the `diagnosis` / `treatment` draft has `maxLength` 70 / 150 (exported constants).
* `pages/consult-wizard/consult-wizard.component.{ts,html,css}`: linear `mat-stepper` with 3 steps.
* `app.routes.ts`: `pages/consult-wizard` with `loadComponent`.

## Deviations from Part 1

* `ConsultDetailDTO` has **no** `consult` field at all, instead of one with `@JsonBackReference`. The
  effect the spec requires is the same: the body carries no parent and `saveTransactional` sets the
  parent link (`d.setConsult(consult)`). It also avoids a cycle in ModelMapper.
* Medic selection and the consult-number tile use `[ngClass]` (`NgClass` imported in the component).
  The first implementation used `[class.medic-card-selected]` and `[class.number-tile-selected]`
  bindings to follow the frontend
  `CLAUDE.md` rule "Do NOT use `ngClass`"; it was switched to `[ngClass]` on explicit request, so
  this is a deliberate exception to that rule. Cards are `role="radio"` and can be selected with the
  keyboard.
* The form lives in `pages/forms/` (project convention), not `forms/`.
* Step 1 *Next* is `matStepperNext` and stays disabled until patient, date, medic and at least one
  detail are present (linear stepper with `[completed]`). Step 2 *Next* is the manual SnackBar handler,
  as specified.
* The datepicker yields a date only, so `consultDate` is always sent at `T00:00:00` local time.
* `idUser` lives in `DEFAULT_USER_ID = 1` (with a TODO) in the component.

## Verification

* Backend build: `.\mvnw.cmd clean package -DskipTests` gave `BUILD SUCCESS`. Tests were skipped
  because the only test is a context-load test against the Supabase database, which was not used.
* Frontend build: `npm run build` gave `Application bundle generation complete`, with the wizard
  emitted as the lazy chunk `consult-wizard-component` (207 kB). The build prints an *initial bundle
  exceeded 500 kB budget* warning (954.70 kB). The wizard is lazy and is not part of the initial bundle.
* Runtime: the compiled backend was started against H2 (`ddl-auto=create`, seeded with user 1, a
  specialty, a patient, a medic and two exams) and exercised with `curl`. Row counts were read with the
  H2 shell. The results are recorded in the Acceptance Criteria above. It was **not** run against
  PostgreSQL/Supabase.
* The Angular app was never served or opened in a browser.

## Open issues

* An unknown `idUser` still returns `500` (Hibernate `TransientPropertyValueException`, because `User`
  has an assigned id). No rows are written. This is acceptable while `idUser` is the constant `1`, but
  it does not meet the "`400`-class" line of the contract.
* Jackson 3 accepts a trailing `Z` on `consultDate` and keeps the UTC wall time (`15:00:00.000Z` was
  stored as `15:00`), so a client using `toISOString()` would silently shift the hour. The wizard sends
  a local string, so it is not affected.
* `lstExam` now carries `@Valid`, so an exam whose stored data violates `ExamDTO` (for example, a
  description under 15 characters) makes the whole consult a `400`. This was verified over HTTP.
* The real database needs a `user_data` row with `id_user = 1` (see Prerequisite).

