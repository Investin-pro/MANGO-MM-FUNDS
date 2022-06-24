import { IdlCoder } from "./idl";
/**
 * Encodes and decodes user defined types.
 */
export class TypesCoder {
    constructor(idl) {
        if (idl.types === undefined) {
            this.layouts = new Map();
            return;
        }
        const types = idl.types;
        const layouts = types.map((acc) => {
            return [acc.name, IdlCoder.typeDefLayout(acc, types)];
        });
        // @ts-ignore
        this.layouts = new Map(layouts);
    }
    encode(accountName, account) {
        const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
        const layout = this.layouts.get(accountName);
        if (!layout) {
            throw new Error(`Unknown account type: ${accountName}`);
        }
        const len = layout.encode(account, buffer);
        return buffer.slice(0, len);
    }
    decode(accountName, ix) {
        const layout = this.layouts.get(accountName);
        if (!layout) {
            throw new Error(`Unknown account type: ${accountName}`);
        }
        return layout.decode(ix);
    }
}
//# sourceMappingURL=types.js.map