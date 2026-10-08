---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "apps/mobile/**/*.{ts,tsx}"
---

# React and React Native coding rules

These rules apply to every React component in `apps/web` and `apps/mobile`. The reference implementation is `apps/mobile/src/modules/auth/components/`.

## 1. Component structure

Every component lives in its own folder, named after the component in kebab-case, and is split into these files:

```
language-sheet/
├── index.ts                     # exports the component only
├── language-sheet.component.tsx # JSX
├── language-sheet.hook.ts       # useLanguageSheet (only when needed, see below)
└── language-sheet.types.ts      # every type the component and its hook use
```

- `<name>.component.tsx`: the JSX. No type declarations and no state or logic here. It calls the component's own hook (`useLanguageSheet`) and MAY call other hooks that just read context or environment (`useTranslation`, `useTheme`, `useSafeAreaInsets`…).
- `<name>.hook.ts`: the component's custom hook. It holds the state handling, the hook calls that drive it, and any function that performs a task or calculation for the component. It exports exactly one hook, named after the component: `LanguageSheet` → `useLanguageSheet`.
  - Create this file only if the component has internal state or a function that performs a task or calculation. Otherwise, don't create it.
  - A single `useState` stays in the component. With more than one, move all of the state into the hook.
- `<name>.types.ts`: every type the component needs that is declared with `type` or `interface`: the component's props, the hook's props (`UseLanguageSheetProps`), and any other complex type. Never declare them in the `.tsx` or `.hook.ts`.
- `index.ts`: exports the component and nothing else (`export { LanguageSheet } from "./language-sheet.component";`).

## 2. Import order

Group imports in this order, with one empty line between groups:

1. Packages from `node_modules` (`react`, `react-native`, `@expo/vector-icons`…)
2. Project imports through the `@/` alias
3. Relative imports (`./`, `../`)

Within each group, sort the imports alphabetically by module path (and the names inside each `{ }` alphabetically too).

```ts
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { useTheme } from "@/hooks/use-theme";

import { useLanguageSheet } from "./language-sheet.hook";
import { LanguageSheetProps } from "./language-sheet.types";
```

## 3. Function style

- Components: named function declarations (`export function LanguageSheet(...) {}`).
- Custom hooks and local callbacks: arrow functions (`export const useLanguageSheet = (...) => {}`, `const handlePress = () => {}`).

## 4. Memoization (`useCallback`, `useMemo`, `React.memo`)

Memoization is not free: it adds comparisons, retained references, dependency management and cognitive complexity ([Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)). Use it only to solve a demonstrated calculation or referential-identity problem, never as a default style. **Generate the simplest correct code first.**

`apps/mobile` has the React Compiler enabled (`experiments.reactCompiler` in `app.json`): rely on it and don't add routine manual memoization there. Manual `useMemo`/`useCallback` remain escape hatches when precise control is required ([React Compiler guidance](https://react.dev/learn/react-compiler/introduction#what-should-i-do-about-usememo-usecallback-and-reactmemo)).

MUST = correctness requirement, SHOULD = default choice, MAY = only when the stated conditions hold.

### Global rules

1. Code SHOULD work correctly with all memoization removed. Memoization is a performance optimization, not a correctness mechanism.
2. Don't memoize speculatively. Prefer memoizing after profiling identifies meaningful work or excessive rendering.
3. Before memoizing, first try to: keep state close to where it is used; remove unnecessary Effects and state updates; move static values outside the component; move Effect-only objects and functions inside the Effect; pass smaller primitive props instead of large objects; split expensive subtrees into separate components.
4. Every `useCallback`/`useMemo` dependency list MUST contain every reactive value used by its callback.
5. Never suppress the hooks dependency linter to preserve memoization. Restructure the code instead.
6. Dependency lists MUST be inline and have a constant length.
7. Memoized calculations and component rendering MUST be pure.
8. Don't depend on a memoized value keeping its identity forever; React may discard caches. Use state or a ref when persistent identity is a semantic requirement.

### `useCallback`

