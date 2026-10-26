---
paths:
  - "src/**/*.tsx"
---

# React Component Design & Props

Rules for designing React components and managing props. They apply to AI
agents when generating or reviewing code, and to developers in code review.

## 1. Prop count

| Props | Verdict |
|---|---|
| 1–3 | Ideal. Simple, easy to test and reuse. |
| 4–6 | Acceptable for mid-level, flexible UI components. |
| 7+ | Code smell. Evaluate a refactor. Many props usually mean the component has too many responsibilities. |

Treat these as signals, not hard limits. The exceptions in section 3 still apply.

## 2. Design and refactoring

### 2.1 Single responsibility

- Give each component one job.
- Keep complex business logic apart from detailed UI rendering. Extract the
  logic into a hook (`model/use-<verb>-<noun>.ts`) or a container component.

### 2.2 Prefer composition (`children` and slots)

Do not configure child UI through a long list of flags and labels. Pass
`children` or `ReactNode` props (slots) instead. Illustrative:

```tsx
// Avoid
<Panel title="Title" showAvatar avatarUrl="..." buttonText="Confirm" onButtonClick={handleConfirm} />

// Prefer
<Panel title="Title">
  <img src={avatarUrl} alt="" />
  <button type="button" onClick={handleConfirm}>{text.confirm}</button>
</Panel>
```

### 2.3 Group related props into an object

When props always travel together or describe one data entity, pass a single
object prop: `<ExampleItemForm item={item} onClose={close} />`, not one prop per
field of the item.

### 2.4 Compound components

Use the compound component pattern for complex UI made of interdependent parts
(Modal, Select, Table, Accordion, Dropdown). Share state between the parts
through context inside the compound component, not through props.

## 3. Allowed exceptions

- **Wrappers and primitives** that wrap a standard HTML element may accept many
  props by passing through native attributes. Type them with
  `ComponentProps<'input'>` / `ComponentPropsWithoutRef<'tag'>` (minus what the
  wrapper owns) and spread the rest onto the element, as `PasswordField` in
  `src/features/change-password/ui/change-password-form.tsx` and `Field` in
  `src/pages/login/ui/login-form-section.tsx` do.
- **Form-library integration** (react-hook-form): form controls may carry the
  props `register(name)` returns (`name`, `onChange`, `onBlur`, `ref`) plus
  field state (`error`).

## 4. Instructions for AI agents

When generating or reviewing React code:

1. **Check prop count.** If a component has more than 6 props, propose a
   refactor using composition or object grouping, unless a section 3
   exception applies.
2. **Type props explicitly.** Define a TypeScript `interface` or `type` for
   every component's props.
3. **Avoid prop drilling.** Do not pass a prop through more than 2 intermediate
   components. Use React Context, a store (`src/shared/lib/theme/theme-store.ts`
   is the pattern) or the query cache instead.
4. **Use default parameters.** Set defaults in the destructured parameters
   (`({ size = 'md' }: Props)`), never with `defaultProps`.
5. **Plain semantic HTML.** The template has no UI kit and no `shared/ui`:
   use semantic elements, `<label htmlFor>`, `role="alert"`/`role="status"`, no
   classes or inline styles until the project adds its UI library (see README).

## 5. Review checklist

- [ ] Component has one clear responsibility
- [ ] 7+ props? A refactor was evaluated (or an exception applies)
- [ ] Related props grouped into an object; UI configured via children/slots
- [ ] Props typed in TypeScript; defaults set via destructuring
- [ ] No prop passes through more than 2 intermediate components
