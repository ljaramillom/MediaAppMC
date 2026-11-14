# Generate Full Entity Flow

Build the backend vertical for one or more entities, review it, and — only if the review has no critical findings — populate it with test data through the REST create endpoints.

## Assigned Agents

Three agents run in order, each gating the next:

1. `spring-vertical-builder` — implements the vertical (model, DTO, repo, service, service impl, controller, mapper config).
2. `spring-api-reviewer` — reviews what was built. The agent owns its own checklist; this workflow only decides whether the findings block.
3. `spring-test-data-generator` — writes the `testdata/<entity>.json` seed payloads.

This workflow defines the sequence, the gate decision, and runs the curl calls — `spring-test-data-generator` only writes JSON files, it does not execute requests. All data is inserted through the application's own controllers, never by SQL or direct repository writes.

## Required Input

* Target — one of: a single entity (e.g. `Exam`), a group of entities, or a whole package (e.g. `com.mitocode.model`, meaning every entity class in it, excluding `User`, `Menu`, `Role`, `Consult`, `ConsultDetail` and `ConsultExam`).

## Workflow

1. Resolve the target to a concrete list of entities, and for each one check whether its vertical already exists or must be created.
2. Work out the dependency order — which entities reference another by id or by nested DTO — and state it explicitly. It drives both the build order in step 4 and the insert order in step 10.
3. When the target was a whole package, report the resolved list and the dependency order, and confirm them before creating anything.
4. Delegate to `spring-vertical-builder`, one entity at a time in dependency order, so referenced verticals exist before the ones that reference them.
5. Confirm the project compiles before continuing; if the agent reports compilation or implementation issues, ask it to resolve them first.
6. Delegate the review to `spring-api-reviewer`, passing every layer produced in step 4 (model, dto, repo, service, service.impl, controller, and any `MapperConfig` change).
7. Classify the findings. A finding is critical when it can cause a runtime failure, data loss or corruption, or a broken API contract; everything else — naming, comments, minor duplication, style, optional test coverage — is non-critical and does not block.
8. If any finding is critical, send it back to `spring-vertical-builder` and re-run step 6. Repeat at most twice; if a critical finding survives, stop and report it without seeding any data.
9. Once no critical finding is open, delegate to `spring-test-data-generator` to produce `testdata/<entity>.json` for each entity that exposes a create (`POST`) endpoint, plus any dependency that still needs seed data.
10. In the dependency order from step 2, insert each entity against the running application (`{baseUrl}`, `http://localhost:8080` by default) with `curl -X POST {baseUrl}/v1/<entity-path>`, using `Content-Type: application/json` and the JSON body — resolving placeholder tokens (`<idSpecialty>`, `<patient>`, `<medic>`) with real ids/objects captured from earlier responses.
11. Confirm each call returned `201 Created` or `200 OK` before moving to the next dependent entity; stop and report if one fails.
12. Return a final summary including:

    * The resolved entity list and the dependency order used
    * Changed files per entity, endpoint contract, validation rules, and compilation result
    * Findings ordered by severity with file/line references, which were critical, what was fixed and re-reviewed, and which non-critical ones were accepted
    * Entities populated, how many records each got, and the resolved ids used to satisfy dependencies
    * Any entity skipped and why (no create endpoint, out of scope, or a failed dependency)

## Acceptance Criteria

- The resolved entity list matches the requested target, whether one entity, a group, or a package.
- The project compiles before the review step runs.
- No test data is generated or inserted while a critical finding is open.
- Non-critical findings do not block seeding, but all of them appear in the final summary.
- Data is inserted only through the REST create endpoints, never by SQL or direct repository writes.
- `User`, `Menu`, `Role`, `Consult`, `ConsultDetail` and `ConsultExam` are never populated by this workflow.
- Entities are only inserted after their dependencies exist.
- The final summary lists every id created, so the data can be traced or cleaned up later.