# Medic Photo Upload

| | |
| --- | --- |
| **Status** | Implemented (compiled/built; not runtime-verified) |
| **Date** | 2026-11-02 |
| **Scope** | `mediapp-backend` + `mediapp-frontend` |
| **Affects** | `MedicController`, `MedicServiceImpl`, `IMedicService`, `ResponseExceptionHandler`, `application.yaml`, frontend medic service/pages |

---

# Part 1 — Specification

## Problem

The medic photo is stored as a URL in `Medic.photoUrl`, users need to upload an image file from the medic screen dialog.

## Goal

Send the photo together with the medic data in a single request. The backend receives the file, uploads it to a public Supabase Storage bucket, and persists the resulting public URL.

## Scope

In scope:

* Upload during medic create and update.
* Storage in a public Supabase bucket named `photos`.
* Server-side validation of file type images and size 2MB.

## Decisions

**The file travels through the backend, not straight to Supabase from the browser.**
The service role key stays server-side, and no bucket CORS or RLS policy is needed. 

**The upload is part of `POST /v1/medics` and `PUT /v1/medics/{id}`, not a dedicated endpoint.**
One request per user action, no half-saved states.

**The Supabase call lives inside `MedicServiceImpl`, with no storage abstraction.**
Explicitly chosen for simplicity.

**The object name is `medics/{uuid}.{ext}` and does not include `idMedic`.**
Lets the upload happen before the entity is persisted, so create stays a single insert instead of insert-then-update.

**Replaced photos are left in the bucket.**
Explicitly chosen for simplicity.

**The bucket name `photos` is not hardcoded.**
Configuration property must be in application.yml or properties.

## Contract

Both endpoints consume `multipart/form-data` with two parts:

| Part | Type | Required | Description |
| --- | --- | --- | --- |
| `medic` | `application/json` | yes | `MedicDTO` payload, validated |
| `file` | `image/*` | no | Photo to upload |

```
POST /v1/medics        -> 201 Created + Location header
PUT  /v1/medics/{id}   -> 200 OK + MedicDTO
```

The `medic` part must carry the `application/json` content type. A plain string part is rejected with `415 Unsupported Media Type`.

When `file` is absent, `photoUrl` is left untouched: the existing URL travels in `MedicDTO.photo` and is mapped back onto the entity.

## Acceptance Criteria

Legend: `[x]` verified, `[ ]` implemented but **not runtime-verified** (no database, Supabase key or browser was available in the implementation session).

* [ ] Creating a medic with a file stores the object in the bucket and persists its public URL. *(implemented, not runtime-verified)*
* [ ] Creating a medic without a file succeeds and leaves `photoUrl` empty. *(implemented, not runtime-verified)*
* [ ] Updating a medic without a file preserves the existing photo. *(implemented, not runtime-verified)*
* [ ] Updating a medic with a file replaces the stored URL. *(implemented, not runtime-verified)*
* [ ] A non-image file is rejected. *(implemented, not runtime-verified)*
* [ ] A file above the configured limit is rejected. *(implemented, not runtime-verified)*
* [ ] `GET /v1/medics` returns the photo URL so the list can render it. *(already mapped by `medicMapper`; list renders it; not runtime-verified)*
* [x] The project compiles. *(backend `./mvnw clean package -DskipTests` and frontend `npm run build` both succeed)*

---

# Part 2 — Implementation

## Backend (`mediapp-backend`)

