# Consult Wizard — Claude Design

| | |
| --- | --- |
| **Status** | Implemented |
| **Date** | 2026-11-02 |
| **Scope** | `mediapp-frontend` (backend reused as is) |
| **Design** | https://claude.ai/code/artifact/ba2b982c-0c1c-4142-a1f6-80344264e0b1 (local copy: `../resources/design-main.dc.html`) |
| **Affects** | `ConsultWizardDesignComponent`, `ConsultWizardDesignForm`, `ConsultWizardDesignStore`, `app.routes.ts`, `layout.component.html` |
| **Depends on** | `wizard` feature (`POST /v1/consults`, `ConsultService.saveTransactional`) |

> Part 1 is the specification; Part 2 records what was implemented and verified.

---

# Part 1 — Specification

## Problem

The `wizard` feature already registers a consult in one transactional request, but its screen is a
functional Material layout. A new visual design, **"Wizard · Alta de Atención Médica"**, was drawn in
Claude Design (a canvas artifact). It reorganizes the same flow into three cleaner steps, picks a
**consultorio** visually instead of a numeric grid, and ends on a success panel.

## Goal

A second wizard screen, `pages/consult-wizard-design`, that matches the Claude Design artboard as
closely as Angular Material allows, and saves through the **existing** `POST /v1/consults` endpoint.
The existing `pages/consult-wizard` screen stays untouched; both wizards live side by side.

## UI Rules

* The reference is the artboard `Main.dc.html` of the design artifact above. A copy is kept in
  `../resources/design-main.dc.html`; read it for exact copy, colors, spacing and states.
* Build it with **this codebase's components** (Angular Material + Signal Forms), not with the
  design's raw `<select>`, `<input>` and `<button>` markup. Restyle Material through its CSS tokens
  (`--mat-*` / `--mdc-*` custom properties) scoped to the component, not with `::ng-deep` overrides
  on internal classes.
* UI copy is Spanish and is taken literally from the design.

### Design tokens (from the artboard)

| Token | Value | Use |
| --- | --- | --- |
| Font | `Inter` 400–800 (Google Fonts) | Whole screen |
| Page background | `#F3F6F8` | Behind the cards |
| Surface | `#FFFFFF`, border `1px #E2E8F0` | Stepper bar (radius 16px), step cards (radius 20px, padding 32px) |
| Primary (teal) | `#0D9488`, hover `#0F766E` | Active step, primary buttons, checkboxes, selected consultorio |
| Primary soft | `#CCFBF1` / `#F0FDFA` | Completed step circle, selected card bg, exam chips |
| Text | `#0F172A` title, `#334155` labels, `#64748B` secondary, `#94A3B8` muted | |
| Field border | `#CBD5E1`, radius 10px, height 44px | Inputs and selects |
| Disabled button | `#CBD5E1` | Next while the step is incomplete |
| Layout | centered column, `max-width: 860px`, gap 28px, padding `48px 24px 96px` | |

### Screen layout

**Header.** `h1` "Nueva atención médica" (28px / 800) and subtitle "Registra los datos clínicos,
elige el consultorio y confirma el alta."

**Stepper bar.** White rounded bar with three steps joined by 2px lines. Each step: a 36px circle
(number, or a check when completed) + an uppercase "PASO N" label + the step title:
1. *Datos de la atención* · 2. *Consultorio* · 3. *Resumen y confirmación*.
States: active = teal circle, white number, teal label; completed = soft-teal circle with a check,
the line before the next step turns teal; pending = white circle, grey border and grey label.
A completed step can be clicked to go back to it; a pending one cannot.
Implement with a **linear `mat-stepper`** (horizontal, custom header styling via tokens). Use
`matStepperIcon` templates for the number / check.

