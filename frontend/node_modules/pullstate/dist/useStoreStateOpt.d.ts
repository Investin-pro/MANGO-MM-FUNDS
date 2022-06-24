import { Store } from "./Store";
import { DeepTypeOfArray, TAllPathsParameter } from "./useStoreStateOpt-types";
declare function useStoreStateOpt<S extends any, P extends TAllPathsParameter<S>>(store: Store<S>, paths: P): [
    DeepTypeOfArray<S, P[0]>,
    DeepTypeOfArray<S, P[1]>,
    DeepTypeOfArray<S, P[2]>,
    DeepTypeOfArray<S, P[3]>,
    DeepTypeOfArray<S, P[4]>,
    DeepTypeOfArray<S, P[5]>,
    DeepTypeOfArray<S, P[6]>,
    DeepTypeOfArray<S, P[7]>,
    DeepTypeOfArray<S, P[8]>,
    DeepTypeOfArray<S, P[9]>,
    DeepTypeOfArray<S, P[10]>
];
export { useStoreStateOpt };