| File | Change |
| --- | --- |
| `controller/MedicController.java` | `POST` and `PUT /{id}` now `consumes = multipart/form-data`, with `@Valid @RequestPart("medic") MedicDTO` and `@RequestPart(value = "file", required = false) MultipartFile`. Responses unchanged: `201` + `Location`, `200` + `MedicDTO`. |
| `service/IMedicService.java` | Adds `saveWithPhoto(Medic, MultipartFile)` and `updateWithPhoto(Integer, Medic, MultipartFile)`. `ICRUD`/`CRUDImpl` are untouched. |
| `service/impl/MedicServiceImpl.java` | Validates the file (content type `image/*`, size <= `medic.photo.max-size`), uploads it with Spring's `RestClient` (`RestClient.create()`, no new dependency) to `POST {supabase.url}/storage/v1/object/{bucket}/medics/{uuid}.{ext}` (headers `Authorization: Bearer <key>`, `apikey`, `x-upsert: false`), and sets `photoUrl` to `{supabase.url}/storage/v1/object/public/{bucket}/medics/{uuid}.{ext}` before delegating to `save`/`update`. Empty or absent file: `photoUrl` comes from `MedicDTO.photo` untouched. On update, the id is checked (`findById`) before uploading. Old photos are not deleted. |
| `exception/InvalidFileException.java` | New, same style as `ModelNotFoundException`. |
| `exception/ResponseExceptionHandler.java` | New handlers: `InvalidFileException` -> 400, `MaxUploadSizeExceededException` -> 400, `MissingServletRequestPartException` -> 400, `HttpMediaTypeNotSupportedException` -> 415. All return `CustomErrorTemplate`. Without these, the catch-all `Exception` handler would have returned 500. |
| `resources/application.yaml` | Multipart limits and Supabase config (below). |

`config/MapperConfig.java` was checked and **not changed**: `medicMapper` already maps `photo -> photoUrl` (write) and `photoUrl -> photo` (read).

### Configuration properties

```yaml
spring.servlet.multipart.max-file-size: 2MB
spring.servlet.multipart.max-request-size: 3MB
supabase.url:    ${SUPABASE_URL:https://vdkjfanukruvfprbygbj.supabase.co}
supabase.key:    ${SUPABASE_SERVICE_ROLE_KEY:}     # no default, never committed
supabase.bucket: ${SUPABASE_BUCKET:photos}
medic.photo.max-size: 2MB
```

The default Supabase URL is derived from the project ref in the existing datasource username; override it with `SUPABASE_URL` if it differs. `SUPABASE_SERVICE_ROLE_KEY` must be set before an upload; if it is empty the service fails with an explicit `IllegalStateException` (500) instead of calling Supabase. The bucket `photos` must exist and be public.

## Frontend (`mediapp-frontend`)

| File | Change |
| --- | --- |
| `services/medic.service.ts` | Overrides `save(medic, file?)` and `update(id, medic, file?)` to send `FormData`: `medic` as `Blob` of type `application/json`, plus `file` when present. `GenericService` is untouched. |
| `pages/medic/medic-edit/medic-edit.component.{ts,html,css}` | The PHOTO URL text input is replaced by a hidden `<input type="file" accept="image/*">` triggered by a button, with a current-photo preview, a "max 2MB" hint, the selected file name, and client-side type/size errors (submit disabled while there is an error). The selected file goes in `$file` signal and is passed to the service. |
| `pages/medic/medic.component.{ts,html,css}` | New `photo` column with a round avatar (`<img>`), or an `account_circle` icon when there is no photo. |
| `pages/forms/medic.form.ts` | Comment updated only; `photo` stays in the model so the existing URL is sent back on update. |

## Deviations

* Rejections for oversize files return **400** (not 413), both from the explicit check and from the multipart parser limit, to match the existing error style.
* Added `HttpMediaTypeNotSupportedException` -> 415 and `MissingServletRequestPartException` -> 400 handlers so the contract's 415 is actually produced (the catch-all handler would have returned 500).
* The medic "dialog" is the existing routed edit page (`pages/medic/new`, `edit/:id`), not a `MatDialog`.
* Supabase upload errors (e.g. wrong key, missing bucket) surface as the generic 500 `CustomErrorTemplate`.
* The JSON (`application/json` body) variants of POST/PUT no longer exist; clients must send multipart.

## Verification

Compiled / built:

* Backend: `./mvnw clean package -DskipTests` -> BUILD SUCCESS. Tests were skipped because the only test is a context-load test that needs a reachable PostgreSQL database.
* Frontend: `npm run build` -> success (only the existing initial-bundle budget warning, 904 kB vs 500 kB).

Exercised at runtime: **nothing**. No database, Supabase service role key, running backend or browser was available, so no upload, validation response, or list rendering was observed.
