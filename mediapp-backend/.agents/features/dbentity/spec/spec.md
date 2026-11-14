# DB Entities — JPA model generated from the diagram
---

**Status** | Draft |
**Date** | 2026-10-16 |
**Scope** | `mediapp-backend` |
**Affects** | `com.mitocode.model.*`, generated `../resources/sql_output/schema-backup.sql` |
**Reference** | `.agents/features/dbentity/resources/db_diagram.png` (source of truth for tables and relationships) |

> Specification only. Part 2 is written after the implementation.

---

# Part 1 — Specification

## Problem
The project starts practically empty: a Spring Boot application with JPA configured, and at most a couple of entities written by hand as a demonstration. The persistence model as a whole exists only as a picture —`db_diagram.png` — which no compiler can read and no one can diff.
Typing those twelve tables by hand is slow and, worse, silent when it goes wrong: a missing foreign key, a`length` that does not match, a column name Hibernate derives differently. And once the entities do exist,there is still no SQL anywhere: `ddl-auto` builds the schema in memory at boot, so recreating the database without the source code is impossible.
## Goal
Generate the complete JPA model of `com.mitocode.model` from the diagram, and **produce the SQL script of the resulting schema as a backup**.
Two deliverables:
1. The entity classes under `../../../../src/main/java/com/mitocode/model`.
2. `../resources/sql_output/schema-backup.sql` — the DDL of the schema those entities create, dumped from the database. The application never runs it; a person does, with one command, to rebuild the twelve tables on an empty database.
## Scope
In: the twelve tables of the diagram as ten entities + one composite-key class, and the SQL backup script.
Out: DTOs, repositories, services, controllers, seed data, Flyway/Liquibase, anything not in the diagram.
## Rules
* **Overwrite, never merge.** The package ends with exactly the eleven classes below; delete any other entity written for the demonstration.
* `jakarta.persistence.*`; Lombok `@Data @AllArgsConstructor @NoArgsConstructor @EqualsAndHashCode(onlyExplicitlyIncluded = true)` with `@EqualsAndHashCode.Include` on the id. No business logic.
* Fields camelCase, columns derived as snake_case. `@Column(name = ...)` only where noted. `@Table` only on `User` → `user_data` (`USER` is reserved in PostgreSQL).
* Ids: `@GeneratedValue(strategy = GenerationType.IDENTITY)`, except `User`, `Role`, `Menu`: **assigned**, no `@GeneratedValue` (catalogue rows loaded by hand with fixed ids).
* Every `@ManyToOne`: `@JoinColumn(name = ..., nullable = false, foreignKey = @ForeignKey(name = "fk_..."))`, names in lowercase.
* The diagram is followed literally, except `user_data`, whose columns are the ones listed below.
## Entity Model
Notation: `!` = `nullable = false`, number = `length`. Unmarked id = identity PK.
* **patient**: id_patient, first_name 70!, last_name 70!, dni 8!, address 150, phone 9!, email 55!
* **specialty**: id_specialty, name 50!, description 150!
* **medic**: id_medic, specialty → specialty (`fk_medic_specialty`), first_name 70!, last_name 70!, cmp 12!, photo_url 250
* **exam**: id_exam, name 50!, description 150!
* **consult**: id_consult, patient (`fk_consult_patient`), medic (`fk_consult_medic`), user → user_data (`fk_consult_user`), num_consult 3!, consult_date `LocalDateTime`!, details `List<ConsultDetail>` `@OneToMany(mappedBy = "consult", cascade = CascadeType.ALL)`
* **consult_detail**: id_detail, consult (`fk_detail_consult`), diagnosis 70!, treatment 150!
* **consult_exam**: 
    * `ConsultExam` — `@Entity @IdClass(ConsultExamPK.class)`, bare `@Id private Consult consult;` and`@Id private Exam exam;`, no `@ManyToOne`, no `@EqualsAndHashCode`. 
    * `ConsultExamPK` — `@Embeddable`, `@EqualsAndHashCode`, does **not** implement `Serializable`; holds both fields typed `Consult` / `Exam` with `@ManyToOne` + `@JoinColumn` (`fk_consult_exam_consult`, `fk_consult_exam_exam`).