Caches a function reference (not its result, and it doesn't prevent the function from being created). Use it only when at least one is true:

1. The callback is passed to a `React.memo` child that renders frequently, is measurably expensive or often gets otherwise unchanged props, and a stable callback lets it skip meaningful work.
2. The callback is a dependency of `useEffect`, `useMemo`, another `useCallback` or a custom hook, and that dependency can't reasonably be removed by restructuring.
3. A custom hook returns the callback and stable identity is part of that hook's optimization contract.
4. A third-party API explicitly relies on callback reference equality (and correctness doesn't depend on React keeping the cache forever).

When the next state derives from the previous one, use a functional updater instead of depending on the state:

```ts
const addTodo = useCallback((todo: Todo) => {
  setTodos((current) => [...current, todo]);
}, []);
```

Don't use `useCallback`:

- For every event handler by default, or for handlers passed only to native/host elements (`<button onClick>`, `<Pressable onPress>`).
- For callbacks passed to non-memoized children to "prevent re-renders"; a normal child renders with its parent anyway.
- When its dependencies change on nearly every render.
- To make a cheap function "faster" or to avoid inline functions (they're normally harmless).
- With an empty dependency list when the callback reads changing props, state or local values.
- To hide an Effect dependency problem when the function can be declared inside the Effect.
- As a correctness mechanism for subscriptions, cleanup or persistent identity.

### `useMemo`

Caches the result of a pure calculation until a dependency changes. Use it only when at least one is true:

1. A pure synchronous calculation is measurably expensive (large collections, complex transformations) and would otherwise rerun with unchanged inputs.
2. An object, array or derived value is passed to an expensive `React.memo` child, and stable identity lets it skip meaningful work.
3. A derived non-primitive value must be a dependency of another hook and the dependency can't be removed more simply.
4. A library does meaningful work based on reference equality and the dependencies are stable enough.

```ts
const visibleRows = useMemo(
  () => filterAndSortRows(rows, query, sort),
  [rows, query, sort],
);
```

Don't use `useMemo`:

- For cheap arithmetic, boolean expressions, string interpolation or property access (`const isDisabled = loading || items.length === 0;`).
- For small object/array literals, unless an actual memoization boundary consumes their identity, or solely because a value is an object or array.
- For static values: declare them outside the component.
- When dependencies change on almost every render, or the dependency list holds a value recreated every render.
- For side effects, logging, network requests, subscriptions, DOM operations or state updates.
- To make correctness depend on object identity.
- To initialize state: use a lazy initializer (`useState(() => createInitialValue(config))`).
- To memoize JSX by default: extract (and, if justified, memoize) a component instead.

For Effect-local objects, remove the identity problem instead of memoizing:

```ts
useEffect(() => {
  const options = { roomId, serverUrl };
  const connection = connect(options);

  return () => connection.disconnect();
}, [roomId, serverUrl]);
```

### `React.memo`

Lets React skip rendering a component when all its props are `Object.is`-equal. Use it only when all are true: the component is pure; its parent renders frequently; it often receives the same props; rendering it is measurably expensive or causes noticeable latency; and its props can stay referentially stable. Typical candidates: expensive charts, large list items where most items don't change, complex editors, expensive subtrees under rapidly changing parent state. Prefer a narrow prop interface (`name`, `isOnline`) over passing a whole object.

Don't use `React.memo`:

- On every component by default, or on cheap components with no observed rendering problem.
- When the component almost always gets different props, or a prop is recreated every parent render and can't be stabilized (one always-new prop such as `options={{ dense: true }}` or an inline `onSelect` defeats it).
- To fix impure rendering or bugs caused by re-rendering.
- To prevent updates caused by the component's own state or by context (it only compares parent-supplied props).
- When comparing props would cost as much as rendering, or when the React Compiler already memoizes the component.

A custom `arePropsEqual` MAY be used only when prop stability can't be improved more simply, the comparison is bounded and cheap, and profiling proves it faster than rendering. It MUST compare every prop, function props included (ignoring one preserves stale closures). Avoid unbounded deep equality.

### How they work together

`useMemo` stabilizes an expensive derived value, `useCallback` stabilizes a handler, and `React.memo` consumes both to skip an expensive child render. If the child is cheap, renders rarely, or receives changed values on almost every render, remove all three.

## 5. Child components

A component never defines another component inside its file. Extract it to its own folder, at the same level as its parent's folder, following all the rules above:

```
components/
├── auth/            # AuthComponent renders AuthButton and LanguageSheet
├── auth-button/
└── language-sheet/
```
