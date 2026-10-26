---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# Forms (react-hook-form + zod)

References: `src/pages/login/` (`model/login-form-schema.ts`, `ui/login-form-section.tsx`),
`src/features/change-password/` (`model/change-password-schema.ts`,
`ui/change-password-form.tsx`) and `src/pages/example-items/ui/example-item-form.tsx`.

## Schema and setup

- The zod schema lives in the slice's `model/` (`<noun>-form-schema.ts` or
  `<noun>-schema.ts`) and is applied with `useForm({ resolver: zodResolver(schema), defaultValues })`.
  Derive the form type with `z.infer<typeof schema>`; never hand-write it.
- Validation messages come from `messages` (`@/shared/i18n`); limits are named
  constants exported next to the schema (`NAME_MAX_LENGTH`).
- When the schema needs runtime input, export a factory and infer from its
  return type (`createChangePasswordSchema({ username })`,
  `z.infer<ReturnType<typeof createChangePasswordSchema>>`). Rules shown to the
  user and rules in the schema come from one source (`evaluatePasswordPolicy`).
- Always pass `defaultValues` (empty strings, or the record being edited).
  Switch between create and edit by remounting with a `key`, not by `reset()` in
  an Effect (`<ExampleItemForm key={…} item={…} />`).

## Inputs

- Native inputs are plain HTML wired with `register`: spread `{...register('name')}`
  onto `<input>`/`<textarea>`. Give each field `<label htmlFor>`, an id from
  `useId()`, `aria-invalid` when it has an error and `aria-describedby` pointing
  to the `<p role="alert">` that shows `errors.<field>.message`.
- A repeated field becomes a small local component that takes
  `ComponentProps<'input'>` plus `label` and `error` and receives the
  `register(...)` result by spreading (`PasswordField`, login `Field`). Promote
  it only when a second slice needs it.
- Forms set `noValidate`: zod is the single source of validation messages.
- A custom controlled input (select, date picker, anything not a native input)
  uses `useController` / `<Controller>`, never `register`. None exists yet; the
  first one should take a `name` prop and own its label/error markup like the
  native fields do.
- If a form is split across several components, wrap it in
  `<FormProvider {...methods}>` and read it with `useFormContext()` in the
  children; do not pass `control`/`register` through props.
- Live derived UI (rule checklists, enabling the submit button) reads values
  with `useWatch`, computed during render. No `watch` + `useEffect` chains.

## Submit and errors

- `handleSubmit(onSubmit)` calls a submit hook in `model/`
  (`use-<verb>-<noun>-submit.ts`) or the page's mutation hooks directly when the
  flow is one call (`example-item-form.tsx`).
- Server 422 field errors: `fieldErrorsFromApi(error.errors)`
  (`@/shared/lib/form-errors`) returns `{ path, message }` with paths already
  converted by `toRhfPath` (`items[0].x` → `items.0.x`). Guard the path against
  the form's own field names (`isField`), then `setError(path, { message })`.
- Other field-level server errors (wrong current password, weak password) also
  go to `setError`; the submit hook returns an outcome union and the form maps
  it (`ChangePasswordOutcome`).
- General failures go through `notify`/`notifyApiError` (`@/shared/lib/notify`)
  or a `role="alert"` message in the form; never from `requests.ts`.
- Disable the submit button while pending and show the pending label from `messages`.
- Mutations whose variables carry passwords set `gcTime: 0`.
- Leaving a page with unsaved changes: `useLeaveConfirm` / `useBeforeUnload`
  (`@/shared/lib/hooks`).

## Project bindings (fill in per project)

- UI library form components: none yet. When the project adds one (README,
  "Thêm UI cho dự án"), record here where the form-bound wrappers live and
  which component is the reference implementation; keep presentational
  primitives form-agnostic and wrap them.
- Dialog with a form: none yet (`example-item-form.tsx` is inline,
  confirmations use `window.confirm`). Record the dialog wrapper here when added.
- Schema location: `model/` of the owning slice (see `react-query-layering.md`).

## Checklist

- [ ] Schema in `model/`, applied with `zodResolver`; form type is `z.infer<…>`
- [ ] Every field has a label, `aria-invalid`, `aria-describedby` → `role="alert"` error
- [ ] Native inputs use `register`; custom inputs use `useController`/`Controller`
- [ ] Split forms use `FormProvider`/`useFormContext`, no `control`/`register` props
- [ ] 422 field errors mapped with `fieldErrorsFromApi` + `setError`; general errors via `notify`
- [ ] Password-carrying mutations set `gcTime: 0`
