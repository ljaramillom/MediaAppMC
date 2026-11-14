# Consult Exam — Transactional registration of Consult, ConsultDetail and ConsultExam
---

**Status** | Implemented — HTTP acceptance pending (manual) |
**Date** | 2026-10-21 (implemented 2026-10-22) |
**Scope** | `mediapp-backend` |
**Affects** | `com.mitocode.dto`, `com.mitocode.repo`, `com.mitocode.service`, `com.mitocode.service.impl`, `com.mitocode.controller`, `com.mitocode.config.MapperConfig` |
**Depends on** | entities `Consult`, `ConsultDetail`, `ConsultExam`, `ConsultExamPK` |

> Specification only. Part 2 is written after the implementation.

---

# Part 1 — Specification

## Problem

The persistence model for a medical consult already exists: `Consult` owns a list of `ConsultDetail`
(`@OneToMany(mappedBy = "consult", cascade = CascadeType.ALL)`), and `ConsultExam` links a consult to the exams
ordered during it through the composite key `(id_consult, id_exam)`. But nothing exposes it: there is no DTO,
repository, service or controller for `Consult`.

Registering a consult is not a single insert. One request produces rows in three tables — `consult`,
`consult_detail` and `consult_exam` — and they must succeed or fail together. If the consult and its details are
saved and then one exam id is invalid, the database must not be left with a consult that has no exams. The cascade
covers the details, but `consult_exam` is not reachable from `Consult` (there is no `@OneToMany` towards it), so it
has to be written explicitly inside the same transaction.

## Goal

Expose `/v1/consults` with:

1. A **transactional `POST`** that receives the consult, its details and the list of exams, and inserts the three
   tables in a single `@Transactional` unit of work: all rows are committed, or none are.
2. The **basic CRUD** (`GET` all, `GET` by id, `PUT`, `DELETE`) of `Consult` built on the existing
   `ICRUD` / `CRUDImpl` / `IGenericRepo` pattern.

## Scope

In:

* DTOs `ConsultDTO`, `ConsultDetailDTO`, `ConsultListExamDTO`, `UserDTO` (minimal).
* Repositories `IConsultRepo`, `IConsultExamRepo` (with native `INSERT` / `DELETE`).
* Service `IConsultService` / `ConsultServiceImpl` with `saveTransactional(...)`, plus `update` / `delete`
  overrides needed by the relationships.
* Controller `ConsultController` under `/v1/consults`.
* A dedicated `consultMapper` bean (ModelMapper) in `MapperConfig`, used only by `ConsultController`.

Out:

* Any change to the entities in `com.mitocode.model`.
* An endpoint to read or modify the exams of an existing consult (e.g. `GET /v1/consults/{id}/exams`).
* Pre-validation of existence of patient, medic, user or exams (see *Validation*).
* Automated tests (the only test remains the context-load test); verification is manual over HTTP.
* Generation of `numConsult` — the client sends it.
* Security / authentication; `user` is just a reference sent in the body.

## Rules

* Follow the existing layering and conventions: `I`-prefixed interfaces, `*Impl` classes, `@RequiredArgsConstructor`
  on `private final` fields, `CRUDImpl<T, ID>` for the CRUD, ModelMapper for DTO ↔ entity conversion inside the
  controller (`convertToEntity` / `convertToDto`), `throws Exception` on service methods.
* `ConsultController` uses `consultMapper`, never `defaultMapper` (see *Mapping*). Existing mappers
  (`defaultMapper`, `medicMapper`) are not modified.
* DTOs: Lombok `@Data @AllArgsConstructor @NoArgsConstructor` and `@JsonInclude(JsonInclude.Include.NON_NULL)`,
  constraints from `jakarta.validation.constraints`.
* Comments in Spanish, matching the rest of the code. Do not remove commented-out teaching code in existing files.
* No entity is modified; `ddl-auto: update` must not alter any table.

