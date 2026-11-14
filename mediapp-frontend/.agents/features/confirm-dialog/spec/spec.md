# Confirm Dialog Component

|             |                          |
| ----------- | ------------------------ |
| **Status**  | Draft            |
| **Date**    | 2026-28-10               |
| **Scope**   | `app/shared/components`  |
| **Affects** | `ConfirmDialogComponent` |

> Specification for a reusable Angular Material confirmation dialog component.

---

# Part 1 — Specification

*Written before implementation.*

## Problem

Multiple features require asking the user for confirmation before executing destructive actions such as deleting records. Recreating the dialog in every feature leads to duplicated code and inconsistent behavior.

## Goal

Provide a reusable Angular Material dialog component that displays a confirmation message and returns the user's decision (`true` or `false`) to the caller.

## Scope

In scope:

* Reusable standalone Angular component.
* Located under `src/app/shared/components/confirm-dialog`.
* Uses Angular Material `MatDialog`.
* Returns `true` when the user confirms.
* Returns `false` when the user cancels.

Out of scope:

* Custom titles or messages.
* Icons or illustrations.
* Internationalization (i18n).
* Passing custom button labels.
* Styling beyond the default Angular Material appearance.

## Decisions

**The component is implemented as a standalone component.**
No Angular module declaration is required, making it easier to import wherever it is needed.

**The template is defined inline instead of using a separate HTML file.**
The component is small enough that an inline template improves readability and keeps the implementation self-contained.

**The dialog returns boolean values.**
`true` indicates confirmation and `false` indicates cancellation, providing a simple and predictable contract.

**`MatDialogRef` is obtained using `inject()`.**
This follows the modern Angular dependency injection style and avoids constructor injection.

**The Delete button uses `cdkFocusInitial`.**
Keyboard focus is placed on the primary action when the dialog opens.

## Contract

The component exposes no inputs or outputs.

Behavior:

| User Action                 | Dialog Result |
| --------------------------- | ------------- |
| Click **Delete**            | `true`        |
| Click **Cancel**            | `false`       |
| Close through `onNoClick()` | `false`       |

Consumers open the dialog through `MatDialog` and subscribe to the value returned by `afterClosed()`.

## Acceptance Criteria

* [x] The component exists under `src/app/shared/components/confirm-dialog`.
* [x] The component is standalone.
* [x] The selector is `app-confirm-dialog`.
* [x] The template uses Angular Material dialog directives.
* [x] Clicking **Cancel** closes the dialog with `false`. <!-- implemented via `onNoClick()` -> `dialogRef.close(false)` -->
* [x] Clicking **Delete** closes the dialog with `true`. <!-- implemented via `[mat-dialog-close]="true"` -->
* [x] The Delete button receives initial keyboard focus in code. <!-- `cdkFocusInitial` is present on the Delete button; this reflects the attribute being set, not a browser-verified focus observation -->
* [x] The component compiles without additional configuration. <!-- verified with `npm run build` (ng build); build succeeded, only a pre-existing bundle-size budget warning unrelated to this component was reported -->
* [x] The component follows the Angular Material defaults used elsewhere in this codebase. <!-- no `design.md` exists in the repository and no `medic-dialog` precedent exists either; the component matches the Angular Material import/usage conventions already present in `src/app/pages/exam` (MatButtonModule, Material directives) -->

## Expected Implementation

```text
src/
└── app/
    └── shared/
        └── components/
            └── confirm-dialog/
                └── confirm-dialog.component.ts
```

The generated component should contain:

* Selector: `app-confirm-dialog`
* Standalone component
* Imports:

  * `MatDialogModule`
  * `MatButtonModule`
* Inline template
* `MatDialogRef` injected using `inject()`
* `onNoClick()` method that closes the dialog with `false`
* Delete button using `[mat-dialog-close]="true"` and `cdkFocusInitial`

---