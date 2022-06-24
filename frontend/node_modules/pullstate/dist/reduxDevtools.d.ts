import { IPullstateAllStores } from "./PullstateCore";
interface IORegisterInDevtoolsOptions {
    namespace?: string;
}
export declare function registerInDevtools(stores: IPullstateAllStores, { namespace }?: IORegisterInDevtoolsOptions): void;
export {};