## API

Base path: `/v1/consults`.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/v1/consults` | — | `200` + `List<ConsultDTO>` |
| `GET` | `/v1/consults/{id}` | — | `200` + `ConsultDTO` · `404` if not found |
| `POST` | `/v1/consults` | `ConsultListExamDTO` | `201` + `Location: /v1/consults/{id}`, no body |
| `PUT` | `/v1/consults/{id}` | `ConsultDTO` | `200` + `ConsultDTO` · `404` if not found |
| `DELETE` | `/v1/consults/{id}` | — | `204` · `404` if not found |

There is a single `POST`: it always receives `ConsultListExamDTO` and is always transactional. `GET` responses do
not include the exams of the consult.

### POST request example

```json
{
  "consult": {
    "patient": { "idPatient": 1 },
    "medic":   { "idMedic": 4 },
    "user":    { "idUser": 1 },
    "numConsult": "C01",
    "consultDate": "2026-10-21T10:00:00",
    "details": [
      { "diagnosis": "Gripe estacional", "treatment": "Reposo e hidratación por 3 días" },
      { "diagnosis": "Faringitis",       "treatment": "Antiinflamatorio cada 8 horas" }
    ]
  },
  "lstExam": [ { "idExam": 1 }, { "idExam": 2 } ]
}
```

Only the ids of `patient`, `medic`, `user` and each exam are read; any other field sent in those objects is ignored.

## DTOs

* **`ConsultDetailDTO`**: `idDetail`, `diagnosis` `@NotBlank @Size(max = 70)`, `treatment` `@NotBlank @Size(max = 150)`.
  No back-reference to the consult (avoids cycles in JSON and in ModelMapper).
* **`UserDTO`** (new, minimal): `idUser`. Exists only so the consult can reference its user; no user endpoint is created.
* **`ConsultDTO`**:
    * `idConsult`
    * `patient` `PatientDTO` `@NotNull`
    * `medic` `MedicDTO` `@NotNull`
    * `user` `UserDTO` `@NotNull`
    * `numConsult` `@NotBlank @Size(max = 3)`
    * `consultDate` `LocalDateTime` `@NotNull`
    * `details` `List<ConsultDetailDTO>` `@NotNull @NotEmpty @Valid`

  `patient`, `medic` and `user` are **not** annotated `@Valid`: they are references, and cascading validation would
  demand every field of `PatientDTO` / `MedicDTO`.
* **`ConsultListExamDTO`**:
    * `consult` `ConsultDTO` `@NotNull @Valid`
    * `lstExam` `List<ExamDTO>` `@NotNull @NotEmpty` — **without** `@Valid`, for the same reason (only `idExam` is used;
      `ExamDTO` requires `nameExam` / `descriptionExam`).

## Mapping

`defaultMapper` is not enough for a consult: the nested `MedicDTO` renames fields (`primaryName`, `surname`,
`photo`, `idSpecialty`), so a `GET` would return a `medic` with only its id, and the implicit matching of nested
objects (`patient`, `medic`, `user`, `details`) can raise ambiguous-mapping errors. A new bean is added to
`MapperConfig`, next to `medicMapper` and with the same style:

```java
@Bean
public ModelMapper consultMapper() {
    ModelMapper modelMapper = new ModelMapper();
    // Solo coincidencias exactas de nombres: evita mapeos ambiguos en los objetos anidados
    modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);

    //ESCRITURA POST PUT
    modelMapper.createTypeMap(MedicDTO.class, Medic.class)
            .addMapping(MedicDTO::getPrimaryName, Medic::setFirstName)
            .addMapping(MedicDTO::getSurname, Medic::setLastName)
            .addMapping(MedicDTO::getPhoto, Medic::setPhotoUrl);

    //LECTURA GET
    modelMapper.createTypeMap(Medic.class, MedicDTO.class)
            .addMapping(Medic::getFirstName, MedicDTO::setPrimaryName)
            .addMapping(Medic::getLastName, MedicDTO::setSurname)
            .addMapping(Medic::getPhotoUrl, MedicDTO::setPhoto)
            .addMapping(src -> src.getSpecialty().getIdSpecialty(), MedicDTO::setIdSpecialty);

    return modelMapper;
}
```

* The `Medic` type maps are declared again here and not shared with `medicMapper`: each `ModelMapper` instance
  keeps its own type maps.
* `Consult` ↔ `ConsultDTO`, `Patient` ↔ `PatientDTO`, `User` ↔ `UserDTO` and `ConsultDetail` ↔ `ConsultDetailDTO`
  have identical field names, so they map implicitly under `STRICT`.
* `ExamDTO` → `Exam` needs no type map: only `idExam` is read from `lstExam`, and it has the same name on both sides.
* On write, `MedicDTO.idSpecialty` is not mapped (it has no exact match and the medic is only a reference).
* The mapping leaves `ConsultDetail.consult` as `null`; the service sets that back-reference (see *Service*).

`ConsultController` injects it by name as `private final ModelMapper consultMapper;`, the same way
`MedicController` injects `medicMapper`.

## Persistence

* **`IConsultRepo`** `extends IGenericRepo<Consult, Integer>`.
* **`IConsultExamRepo`** `extends IGenericRepo<ConsultExam, ConsultExamPK>`, with two native statements:

```java
@Modifying
@Query(value = "INSERT INTO consult_exam(id_consult, id_exam) VALUES (:idConsult, :idExam)", nativeQuery = true)
Integer saveExam(@Param("idConsult") Integer idConsult, @Param("idExam") Integer idExam);

