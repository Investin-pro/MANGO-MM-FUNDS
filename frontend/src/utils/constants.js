import { Connection, PublicKey } from "@solana/web3.js";

export const PLATFORM_ACCOUNT_KEY = "platAccKey_11";
export const FUND_ACCOUNT_KEY = "fundAccKey_77777";
export const MARGIN_ACCOUNT_KEY_1 = "margin_account_key_17"
export const MARGIN_ACCOUNT_KEY_2 = "margin_account_key_22"
export const PRICE_ACCOUNT_KEY = "margin_account_key_22"


export const adminAccount = new PublicKey('Fepyuf4vy7mKZVgpzS52UoUeSLmVvGnoMDyraCsjYUqn')

// export const cluster = "https://api.devnet.solana.com";
// export const cluster = "https://solana-pi.projectserum.com";
// export const cluster = "https://ssc-dao.genesysgo.net/";
// export const cluster = "https://mainnet-beta.solflare.network";
export const cluster = "https://mango.rpcpool.com";

export const connection = new Connection(cluster, "recent");

// export const programId = new PublicKey('J65z283avUTTgWCEbMQk1HCVyJkTRoofLMsgAmvjHWBk');
// export const programId = new PublicKey('CikbdcmuRHrJa2FuYECETfx6hrzP3PctyjMeUBRd4H9A');
export const programId = new PublicKey('HDFNSB26prLvBB2vvAoUoDEbQYbUxdUJztRcjozNakfz');

export const delegate = new PublicKey('HcikBBJaAUTZXyqHQYHv46NkvwXVigkk2CuQgGuNQEnX');


export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const MEMO_PROGRAM_ID = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo')
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111')
export const CLOCK_PROGRAM_ID = new PublicKey('SysvarC1ock11111111111111111111111111111111')
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

// export const MANGO_PROGRAM_ID_V3 = new PublicKey('4skJ85cdxQAFVKbcGgfun8iZPL7BadVYXG3kGEGkufqA')
// export const MANGO_GROUP_ACCOUNT = new PublicKey('Ec2enZyoC4nGpEfu2sUNAa2nUGJHWxoUWYSEJ2hNTWTA')