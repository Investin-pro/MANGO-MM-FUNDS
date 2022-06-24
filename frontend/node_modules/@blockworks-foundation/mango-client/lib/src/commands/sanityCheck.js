"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../client");
const config_1 = require("../config");
const layout_1 = require("../layout");
const fixednum_1 = require("../fixednum");
const utils_1 = require("../utils");
const setUp = (client, mangoGroupKey) => __awaiter(void 0, void 0, void 0, function* () {
    const mangoGroup = yield client.getMangoGroup(mangoGroupKey);
    const mangoAccounts = yield client.getAllMangoAccounts(mangoGroup, undefined, true);
    const perpMarkets = [];
    for (let i = 0; i < layout_1.QUOTE_INDEX; i++) {
        const perpMarketInfo = mangoGroup.perpMarkets[i];
        const perpMarket = yield client.getPerpMarket(perpMarketInfo.perpMarket, mangoGroup.tokens[i].decimals, mangoGroup.tokens[layout_1.QUOTE_INDEX].decimals);
        perpMarkets.push(perpMarket);
    }
    return { mangoGroup, mangoAccounts, perpMarkets };
});
const checkSumOfBasePositions = (mangoAccounts) => __awaiter(void 0, void 0, void 0, function* () {
    const sumOfAllBasePositions = mangoAccounts.reduce((sumAll, mangoAccount) => {
        const sumOfBasePositions = mangoAccount.perpAccounts.reduce((sum, perpAccount) => {
            return sum + perpAccount.basePosition.toNumber();
        }, 0);
        return sumAll + sumOfBasePositions;
    }, 0);
    console.log('checkSumOfBasePositions', sumOfAllBasePositions);
});
const checkSumOfQuotePositions = (connection, mangoGroup, mangoAccounts, perpMarkets) => __awaiter(void 0, void 0, void 0, function* () {
    const mangoCache = yield mangoGroup.loadCache(connection);
    const sumOfAllQuotePositions = mangoAccounts.reduce((sumAll, mangoAccount) => {
        const sumOfQuotePositions = mangoAccount.perpAccounts.reduce((sum, perpAccount, index) => {
            const perpMarketCache = mangoCache.perpMarketCache[index];
            return sum.add(perpAccount.getQuotePosition(perpMarketCache));
        }, fixednum_1.ZERO_I80F48);
        return sumAll.add(sumOfQuotePositions);
    }, fixednum_1.ZERO_I80F48);
    const sumOfFeesAccrued = perpMarkets.reduce((sum, perpMarket) => {
        return sum.add(perpMarket.feesAccrued);
    }, fixednum_1.ZERO_I80F48);
    console.log('checkSumOfQuotePositions:', sumOfAllQuotePositions.add(sumOfFeesAccrued).toString());
});
const checkSumOfNetDeposit = (groupConfig, connection, mangoGroup, mangoAccounts) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const mangoCache = yield mangoGroup.loadCache(connection);
    const rootBanks = yield mangoGroup.loadRootBanks(connection);
    for (let i = 0; i < mangoGroup.tokens.length; i++) {
        if (mangoGroup.tokens[i].mint.equals(utils_1.zeroKey)) {
            continue;
        }
        console.log('======');
        console.log((_a = config_1.getTokenByMint(groupConfig, mangoGroup.tokens[i].mint)) === null || _a === void 0 ? void 0 : _a.symbol);
        console.log('deposit index', mangoCache.rootBankCache[i].depositIndex.toString());
        console.log('borrow index', mangoCache.rootBankCache[i].borrowIndex.toString());
        const sumOfNetDepositsAcrossMAs = mangoAccounts.reduce((sum, mangoAccount) => {
            return sum.add(mangoAccount.getNet(mangoCache.rootBankCache[i], i));
        }, fixednum_1.ZERO_I80F48);
        console.log('sumOfNetDepositsAcrossMAs:', sumOfNetDepositsAcrossMAs.toString());
        let vaultAmount = fixednum_1.ZERO_I80F48;
        const rootBank = rootBanks[i];
        if (rootBank) {
            const nodeBanks = yield rootBanks[i].loadNodeBanks(connection);
            const sumOfNetDepositsAcrossNodes = nodeBanks.reduce((sum, nodeBank) => {
                return sum.add(nodeBank.deposits.mul(mangoCache.rootBankCache[i].depositIndex));
            }, fixednum_1.ZERO_I80F48);
            const sumOfNetBorrowsAcrossNodes = nodeBanks.reduce((sum, nodeBank) => {
                return sum.add(nodeBank.borrows.mul(mangoCache.rootBankCache[i].borrowIndex));
            }, fixednum_1.ZERO_I80F48);
            console.log('sumOfNetDepositsAcrossNodes:', sumOfNetDepositsAcrossNodes.toString());
            console.log('sumOfNetBorrowsAcrossNodes:', sumOfNetBorrowsAcrossNodes.toString());
            for (let j = 0; j < nodeBanks.length; j++) {
                const vault = yield connection.getTokenAccountBalance(nodeBanks[j].vault);
                vaultAmount = vaultAmount.add(fixednum_1.I80F48.fromString(vault.value.amount));
            }
            console.log('vaultAmount:', vaultAmount.toString());
            console.log('nodesDiff:', vaultAmount
                .sub(sumOfNetDepositsAcrossNodes)
                .add(sumOfNetBorrowsAcrossNodes)
                .toString());
        }
        console.log('Diff', vaultAmount.sub(sumOfNetDepositsAcrossMAs).toString());
    }
});
function sanityCheck(connection, groupConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new client_1.MangoClient(connection, groupConfig.mangoProgramId);
        const { mangoGroup, mangoAccounts, perpMarkets } = yield setUp(client, groupConfig.publicKey);
        yield checkSumOfBasePositions(mangoAccounts);
        yield checkSumOfQuotePositions(connection, mangoGroup, mangoAccounts, perpMarkets);
        yield checkSumOfNetDeposit(groupConfig, connection, mangoGroup, mangoAccounts);
    });
}
exports.default = sanityCheck;
//# sourceMappingURL=sanityCheck.js.map