# Medic CRUD — Fix: edit form in a dialog

| | |
| --- | --- |
| **Status** | Implemented — frontend build passes; `npm test` fails on a pre-existing, unrelated `app.spec.ts` issue; not exercised in a browser |
| **Date** | 2026-11-02 |
| **Scope** | `mediapp-frontend` only |
| **Parent** | `medic-crud/spec/spec.md` |
| **Reference** | `shared/components/confirm-dialog/confirm-dialog.component.ts` (existing `MatDialog` usage), `MedicComponent.delete()` |

> Part 1 is the specification. Part 2 records what was implemented and verified.
> This spec covers **only** this fix. Do not re-implement or change anything else in the medic vertical.

---

# Part 1 — Specification

## Problem

The medic create/edit form is a child route (`/pages/medic/new`, `/pages/medic/edit/:id`) rendered through a `<router-outlet>` placed above the table in `pages/medic/medic.component.html`. The form pushes the list down and the URL changes for what is really a modal action.

## Goal

Show the medic create/edit form in a `MatDialog` opened from the medic list. The form, its validations, the specialty selector and the photo upload must keep working exactly as they do now. Only the container changes.

## Scope

In scope:

* Turn `MedicEditComponent` into dialog content.
* Open it from the list: the FAB "New medic" opens it empty, and the row "Edit" button opens it with the medic loaded.
* Remove the `new` and `edit/:id` child routes of `pages/medic`, and the `<router-outlet>` in the list.
* Refresh the list and notify after a successful save.

Out of scope:

* Backend: no changes. The contract, `multipart/form-data` and the photo upload stay the same.
* `Medic` model, `MedicService`, `MedicStore`, `MedicEditStore`, `MedicForm`, `SpecialtyStore`, `NotificationService` and `ConfirmDialogComponent`: reuse them without modifying them.
* The Exam, Specialty and Patient screens keep their child routes.

## Decisions

**The dialog does not reload the list or notify. It closes with `true`, and the parent does both.**
`MatDialog` creates the dialog from its own (root) injector, so the dialog cannot reach the `MedicStore` that `MedicComponent` provides in its `providers`. `MedicComponent` already owns the snackbar effect and the delete flow, so it also handles `afterClosed()` for create and edit.

**The component keeps its name and location** (`pages/medic/medic-edit/medic-edit.component.*`). This keeps the diff small.

**The id comes through `MAT_DIALOG_DATA`** (`{ idMedic: number | null }`), not through route params. `null` means create.

**Each dialog gets a fresh form.** `providers: [MedicForm, MedicEditStore, SpecialtyStore]` stays on the component, so each `open()` starts with a new form and a new store.

## Expected Files

Paths are relative to `mediapp-frontend/src/app/`.

1. `pages/medic/medic-edit/medic-edit.component.ts`
   * Export `interface MedicDialogData { idMedic: number | null }`.
   * Inject `MAT_DIALOG_DATA` (typed `MedicDialogData`) and `MatDialogRef<MedicEditComponent, boolean>`.
   * Remove `ActivatedRoute`, `Router`, `RouterLink`, `toSignal`, `$params`, and the `MedicStore` / `NotificationService` injections.
   * `$id = signal<number | null>(data?.idMedic ?? null)` and `$isEdit = computed(() => this.$id() !== null)`.
   * Keep the two effects as they are: `medicEditStore.setId(...)`, and `medicForm.patch(...)` when the resource has a value.
   * `operate()`: same validation and the same `update(id, medic, file)` / `save(medic, file)` calls. On success it only calls `this.dialogRef.close(true)`.
   * Keep the photo logic unchanged (`MAX_PHOTO_SIZE`, `$file`, `$fileError`, `onFileSelected`).
   * Add `MatDialogModule` to `imports`.
2. `pages/medic/medic-edit/medic-edit.component.html`
   * `<form [formRoot]="medicForm.$form" (submit)="operate()">` wraps:
     * `<h2 mat-dialog-title>` showing `Edit medic` or `New medic`, depending on `$isEdit()`.
     * `<mat-dialog-content>` with all the current fields (ID, SPECIALTY, FIRST NAME, LAST NAME, CMP) and the photo block, unchanged.
     * `<mat-dialog-actions align="end">` with Cancel (`type="button" [mat-dialog-close]="false"`) and OK (`type="submit"`, the same `[disabled]="medicForm.isInvalid() || !!$fileError()"`).
3. `pages/medic/medic-edit/medic-edit.component.css`: change it only as needed for the dialog, for example form fields at full width inside `mat-dialog-content`.
4. `pages/medic/medic.component.ts`
   * Add `openDialog(idMedic: number | null = null)`:
     ```ts
     this.dialog.open<MedicEditComponent, MedicDialogData, boolean>(MedicEditComponent, {
       data: { idMedic }, width: '520px', maxWidth: '95vw'
     }).afterClosed().pipe(
       filter(saved => saved === true),
       tap(() => {
         this.medicStore.reload();
         this.notificationService.notify(idMedic ? 'UPDATED' : 'CREATED');
       })
     ).subscribe();
     ```
   * Remove `RouterOutlet` and `RouterLink` from `imports`. Leave `delete()` unchanged.
5. `pages/medic/medic.component.html`
   * Remove `<router-outlet></router-outlet>`.
   * Edit button: `(click)="openDialog(row.idMedic)"` instead of `[routerLink]`.
   * FAB: `(click)="openDialog()"` instead of `routerLink`. Keep `aria-label="New medic"`.
6. `app.routes.ts`: `{ path: 'pages/medic', component: MedicComponent }` with no children. Remove the `MedicEditComponent` import.

## Acceptance Criteria

