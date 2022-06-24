import { Store } from "./Store";
export interface IUpdateRef {
    shouldUpdate: boolean;
    onStoreUpdate: (() => void) | null;
    getSubState?: (state: any) => any;
    currentSubState: any;
    setInitial: boolean;
}
export interface IUpdateRefNew {
    state: any;
    initialized: boolean;
}
declare function useStoreState<S extends any = any>(store: Store<S>): S;
declare function useStoreState<S extends any = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS, deps?: ReadonlyArray<any>): SS;
export { useStoreState };
