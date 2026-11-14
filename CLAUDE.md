# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

This folder is not a single repository. It is a workspace for a MitoCode full-stack (Java + Angular) course, holding independent projects:

- `mediapp-backend/` — Spring Boot 4.1 REST API (Java 25, Maven, PostgreSQL). No git repo of its own.
- `mediapp-frontend/` — Angular 22 + Angular Material SPA that consumes the backend. Has its own git repo.

Each project has its own `CLAUDE.md` with project-specific conventions. Read it before editing that project. Code comments and messages are in Spanish. Commented-out code is often teaching material, so leave it in place unless asked to remove it.

## Commands

Backend (run from `mediapp-backend/`; use `.\mvnw.cmd` in PowerShell):
- Build: `./mvnw clean package`
- Run (port 8080): `./mvnw spring-boot:run`
- Tests: `./mvnw test`, single test: `./mvnw test -Dtest=Class#method`. The only test is a context-load test, and it needs a reachable PostgreSQL database.

Frontend (run from `mediapp-frontend/`):
- Dev server (port 4200): `npm start`
- Build (production by default): `npm run build`
- Tests (Vitest via `@angular/build:unit-test`): `npm test`

## How the two mediapp projects connect

- The frontend calls `environment.HOST` (`http://localhost:8080`) + `/v1/<resource>`. Services import `environment.development` directly.
- The backend allows CORS only from `http://localhost:4200` (`util/CORS.java`).
- DTO field names deliberately differ from entity field names (e.g. `nameExam`, `nameSpecialty`). The frontend models mirror the **DTOs**, not the entities. When the names don't match implicitly, add a dedicated `ModelMapper` bean in `config/MapperConfig.java` with mappings in both directions (write: DTO→entity, read: entity→DTO), as `medicMapper` does.

## Building a feature vertical (backend + frontend)

`Exam` is the reference vertical on both sides. Copy its shape and reuse the shared abstractions without modifying them:

- Backend: entity → DTO (Jakarta validation) → `I<X>Repo extends IGenericRepo` → `I<X>Service extends ICRUD` + `<X>ServiceImpl extends CRUDImpl` → `<X>Controller` at `/v1/<plural>`. POST returns `201` with a `Location` header, PUT returns `200` + DTO, and DELETE returns `204`. A missing id throws `ModelNotFoundException`, which `ResponseExceptionHandler` turns into a 404 `CustomErrorTemplate`. `CRUDImpl.update` sets the id by reflection (`setId<ClassName>`), so the entity's id setter must follow that name.
- Frontend: `model/<x>.ts` → `services/<x>.service.ts extends GenericService<T>` → a store built on `httpResource` (`store/`) → a Signal Forms class (`pages/forms/<x>.form.ts`) → a page under `pages/<x>/` with an edit child route (`new`, `edit/:id`) registered in `app.routes.ts` under `pages/<x>`.

## Spec-driven workflow

The root, backend and frontend each have an `.agents/` folder:
- `features/<name>/spec/spec.md` — feature specs. Part 1 is the specification; after implementing it, update the spec with what was actually verified and any deviations.
- `subagents/` — agent definitions (e.g. root `writer-full-stack-code.md` implements a feature across both projects, then confirms that both builds succeed).
- `skills/` — skills (backend: Java/testing/code review/OpenSpec; frontend: `angular-developer`).

When reporting on a feature, separate what was compiled or built from what was exercised at runtime. There is usually no running database or browser in a session.

## ROOT FOLDER AGENTS:
Roo folder means a general folder to use backend and front folder for contex window to the LLMS

Agents are located in ./agents/subagents
Skills are located in ./agents/skills
Features (specs) are located in .agents/features