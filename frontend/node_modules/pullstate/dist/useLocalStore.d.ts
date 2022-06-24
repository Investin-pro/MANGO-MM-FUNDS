import { Store } from "./Store";
declare function useLocalStore<S extends any>(initialState: (() => S) | S, deps?: ReadonlyArray<any>): Store<S>;
export { useLocalStore };
