"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsCoder = exports.ACCOUNT_DISCRIMINATOR_SIZE = void 0;
const idl_1 = require("./idl");
const js_sha256_1 = require("js-sha256");
/**
 * Number of bytes of the account discriminator.
 */
exports.ACCOUNT_DISCRIMINATOR_SIZE = 8;
/**
 * Encodes and decodes account objects.
 */
class AccountsCoder {
    constructor(idl) {
        if (idl.accounts === undefined) {
            this.accountLayouts = new Map();
            return;
        }
        const layouts = idl.accounts.map((acc) => {
            return [acc.name, idl_1.IdlCoder.typeDefLayout(acc, idl.types)];
        });
        this.accountLayouts = new Map(layouts);
    }
    async encode(accountName, account) {
        const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
        const layout = this.accountLayouts.get(accountName);
        if (!layout) {
            throw new Error(`Unknown account: ${accountName}`);
        }
        const len = layout.encode(account, buffer);
        let accountData = buffer.slice(0, len);
        let discriminator = AccountsCoder.accountDiscriminator(accountName);
        return Buffer.concat([discriminator, accountData]);
    }
    decode(accountName, ix) {
        // Chop off the discriminator before decoding.
        const data = ix.slice(8);
        const layout = this.accountLayouts.get(accountName);
        if (!layout) {
            throw new Error(`Unknown account: ${accountName}`);
        }
        return layout.decode(data);
    }
    /**
     * Calculates and returns a unique 8 byte discriminator prepended to all anchor accounts.
     *
     * @param name The name of the account to calculate the discriminator.
     */
    static accountDiscriminator(name) {
        return Buffer.from(js_sha256_1.sha256.digest(`account:${name}`)).slice(0, 8);
    }
}
exports.AccountsCoder = AccountsCoder;
//# sourceMappingURL=accounts.js.map