@Modifying
@Query(value = "DELETE FROM consult_exam WHERE id_consult = :idConsult", nativeQuery = true)
Integer deleteByConsult(@Param("idConsult") Integer idConsult);
```

## Service

`IConsultService extends ICRUD<Consult, Integer>` and adds:

```java
Consult saveTransactional(Consult consult, List<Exam> exams) throws Exception;
```

`ConsultServiceImpl extends CRUDImpl<Consult, Integer> implements IConsultService`, injecting `IConsultRepo` and
`IConsultExamRepo`.

### `saveTransactional` — the core of this feature

Annotated `@Transactional(rollbackFor = Exception.class)` (`org.springframework.transaction.annotation`).
`rollbackFor` is required: by default Spring only rolls back on unchecked exceptions, and the service methods of
this project declare `throws Exception`.

Steps, in this order:

1. Set the back-reference of every detail: `consult.getDetails().forEach(d -> d.setConsult(consult));`
   (`Consult.details` is `mappedBy = "consult"`; without this, `id_consult` of `consult_detail` would be `null`).
2. `consultRepo.save(consult)` → inserts `consult` and, by cascade, every `consult_detail`. With `IDENTITY`, the
   generated `idConsult` is available right after this call.
3. For each exam: `consultExamRepo.saveExam(consult.getIdConsult(), exam.getIdExam());`
4. Return the saved consult.

Any failure in steps 2 or 3 — a non-existent `idPatient` / `idMedic` / `idUser` / `idExam` (FK violation), the same
exam twice in `lstExam` (PK violation), a value that exceeds a column — rolls back the whole transaction: no row
remains in any of the three tables.

### CRUD overrides

* **`save(Consult)`** — inherited, not exposed by the controller (the only `POST` uses `saveTransactional`).
* **`update(id, consult)`** — override: set the back-reference of the details (as in step 1) and delegate to
  `super.update(id, consult)`. Exams are not touched. Details with `idDetail` are updated; details without it are
  inserted. Details removed from the list are **not** deleted (no `orphanRemoval` in the entity; accepted limitation).
* **`delete(id)`** — override with `@Transactional(rollbackFor = Exception.class)`: `consultExamRepo.deleteByConsult(id)`
  first, then `super.delete(id)` (which deletes the consult and its details by cascade). Without the first step the
  `fk_consult_exam_consult` constraint makes the delete fail.

## Controller

`ConsultController` — `@RestController @RequestMapping("/v1/consults") @RequiredArgsConstructor`, injecting
`IConsultService` and `ModelMapper consultMapper`, with the same shape as `MedicController`
(`convertToEntity` / `convertToDto` use `consultMapper`).

`POST`:

```java
@PostMapping
public ResponseEntity<Void> save(@Valid @RequestBody ConsultListExamDTO dto) throws Exception {
    Consult consult = this.convertToEntity(dto.getConsult());
    List<Exam> exams = dto.getLstExam().stream().map(e -> consultMapper.map(e, Exam.class)).toList();
    Consult obj = service.saveTransactional(consult, exams);

    URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(obj.getIdConsult()).toUri();
    return ResponseEntity.created(location).build();
}
```

## Validation and errors

Only Bean Validation (`@Valid`) is applied before reaching the service; references are not checked for existence.

| Situation | Handled by | Status |
| --- | --- | --- |
| Missing / blank / oversized field, empty `details` or `lstExam` | `MethodArgumentNotValidException` | `400` |
| `id` not found on `GET` / `PUT` / `DELETE` | `ModelNotFoundException` | `404` |
| Non-existent `idPatient` / `idMedic` / `idUser` / `idExam`, duplicated exam | FK / PK violation → generic `Exception` handler, **rollback** | `500` |

No new exception handler is added.

## Acceptance Criteria

* [ ] `./mvnw -DskipTests compile` passes.
* [ ] Booting the application does not alter any table (no entity was changed).
* [ ] `POST /v1/consults` with the example body returns `201` with `Location: .../v1/consults/{id}`, and the database
  holds 1 row in `consult`, 2 in `consult_detail` (both with that `id_consult`) and 2 in `consult_exam`.
* [ ] **Rollback:** the same `POST` with a non-existent `idExam` (e.g. `9999`) in `lstExam` returns an error and leaves
  **no** new row in `consult`, `consult_detail` or `consult_exam`.
* [ ] **Rollback:** the same `POST` with a repeated exam (`[{ "idExam": 1 }, { "idExam": 1 }]`) fails and leaves no new row.
* [ ] `POST` with `details: []`, `lstExam: []`, or `numConsult` longer than 3 characters returns `400` and inserts nothing.
* [ ] `GET /v1/consults` and `GET /v1/consults/{id}` return the consult with its `details`; an unknown id returns `404`.
* [ ] In those `GET` responses the nested `medic` carries `primaryName`, `surname`, `cmpMedic`, `photo` and
  `idSpecialty` (proves `consultMapper` is used).
* [ ] `MapperConfig` declares `consultMapper`; `ConsultController` injects it and never uses `defaultMapper`;
  `defaultMapper` and `medicMapper` are unchanged.
* [ ] `PUT /v1/consults/{id}` updates `numConsult` / `consultDate` / existing details and returns `200`; its exams are unchanged.
* [ ] `DELETE /v1/consults/{id}` returns `204` and removes the consult, its details and its `consult_exam` rows; an
  unknown id returns `404`.
* [ ] `saveTransactional` and `delete` are annotated `@Transactional(rollbackFor = Exception.class)`.

## Prerequisites

* The database has at least one row in `patient`, `medic` (with its `specialty`), `user_data` (id assigned by hand)
  and two rows in `exam`, to run the ac# Part 2 — Implementation Notes

> Rewritten 2026-10-22. A previous version of this part described files that did not exist in the codebase; it was
> discarded and the feature was implemented from Part 1.

## What was done

**Created** (`src/main/java/com/mitocode/`):

* `dto/UserDTO` — only `idUser` (no `READ_ONLY`, so it is read from the request body).
* `dto/ConsultDetailDTO` — `idDetail`, `diagnosis` `@NotBlank @Size(max = 70)`, `treatment` `@NotBlank @Size(max = 150)`;
  no back-reference to the consult.
* `dto/ConsultDTO` — fields and constraints as in *DTOs*; `patient` / `medic` / `user` without `@Valid`, `details`
  `@NotNull @NotEmpty @Valid`. Contains two nested write-side reference classes (see *Deviations*).
* `dto/ConsultListExamDTO` — `consult` `@NotNull @Valid`, `lstExam` `@NotNull @NotEmpty` without `@Valid`. Contains a
  nested write-side reference class for exams (see *Deviations*).
* `repo/IConsultRepo` (`IGenericRepo<Consult, Integer>`).
* `repo/IConsultExamRepo` (`IGenericRepo<ConsultExam, ConsultExamPK>`) with the native `saveExam` / `deleteByConsult`
  exactly as in *Persistence*.
* `service/IConsultService` (`ICRUD<Consult, Integer>` + `saveTransactional`).
* `service/impl/ConsultServiceImpl` (`CRUDImpl<Consult, Integer>`, injects `IConsultRepo` + `IConsultExamRepo`):
  * `saveTransactional` — `@Transactional(rollbackFor = Exception.class)`; sets the details back-reference, saves the
    consult (cascade inserts the details), then calls `saveExam` for every exam, and returns the consult.
  * `update` — sets the details back-reference and delegates to `super.update`. Exams untouched.
  * `delete` — `@Transactional(rollbackFor = Exception.class)`; `findById` (404 if missing), `deleteByConsult(id)`, then
    `super.delete(id)`.
* `controller/ConsultController` — `/v1/consults` with `GET`, `GET /{id}`, the single transactional `POST`
  (`ConsultListExamDTO`, `201` + `Location`), `PUT /{id}`, `DELETE /{id}`. Injects `ModelMapper consultMapper` by name;
  `defaultMapper` is not used.

**Modified**:

* `config/MapperConfig` — added the `consultMapper` bean (`MatchingStrategies.STRICT` + `Medic` ↔ `MedicDTO` type maps,
  including `cmp` ↔ `cmpMedic`). `defaultMapper` and `medicMapper` are unchanged.

No entity (`com.mitocode.model`), exception handler, or other existing DTO / controller / service was modified.

## Deviations / notes

* **Nested ids in the POST body were silently dropped (fixed with write-side reference subclasses).** `PatientDTO.idPatient`,
  `MedicDTO.idMedic` and `ExamDTO.idExam` are annotated `@JsonProperty(access = JsonProperty.Access.READ_ONLY)`. With the
  project's Jackson (3.1.5) this means the example body of *API* deserializes with `idPatient`, `idMedic` and every
  `idExam` as `null` (verified offline), so the `POST` could never work as specified. Making those ids writable in the
  shared DTOs would let `POST /v1/patients`, `/v1/medics`, `/v1/exams` receive an id and overwrite an existing row, so the
  shared DTOs were left as they are. Instead:
  * `ConsultDTO.PatientRefDTO extends PatientDTO` and `ConsultDTO.MedicRefDTO extends MedicDTO` override the id setter
    with `@JsonProperty(access = READ_WRITE)`; the fields are annotated `@JsonDeserialize(as = ...)`.
  * `ConsultListExamDTO.ExamRefDTO extends ExamDTO` does the same for `idExam`; `lstExam` is annotated
    `@JsonDeserialize(contentAs = ExamRefDTO.class)`.
  * Field types stay `PatientDTO` / `MedicDTO` / `List<ExamDTO>`, the JSON shape is the one in *API*, and the ids remain
    read-only in every other endpoint (verified offline).
* **`cmp` ↔ `cmpMedic` mapping added to `consultMapper`.** The entity field is `Medic.cmp`, the DTO field is
  `MedicDTO.cmpMedic`; under `STRICT` they do not match, so `.addMapping(MedicDTO::getCmpMedic, Medic::setCmp)` (write) and
  `.addMapping(Medic::getCmp, MedicDTO::setCmpMedic)` (read) were added. `medicMapper` was not changed.
* **`update` is also `@Transactional(rollbackFor = Exception.class)`**, following `MedicServiceImpl` (the spec only
  required it on `saveTransactional` and `delete`).
* **Status for FK / PK violations is likely `409`, not `500`.** The existing `ResponseExceptionHandler` maps
  `DataIntegrityViolationException` to `409 Conflict`; Spring translates FK / PK violations from the repository into that
  exception. The rollback behaviour is unaffected. To be confirmed during the manual HTTP checks.
* `GET` maps the LAZY `details` in the controller; this relies on Spring Boot's default `spring.jpa.open-in-view: true`
  (not overridden in `application.yaml`).
* `PUT` with an `idDetail` that belongs to another consult would move that detail to this consult; no ownership check
  is made (same accepted limitation as the missing `orphanRemoval`).

## Verification performed

* `./mvnw -DskipTests clean package` → `BUILD SUCCESS` (51 source files).
* `./mvnw test` (context load against the configured database) → `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0`,
  `BUILD SUCCESS`.
* Offline check (throwaway program in a scratch directory, outside the project, no Spring context, no database):
  the example body of *API* deserializes with `idPatient=1`, `idMedic=4`, `idUser=1`, both details and `idExam` 1 and 2;
  `consultMapper` maps it to a `Consult` with those ids, 2 details and `ConsultDetail.consult == null`; `ExamDTO` → `Exam`
  keeps `idExam`; `Consult` → `ConsultDTO` returns the nested `medic` with `primaryName`, `surname`, `cmpMedic`, `photo`,
  `idSpecialty`, plus `patient`, `user` and `details`. Plain `PatientDTO` / `MedicDTO` / `ExamDTO` still ignore an incoming id.
* The application was not started and no HTTP request was sent (shared database).

## Acceptance Criteria — verification

* [x] `./mvnw -DskipTests compile` passes — `./mvnw -DskipTests clean package`: BUILD SUCCESS.
* [ ] Booting does not alter any table — holds by construction (no entity changed); the context-load test passed against
  the database, but DDL was not observed (`show-sql: false`).
* [ ] `POST /v1/consults` with the example body → `201` + 1 / 2 / 2 rows — **pending manual HTTP verification**.
* [ ] Rollback with non-existent `idExam` — **pending manual HTTP verification**; `saveTransactional` is
  `@Transactional(rollbackFor = Exception.class)`. Expected status probably `409` (see *Deviations*).
* [ ] Rollback with repeated exam — **pending manual HTTP verification**.
* [ ] `POST` with `details: []`, `lstExam: []` or `numConsult` > 3 → `400` — **pending manual HTTP verification**;
  constraints are in place and handled by the existing `MethodArgumentNotValidException` handler.
* [ ] `GET` list / by id with `details`, `404` for unknown id — **pending manual HTTP verification**; mapping verified offline.
* [ ] Nested `medic` carries `primaryName`, `surname`, `cmpMedic`, `photo`, `idSpecialty` — verified offline with
  `consultMapper`; **pending manual HTTP verification**.
* [x] `MapperConfig` declares `consultMapper`; `ConsultController` injects it and never uses `defaultMapper`;
  `defaultMapper` and `medicMapper` unchanged — verified by inspection.
* [ ] `PUT /v1/consults/{id}` — **pending manual HTTP verification**.
* [ ] `DELETE /v1/consults/{id}` removes consult, details and `consult_exam` rows; `404` for unknown id —
  **pending manual HTTP verification**.
* [x] `saveTransactional` and `delete` are annotated `@Transactional(rollbackFor = Exception.class)` — verified by inspection.