Legend: `[x]` = verified in the session that implements this fix; `[ ]` = implemented but not exercised at runtime (see Part 2 → Verification).

* [ ] The "New medic" FAB opens an empty dialog titled "New medic". — Implemented: FAB `(click)="openDialog()"`, title bound to `$isEdit()`; type-checked by AOT build (not run at runtime; no browser in the implementing session).
* [ ] "Edit" opens the dialog titled "Edit medic", with the medic loaded: specialty, names, CMP and current photo. — Implemented: `openDialog(row.idMedic)` → `MAT_DIALOG_DATA` → `$id` → existing `setId`/`patch` effects; compiled (not run at runtime; no browser in the implementing session).
* [ ] OK saves (with or without a new photo), closes the dialog, refreshes the list and shows the CREATED/UPDATED snackbar. — Implemented: `operate()` closes with `true`; `afterClosed()` filters `true`, then `medicStore.reload()` + `notify(...)`; compiled (not run at runtime; no browser in the implementing session), no backend running.
* [ ] Cancel, Esc or a click on the backdrop closes the dialog without saving, reloading or notifying. — Implemented: Cancel uses `[mat-dialog-close]="false"`; Esc/backdrop close with `undefined`; both are dropped by `filter(saved => saved === true)` (not run at runtime; no browser in the implementing session).
* [ ] Field validations, the photo type/size check and the disabled OK button behave as before. — Fields, photo logic and `[disabled]` copied unchanged; `MedicForm` untouched (not run at runtime; no browser in the implementing session).
* [ ] `/pages/medic/new` and `/pages/medic/edit/:id` no longer exist, and `/pages/medic` still renders the list. — Children removed from `app.routes.ts`; compiled (not run at runtime; no browser in the implementing session).
* [ ] Focus moves into the dialog when it opens and returns to the button that opened it when it closes (WCAG AA). — Relies on `MatDialog` defaults (focus trap, `restoreFocus: true`); no custom focus code (not run at runtime; no browser in the implementing session).
* [ ] Delete with confirmation still works. — `delete()` unchanged (not run at runtime; no browser in the implementing session).
* [ ] `npm run build` and `npm test` pass. — [x] `npm run build` passes (exit 0). `npm test` fails (exit 1, 2/2 tests in `app.spec.ts`) on a pre-existing issue unrelated to this fix; see Part 2 → Verification.

---

# Part 2 — Implementation

> Fill this in after implementing. Separate what was compiled or built from what was exercised at runtime (in a browser or against the backend).

## Files

Paths are relative to `mediapp-frontend/src/app/`.

* `pages/medic/medic-edit/medic-edit.component.ts`: exports `MedicDialogData`; injects `MAT_DIALOG_DATA` and `MatDialogRef<MedicEditComponent, boolean>`; `$id` is a `signal` built from the dialog data; router, `toSignal`, `MedicStore` and `NotificationService` are removed; `operate()` only calls `dialogRef.close(true)` on success; adds `MatDialogModule`. The photo logic and `providers` are unchanged.
* `pages/medic/medic-edit/medic-edit.component.html`: `<form [formRoot]>` wraps `mat-dialog-title` (New/Edit medic), `mat-dialog-content` (same fields and photo block) and `mat-dialog-actions align="end"` (Cancel `[mat-dialog-close]="false"`, then the OK submit button with the same `[disabled]`).
* `pages/medic/medic.component.ts`: adds `openDialog(idMedic = null)` with `afterClosed()` → `filter` → `tap(reload + notify)`; removes `RouterOutlet`/`RouterLink`. `delete()` is unchanged.
* `pages/medic/medic.component.html`: removes `<router-outlet>`; Edit → `(click)="openDialog(row.idMedic)"`; FAB → `(click)="openDialog()"` (keeps `aria-label="New medic"`).
* `app.routes.ts`: `pages/medic` has no children; the `MedicEditComponent` import is removed.

## Deviations from Part 1

* `medic-edit.component.css` is **unchanged**. The existing `example-container` class (flex column, children at 100% width) moved from `<form>` to `<mat-dialog-content>`, so the fields are full width inside the dialog without new CSS.
* In `mat-dialog-actions`, Cancel comes before OK (the usual dialog order, as in `ConfirmDialogComponent`). Both buttons keep their existing labels, icons and classes.
* Otherwise none.

## Verification

Compiled and built in this session:

* `npm run build` (in `mediapp-frontend/`): **exit 0**, AOT template type-checking included. One warning: `bundle initial exceeded maximum budget. Budget 500.00 kB was not met by 404.14 kB with a total of 904.14 kB` (bundle size budget; not caused by this fix, which only removes and moves code).
* `.\mvnw.cmd -q clean package -DskipTests` (in `mediapp-backend/`, backend unchanged): **exit 0**. JDK warnings only: `sun.misc.Unsafe::objectFieldOffset` called by `lombok.permit.Permit`.

Run at runtime in this session:

* `npm test -- --watch=false` (Vitest): **exit 1**. 1 test file, 2 of 2 tests failed, both in `src/app/app.spec.ts` (`should create the app`, `should render title`): `NG0201: No provider found for ActivatedRoute` from `RouterLink` in `pages/layout/layout.component` (imported by `App`). The scaffold spec does not provide the router, and it still expects the default `Hello, mediapp-frontend` `<h1>`. This was already failing before this fix and is unrelated: the spec does not touch the medic page or the routes, and no medic specs exist. It was left unfixed because it is out of scope.

Not exercised in this session (no browser, no backend/database running):

* Opening, cancelling (button/Esc/backdrop) and submitting the dialog; loading a medic for edit; photo upload; list reload and the snackbar; focus trap/restore; delete flow; the absence of the removed routes at navigation time.