* **user_data** (`User`): id_user assigned, username 60! unique, supabase_user_id 36 unique nullable (explicit `@Column(name = "supabase_user_id")`), enabled primitive `boolean`!, roles `List<Role>` `@ManyToMany(fetch = FetchType.EAGER)` `@JoinTable` `user_role`
* **role**: id_role assigned, name 50!, description 150!* **menu**: id_menu assigned, icon 20!, name 20!, url 50!, roles `List<Role>` `@ManyToMany(fetch = FetchType.EAGER)` `@JoinTable` `menu_role`

Join tables have no entity class; `referencedColumnName` takes the **field** name:

  ```java@JoinTable(name = "user_role", 
        joinColumns = @JoinColumn(name = "id_user", referencedColumnName = "idUser"), 
        inverseJoinColumns = @JoinColumn(name = "id_role", referencedColumnName = "idRole"))
   ```

  `menu_role` is the same with `id_menu` / `idMenu`.

## SQL Backup Script
`../resources/sql_output/schema-backup.sql` — run against an empty database, the twelve tables appear.
Generate it offline, without booting the app or connecting to the database: a throwaway JUnit test builds aHibernate `Metadata` from the eleven classes and calls `SchemaCreatorImpl.generateCreationCommands(metadata, false)`(`SchemaExport` no longer exists in Hibernate 7), with:

```hibernate.dialect = org.hibernate.dialect.PostgreSQLDialecthibernate.physical_naming_strategy = org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImplhibernate.implicit_naming_strategy = org.springframework.boot.hibernate.SpringImplicitNamingStrategyhibernate.boot.allow_jdbc_metadata_access = false```

Write the `create table` statements first, then the `alter table ... add constraint` ones, and delete the test.
## Acceptance Criteria
* [ ] The ten entities exist under `com.mitocode.model` and every column of the diagram is mapped.
* [ ] The package holds the eleven generated files: the demonstration entities were overwritten, and no other class written for the demonstration survived.
* [ ] `./mvnw -DskipTests compile` passes.
* [ ] Booting creates the twelve tables of the diagram, with no table left over from the demonstration.
* [ ] No table is named `user`; the `User` entity maps to `user_data`.
* [ ] `user_data`, `role` and `menu` accept a row with an id chosen by hand; the other six tables generate it.
* [ ] Every `@ManyToOne` declares a named `@ForeignKey`, written lowercase, and those exact names appear in the database.
* [ ] `ConsultExam` carries no `@EqualsAndHashCode`; `ConsultExamPK` is `@Embeddable`, holds the two `@ManyToOne` fields typed `Consult` and `Exam`, and does not implement `Serializable`.
* [ ] Saving a `Consult` with its `details` list persists the `consult_detail` rows through the cascade, and deleting the `Consult` removes them.
* [ ] `ConsultExam` stores the pair `(id_consult, id_exam)`, and inserting the same pair twice fails on the primary key.
* [ ] `../resources/sql_output/schema-backup.sql` exists and contains the twelve tables with their named foreign keys.
## Prerequisites
`spring-boot-starter-data-jpa`, the PostgreSQL driver and Lombok on the classpath; `ddl-auto: update`; nothing worth keeping in `com.mitocode.model` or in the database (drop tables left by earlier demonstration entities).

---
# Part 2 — Implementation Notes

## What was done
**Entities** (`../../../../src/main/java/com/mitocode/model`, exactly 11 files):
* Kept: `Exam` (already matched the spec; unchanged, so the `(Integer, String, String)` all-args constructor used by the `ExamRepoImpl` stub still compiles).
* Rewritten: `Medic` — the demonstration version pointed to `Speciality` via `id_speciality` / `fk_medic_speciality` and had `photo_url` as `nullable = false`; it now references `Specialty` via `id_specialty` / `fk_medic_specialty`, and `photo_url` is nullable (length 250) as the spec says.
* Deleted: `Speciality.java` (demonstration entity, misspelled) — replaced by the new `Specialty.java`.
* Created: `Specialty`, `Patient`, `Consult`, `ConsultDetail`, `ConsultExam`, `ConsultExamPK`, `User` (`@Table(name = "user_data")`), `Role`, `Menu`.
* `ExamController`, `IExamService`, `ExamServiceImpl`, `IExamRepo`, `ExamRepoImpl` were not touched; nothing outside `model` referenced `Speciality`.

