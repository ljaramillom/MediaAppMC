# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Maven wrapper is committed; use `./mvnw` (or `mvnw.cmd` on Windows). Requires Java 25.

- Run the app: `./mvnw spring-boot:run` (serves on the default port 8080)
- Build: `./mvnw clean package`
- Run all tests: `./mvnw test`
- Run a single test class: `./mvnw test -Dtest=MediappBackendApplicationTests`
- Run a single test method: `./mvnw test -Dtest=MediappBackendApplicationTests#contextLoads`

No linter or formatter is configured in the POM.

## Configuration

`src/main/resources/application.yaml` configures a PostgreSQL datasource (Supabase pooler) with each value overridable by env var: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. The fallback values in the file are live credentials committed to the repo; prefer setting the env vars and do not copy those values into new code or docs. `spring.jpa.hibernate.ddl-auto: update` means Hibernate alters the schema on startup, so starting the app against a shared database can change its tables.

`@SpringBootTest` tests (including `contextLoads`) start the full context, so they need the database reachable.

## Architecture

Spring Boot 4.1.1 / Spring MVC / Spring Data JPA, with Lombok (`@Data`, `@RequiredArgsConstructor`, etc.) on entities and services.

Layered package layout under `com.mitocode`:

- `controller` — REST endpoints. `ExamController` is mapped at `v1/exams`.
- `service` — `IExamService` interface with `ExamServiceImpl`. The service validates input and delegates to the repo.
- `repo` — `IExamRepo` interface with `ExamRepoImpl`, which is a hand-written `@Repository`, not a Spring Data `JpaRepository`.
- `model` — JPA `@Entity` classes: `Exam`, `Speciality`, `Medic`. `Medic` has a `@ManyToOne` to `Speciality` (`id_speciality`).

Current state to be aware of: `ExamRepoImpl.findById` returns a hardcoded `Exam` and never touches the database, and `ExamController.getExam()` always calls the service with id `1`. The JPA entities are therefore not yet wired to any persistence code. Only `Exam` is used by the request path; `Speciality` and `Medic` are unused so far. `ExamServiceImpl` has an unused `txt` field and commented-out `@Autowired`/constructor code left from earlier iterations.

Dependency wiring relies on constructor injection: `ExamController` uses `@AllArgsConstructor` over an `IExamService` field, and `ExamServiceImpl` uses `@RequiredArgsConstructor` over `IExamRepo`. New beans should follow the same interface-plus-impl pattern.

Lombok is wired as an annotation processor in the `maven-compiler-plugin` config in `pom.xml`. If Lombok-generated methods are missing in an IDE, check that annotation processing is enabled.

## Agents, Skills
SKILLS are located in ./agents/skills
AGENTS are located in ./agents/subagents
FEATURES are located in ./agents/features