**Step 1 — Datos de la atención** (card, subtitle "Médico, paciente, diagnóstico y exámenes
solicitados.")
* Row of two `mat-select`: **Médico** (label `primaryName surname — nameSpecialty`) and **Paciente**
  (label `firstName lastName — DNI dni`). Placeholders "Seleccionar médico…" / "Seleccionar paciente…".
* **Fecha de atención**: `mat-datepicker`, max width 280px, `[min]` = today.
* Row of two textareas: **Diagnóstico** (placeholder "Ej. Hipertensión arterial leve", max 70) and
  **Tratamiento** (placeholder "Ej. Losartán 50mg cada 24h por 30 días", max 150), 4 rows, with a
  `mat-hint` character counter.
* **Exámenes solicitados**: two-column grid of `mat-checkbox`, one per exam from `GET /v1/exams`.
* Footer, right-aligned: **"Siguiente: Consultorio"** (teal, disabled grey until valid).

**Step 2 — Selecciona el consultorio** (subtitle "Elige visualmente dónde se realizará la atención.")
* Three-column grid of selectable cards (6 consultorios). Each card: a 38px rounded icon square with a
  building stroke icon, the name (15px / 700), "Piso · Área" (12.5px), a divider and an equipment
  line. Selected card: 2px teal border, `#F0FDFA` background, teal icon square with white icon, and
  a teal check-circle at the top right. Only one can be selected.
* Each card is a real `<button>` (or `mat-card` inside a radio group) with `aria-pressed` /
  `role="radio"` so it works with the keyboard.
* Footer: **"Atrás"** (white, bordered) on the left, **"Siguiente: Resumen"** on the right,
  disabled until a consultorio is chosen.

**Step 3 — Resumen de la atención** (subtitle "Verifica los datos antes de confirmar el alta.")
* Two-column read-only grid of uppercase muted labels + values: Médico, Paciente, Fecha de atención
  (formatted `d 'de' MMMM 'de' y`, locale `es`), Consultorio; then full-width Diagnóstico,
  Tratamiento and Exámenes solicitados as teal pill chips (`mat-chip-set`, non-interactive), or
  "No se solicitaron exámenes." when none.
* Footer: **"Atrás"** and **"Confirmar atención"** (teal). While saving, the button is disabled.

**Success panel.** After a `201`, the stepper and cards are replaced by a centered white card: a
64px soft-teal circle with a teal check, "Atención registrada", the sentence "La atención de
**{paciente}** con **{médico}** quedó agendada en **{consultorio}** el {fecha}." and a teal button
**"Registrar otra atención"** that resets form, selections and stepper to step 1.

At phone width the two- and three-column grids stack into one column, and the stepper bar wraps or
switches to Material's vertical orientation.

## Scope

In scope:

* New lazy route `pages/consult-wizard-design` → `ConsultWizardDesignComponent`.
* New sidenav entry in `pages/layout/layout.component.html` ("Register Consult D.") pointing at it,
  next to the existing "Register Consult W." button.
* New component, Signal Forms class and store; reuse `ConsultService.saveTransactional` and the
  existing models.
* A frontend constant list of consultorios.

Out of scope:

* Any change to `pages/consult-wizard/*`, `ConsultWizardStore`, `ConsultWizardForm` or the backend.
* A `Consultorio` entity, table or endpoint.
* Several diagnosis/treatment lines: the design captures **one** detail per consult.
* Editing, listing or deleting consults. Authentication (`idUser` stays fixed).

## Data mapping (design → existing contract)

The design was drawn against mock data. Its fields map onto the existing `ConsultListExamDTO`
without any backend change:

| Design | Payload field | Rule |
| --- | --- | --- |
| Médico | `consult.medic` | Whole `Medic` from `GET /v1/medics` |
| Paciente | `consult.patient` | Whole `Patient` from `GET /v1/patients` |
| Fecha de atención | `consult.consultDate` | `formatDate(d, "yyyy-MM-dd'T'HH:mm:ss", 'en-US')`, never `toISOString()` |
| Diagnóstico + Tratamiento | `consult.details[0]` | Exactly one `{ diagnosis, treatment }` |
| Exámenes (checkboxes) | `lstExam` | Whole `Exam`s that are checked; empty array allowed |
| Consultorio | `consult.numConsult` | The room code (`"101"`, `"102"`, `"201"`, `"202"`, `"301"`, `"302"`) |
| — | `consult.idUser` | `DEFAULT_USER_ID = 1` constant with a TODO |

## Decisions

**The consultorio is the consult number.**
`Consult.numConsult` is `@Column(length = 3)` and the six rooms in the design have three-digit codes,
so the room code is stored directly. The rooms are a typed constant in
`pages/consult-wizard-design/consultorios.ts` (`{ code, name, floor, area, equipment }`), copied from
the design's mock data. No backend change, no new table.

**Treatment is required, unlike the design.**
The design only gates step 1 on médico, paciente, fecha and diagnóstico. `ConsultDetailDTO.treatment`
is `@NotBlank`, so the form also requires treatment; otherwise the confirm button would lead to a
`400`. This is a deliberate deviation from the artboard.

**Medic label needs the specialty name.**
`Medic` only carries `idSpecialty`. The store also loads `GET /v1/specialties` and the component
resolves `nameSpecialty` with a `computed` map. If the specialty is not found, the label falls back to
`CMP cmpMedic`.

**Own store, not the existing one.**
`ConsultWizardDesignStore` declares its own `httpResource`s (patients, medics, exams, specialties).
`ConsultWizardStore` is left untouched so the two wizards evolve independently.

**Material, restyled — not hand-rolled controls.**
The look is matched with component-scoped CSS tokens on `mat-stepper`, `mat-form-field` (outlined,
radius 10px), `mat-checkbox` and buttons. Class bindings (`[class.selected]`), not `ngClass`, follow
the frontend `CLAUDE.md`.

**Inter font.**
Loaded with a Google Fonts `<link>` in `index.html` only if the global font is not already Inter;
otherwise scoped to this component's host via `font-family`. Do not change the global Material
typography for the rest of the app.

## Validation (client side)

| Gate | Condition |
| --- | --- |
| Step 1 → 2 | medic, patient and date set; diagnosis 1–70 chars, treatment 1–150 chars (trimmed) |
| Step 2 → 3 | a consultorio is selected |
| Confirm | all of the above and not already saving |

Errors are shown with `mat-error` under each field after it is touched. A failed save shows a
`MatSnackBar` with the backend message and keeps the user on step 3 with the data intact.

## Expected Files

Frontend (`mediapp-frontend/src/app/`):

* `pages/consult-wizard-design/consult-wizard-design.component.{ts,html,css}`
* `pages/consult-wizard-design/consultorios.ts`
* `pages/forms/consult-wizard-design.form.ts`
* `store/consult-wizard-design.store.ts`
* `app.routes.ts` — new `loadComponent` route
* `pages/layout/layout.component.html` — new sidenav button

Reused without modification: `ConsultService`, `PatientService`, `MedicService`, `ExamService`,
`SpecialtyService`, `GenericService`, models `consult.ts`, `consult-detail.ts`,
`consult-list-exam-dto.ts`.

## Acceptance Criteria

Mark each one **[build]** (compiled / AOT type-checked), **[HTTP]** (exercised against a running
backend) or **[browser]** (clicked in a browser) when verified.

Status after implementation: nothing was run in a browser and no HTTP call was made, so **no
criterion is ticked**. The notes say what only compiled (**[build]**, AOT type-checked by
`ng build --configuration development`).

* [ ] The new sidenav entry opens `/pages/consult-wizard-design`; `/pages/consult-wizard` still works unchanged. —
      **[build]** the sidenav button and the `loadComponent` route compile, and the build emits the lazy chunk
      `consult-wizard-design-component`. `pages/consult-wizard/*` was not edited. Not clicked.
* [ ] Step 1 lists medics (with specialty name), patients and exams from the backend. — **[build]** only
      (4 `httpResource`s in `ConsultWizardDesignStore`; `medicLabel()` resolves `nameSpecialty` with a `computed` map,
      falling back to `CMP cmpMedic`).
* [ ] "Siguiente: Consultorio" stays disabled until medic, patient, date, diagnosis and treatment are valid. —
      **[build]** only (`[disabled]="!wizardForm.isStep1Valid()"` + `[completed]` on a linear `mat-stepper`).
* [ ] Diagnosis over 70 or treatment over 150 characters cannot be submitted. — **[build]** only (`maxLength`
      70 / 150 in the schema; both block step 1 and `$canSave()`). Typing past the limit is not blocked.
* [ ] The stepper header shows active / completed (check) / pending states with the design's colors. —
      **[build]** only; see *Deviations* for the connecting lines.
* [ ] Selecting a consultorio highlights only that card; it is reachable and selectable with the keyboard. —
      **[build]** only (single `numConsult` value, native `<button type="button">` with `aria-pressed`, so Tab +
      Enter/Space work without extra handlers).
* [ ] "Siguiente: Resumen" stays disabled until a consultorio is chosen. — **[build]** only
      (`!wizardForm.isStep2Valid()`).
* [ ] The summary shows every value, the date in Spanish long format, and the "No se solicitaron exámenes." fallback. —
      **[build]** only.
* [ ] "Confirmar atención" sends one `POST /v1/consults` whose `numConsult` is the room code and whose `details` has exactly one item; the backend answers `201`. —
      **[build]** only. The payload is built with `numConsult = room.code` and a one-item `details` array. No
      HTTP call was made.
* [ ] The success panel names patient, medic, consultorio and date; "Registrar otra atención" returns to an empty step 1. —
      **[build]** only.
* [ ] A backend error shows a snackbar and keeps the entered data. — **[build]** only (the `error` callback opens a
      `MatSnackBar` with `err.error.message` and does not reset the form).
* [ ] At ~390px width every grid collapses to one column with no horizontal scroll. — **[build]** only (media query
      `max-width: 720px` + `BreakpointObserver` switches the stepper to vertical). Not measured.
* [ ] `npm run build` succeeds. — **Not met.** The production build compiles all code, then **fails on the
      *initial* bundle budget** (1.16 MB > 1 MB error). The same failure happens with this feature's route
      removed, so it is caused by an earlier change, not by this feature (see *Open issues*).
      `ng build --configuration development` succeeds (**[build]**).

## Prerequisite

Same as the `wizard` feature: a reachable database, a `user_data` row with `id_user = 1`, and at
least one patient, medic, specialty and exam.

---

# Part 2 — Implementation

## What was found

* The `wizard` feature provides everything this screen needs: `ConsultService.saveTransactional`, the
  `Consult` / `ConsultDetail` / `ConsultListExamDTO` models, and `SpecialtyService` for the specialty
  names. No backend change was needed.
* The global font is **Roboto** (`index.html` + `mat.theme(... typography: Roboto)`), and no locale is
  registered anywhere (no `registerLocaleData`, no `LOCALE_ID`).
* Material 22's `FormField` provides an `NgControl` interop, and Material's error-state tracker reads
  Signal Forms state, so `<mat-error>` inside `mat-form-field` works with `[formField]`.
* `mat-stepper` gives **edit** state to a completed, editable, unselected step, and **number** state to
  the selected step and to pending ones. The `matStepperIcon="number"` context's `active` flag tells
  selected from pending in a linear stepper.
* `app.routes.ts` was changed during the session, outside this feature: `pages/consult-wizard` is now
  registered eagerly (`component: ConsultWizardComponent`) rather than with `loadComponent`, as the
  `wizard` spec records. That route was kept as it is.

## Changes

Frontend (`mediapp-frontend/src/`):

* `app/pages/consult-wizard-design/consultorios.ts`: `Consultorio` interface + `CONSULTORIOS`
  constant (codes `101`–`302`, copied from the design's mock data).
* `app/store/consult-wizard-design.store.ts`: `@Service({ autoProvided: false })` with four
  `httpResource`s (patients, medics, exams, specialties).
* `app/pages/forms/consult-wizard-design.form.ts`: Signal Forms class. One model holds the whole
  wizard: `idMedic`, `idPatient`, `consultDate`, `diagnosis`, `treatment`, `idExams: number[]` and
  `numConsult`. It applies `required` to every field except `idExams`, `maxLength` 70 / 150, and a
  `validate()` that rejects whitespace-only diagnosis or treatment. `isStep1Valid()` and `isStep2Valid()`
  gate the steps, and the class has `toggleExam`, `selectConsultorio` and `reset` helpers.
* `app/pages/consult-wizard-design/consult-wizard-design.component.{ts,html,css}`: linear
  `mat-stepper` with `matStepperIcon` templates (`number`, `edit`, `done`) and `matStepLabel`
  templates ("PASO N" + title). Step 1 uses outlined `mat-form-field`s with labels above them, as in the
  design, plus `mat-select`, `mat-datepicker` (`[min]` = today), textareas with a `mat-hint` counter, and a
  `fieldset` of `mat-checkbox`. Step 2 has six consultorio `<button aria-pressed>` cards in a `role="group"`.
  Step 3 is a `<dl>` summary with `mat-chip-set` pills. After `201`, a success panel replaces the
  stepper. It also defines a `DEFAULT_USER_ID = 1` constant, a `$saving` flag, and an error `MatSnackBar`.
  The styling is component-scoped CSS custom properties on `:host` (`--mat-sys-primary`, `--mat-stepper-*`,
  `--mat-form-field-*`, `--mat-checkbox-*`, `--mat-button-*`, `--mat-chip-*`). There is no `::ng-deep` and no
  `ngClass`.
* `app/app.routes.ts`: new lazy route `pages/consult-wizard-design` (`loadComponent`).
* `app/pages/layout/layout.component.html`: sidenav button "Register Consult D." (icon
  `design_services`) right after "Register Consult W.".
* `index.html`: Google Fonts `<link>` for Inter 400–800. The global Material typography is unchanged.
  Inter is applied only through `font-family` and the `--mat-sys-*-font` tokens on this component's host.

Unchanged: `pages/consult-wizard/*`, `ConsultWizardStore`, `ConsultWizardForm`, all services and
models, and the backend.

## Deviations from Part 1

* **Spanish date: helper, not `registerLocaleData`.** No locale is registered in the app, so
  `toSpanishLongDate()` formats `d de MMMM de y` with a 12-month array (the same output as
  `formatDate(d, "d 'de' MMMM 'de' y", 'es')`). This avoids a global side effect for one screen.
  The payload date still uses `formatDate(..., "yyyy-MM-dd'T'HH:mm:ss", 'en-US')`.
* **Stepper connecting lines stay grey and 1px.** The design's 2px lines that turn teal after a completed
  step have no Material token (`--mat-stepper-line-color` sets one color for all lines, and the width is
  fixed in Material's CSS). They would need `::ng-deep`, which the spec forbids. Circles and labels match.
* **36px step circles are drawn by our own template.** Material's icon box is a fixed 24px circle, so its
  background tokens are set to `transparent` and the `matStepperIcon` templates render a 36px
  `.step-circle`. It overflows the 24px box visually, which the header padding absorbs.
* **The white stepper bar is a `::before` on a wrapper div** (header height from
  `--mat-stepper-header-height: 76px`), and the step cards use a `-24px` side margin to cancel Material's
  horizontal content padding. Both apply only in horizontal orientation.
* **Phone layout**: at `max-width: 720px` (`BreakpointObserver`), the stepper switches to Material's
  vertical orientation and every grid collapses to one column.
* **Contrast**: the design's `#94A3B8` muted text fails WCAG AA on white. It was darkened to `#64748B`
  for the summary labels, the equipment line and "No se solicitaron exámenes.". It stays `#94A3B8` for
  placeholders and the pending-step kicker (an inactive control).
* **Success panel copy**: patient and medic appear by name only (`firstName lastName`,
  `primaryName surname`). The consultorio appears as `Consultorio N · Piso N · Área`, as in the design.
  The summary shows the patient as `Nombre Apellido (DNI x)` (design) and the select shows
  `— DNI x` (spec).
* Validation messages (`mat-error`) are Spanish copy written for this screen, because the design has none.
  The date field placeholder is `MM/DD/AAAA`, because the native date adapter parses `en-US`.
* `subscriptSizing="dynamic"` is set on every form field so that unused hint space does not break the
  design's spacing.

## Verification

* Backend build: `./mvnw clean package -DskipTests` gave `BUILD SUCCESS` (53 sources; only the usual
  Lombok `sun.misc.Unsafe` JVM warnings). No backend file was touched. Tests were skipped (context-load
  test needs a database).
* Frontend `npm run build` (production): compilation and AOT type-check passed, and the screen is the
  lazy chunk `consult-wizard-design-component` (91.10 kB raw / 16.31 kB transfer). The command then
  **failed** with `bundle initial exceeded maximum budget ... 1.16 MB` (error budget 1 MB). Warnings:
  initial bundle over the 500 kB warning budget, and
  `consult-wizard-design.component.css exceeded maximum budget. Budget 4.00 kB was not met by 2.31 kB
  with a total of 6.31 kB` (a warning: under the 8 kB error budget).
* Control experiment: with this feature's route temporarily removed, `npm run build` failed identically
  (initial total 1.16 MB). The budget error predates this feature. The route was restored right after.
* `ng build --configuration development` (same compiler, no budgets) gave
  `Application bundle generation complete`, with no errors or warnings.
* Runtime: **nothing** was exercised. No dev server, browser, backend process or database was used.

## Open issues

* **Production build fails on the initial budget** because `pages/consult-wizard` (and the other pages)
  are imported eagerly in `app.routes.ts`. Restoring `loadComponent` for `pages/consult-wizard` (as the
  `wizard` spec records), or raising the budget in `angular.json`, would fix it. Neither was done,
  because both are outside this feature's scope.
* Component CSS is 6.31 kB, over the 4 kB warning budget. It could be trimmed, or moved partly to a
  shared stylesheet, if the warning matters.
* The datepicker's `[min]` blocks past days in the calendar. Whether a past date typed by hand turns
  into a field error depends on the `NG_VALIDATORS` interop of `FormField`, and was not verified at runtime.
* The connecting-line color/width deviation above needs either a Material token in a future version or
  an accepted `::ng-deep` exception.
* Everything in the Acceptance Criteria still needs an [HTTP] / [browser] pass with the prerequisite data.