**SQL backup** — written to `../resources` (see path note below). Generated offline with a throwaway JUnit test `com.mitocode.SchemaBackupGeneratorTest` (no Spring context, no DB connection): a `StandardServiceRegistry` with the four settings from Part 1, a `Metadata` built from the 11 classes via `MetadataSources.addAnnotatedClasses(...)`, then `new SchemaCreatorImpl(registry).generateCreationCommands(metadata, false)`. The output was written as `create table` statements first, then `alter table ... add constraint`, each ending with `;` (no other statement kinds were emitted). Run with `./mvnw test -Dtest=SchemaBackupGeneratorTest -Dsurefire.failIfNoSpecifiedTests=false` (1 test, BUILD SUCCESS); the test file and its compiled class were then deleted.

Resolved versions: Spring Boot 4.1.1, `hibernate-core` 7.4.5.Final, `spring-boot-hibernate` 4.1.1. All class names in Part 1 exist as written (`org.hibernate.tool.schema.internal.SchemaCreatorImpl`, `org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl`, `org.springframework.boot.hibernate.SpringImplicitNamingStrategy`, `org.hibernate.dialect.PostgreSQLDialect`).

## Deviations / notes
* **Path:** the spec refers to `.agents/features/dbentity/resources/...`, but the real folder is `../resources`. The diagram was read from `../dbentity/resources` and the backup was written to `../dbentity/resources`.
* The diagram's `user` table shows `name` / `password`; per the spec, `user_data` uses `username` (60, unique), `supabase_user_id` (36, unique, nullable) and `enabled` instead.
* The diagram shows `consult.numConsult`, `medic.firstName` etc. in camelCase; columns are derived as snake_case (`num_consult`, `first_name`, ...) as the Rules require.
* The join tables `user_role` and `menu_role` have no primary key and their foreign keys get Hibernate-generated names (`FK...`), because the spec defines named FKs only for `@ManyToOne` and does not ask for `foreignKey` on `@JoinTable`.
* Hibernate emits `alter table if exists ...` and orders columns alphabetically inside each `create table`.
* The DB still holds whatever the demonstration entities created (e.g. a `speciality` table / `id_speciality` column, if the app was booted before); `ddl-auto: update` does not drop them. Per the Prerequisites they must be dropped by hand.

## Acceptance Criteria — verification
Verification was offline only: the app was not booted and no `@SpringBootTest` was run (shared database with `ddl-auto: update`).
* [x] The ten entities exist and every column of the diagram is mapped — checked by inspection against the diagram and by the generated DDL.
* [x] The package holds exactly the eleven files — `../../../../src/main/java/com/mitocode/model` and `target/classes/com/mitocode/model` (after `clean compile`) list the 11 classes only; `Speciality` was deleted.
* [x] `./mvnw -DskipTests compile` passes — BUILD SUCCESS before the change, after the change, and after `clean` with the throwaway test deleted.
* [ ] Booting creates the twelve tables, with no leftover demonstration table — **not verified (requires DB)**; the offline DDL contains exactly the 12 tables.
* [x] No table is named `user`; `User` maps to `user_data` — verified in code and in the DDL.
* [ ] `user_data`, `role`, `menu` accept hand-chosen ids; the other six generate them — **not verified (requires DB)**; the DDL shows `integer not null` for those three and `generated by default as identity` for the other six.
* [ ] Every `@ManyToOne` declares a named lowercase `@ForeignKey`, and those names appear in the database — declared in code and present in the DDL (`fk_medic_specialty`, `fk_consult_patient`, `fk_consult_medic`, `fk_consult_user`, `fk_detail_consult`, `fk_consult_exam_consult`, `fk_consult_exam_exam`); presence in the live database **not verified (requires DB)**.
* [x] `ConsultExam` has no `@EqualsAndHashCode`; `ConsultExamPK` is `@Embeddable`, holds `@ManyToOne Consult` / `Exam`, and does not implement `Serializable` — verified by inspection; Hibernate built the metadata without error.
* [ ] Cascade save/delete of `Consult.details` — **not verified (requires DB)**; mapping is `@OneToMany(mappedBy = "consult", cascade = CascadeType.ALL)`.
* [ ] `ConsultExam` stores `(id_consult, id_exam)` and rejects duplicates — **not verified (requires DB)**; the DDL has `primary key (id_consult, id_exam)`.
* [x] `schema-backup.sql` exists with the twelve tables and their named foreign keys — at `../resources` (path differs from the spec, see notes): 12 `create table` statements, the 7 named FKs, plus 4 Hibernate-named FKs on the join tables.
