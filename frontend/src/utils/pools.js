import { LP_TOKENS, TOKENS, NATIVE_SOL, RAY_TOKENS, MANGO_TOKENS } from "./tokens";
import { TEST_TOKENS, TEST_LP_TOKENS } from "./tokens";

import { LIQUIDITY_POOL_PROGRAM_ID_V4, SERUM_PROGRAM_ID_V3 } from "./constants";

export const devnet_pools = [
  {
    name: 'SRM-USDC',
    coin: {...MANGO_TOKENS.SRM},
    pc: {...MANGO_TOKENS.USDC},
    lp: { ...TEST_LP_TOKENS['SRM-USDC'] },

    version: 4,
    programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

    ammId: '6Xec3XR8NqNWbn6CFtGr9DbdKqSunzbXFFRiRpmxPxF2',
    ammAuthority: 'DhVpojXMTbZMuTaCgiiaFU7U8GvEEhnYo4G9BUdiEYGh',
    ammOpenOrders: '9WmmCdKzCS9Db2fGcky5gfYddmSq8JBp8MWSYqvYbCA9',
    ammTargetOrders: 'BXsHqjyj7oNdALFf42fStCA2h1U5gYSNFPiPBjCq3fkH',
    // no need
    ammQuantities: NATIVE_SOL.mintAddress,

    // dont care
    poolCoinTokenAccount: '6LhPXhjdU76QxyxGdWMewFBGiEvDJ7F2AELS4GT3dXV1',
    poolPcTokenAccount: 'GxhY4tdNzr8CK52K5ecMPjxbro29nCqGjBLamWwDkAHW',
    poolWithdrawQueue: 'BwnphxXqiArEhaBmU2b15QxEbaG9AepPSWdqj9Gzshd2',
    poolTempLpTokenAccount: 'HbJe3pboTK5Hw1JzRs6t5jdZSvXHeKh4ZnXMVXksx7of',
    serumProgramId: SERUM_PROGRAM_ID_V3,
    serumMarket: '4SZ7MvMfW2fbEu5SgLMfRaeTR2bXhP6GGLMr1L6N9PeW',
    serumBids: 'ANH8oSyZpYrgtqkXCn6LHf4vwRchXZ4Qpj5pvZScuhoJ',
    serumAsks: 'HARNnSrmnhChkSVDq6vUdxJRU7QuuyPAovsdLwRrfKMK',
    serumEventQueue: '3sr7NEu8xHqVf8Ak7fcx7EqH2CDtZdvQY8o3E3w9jKYg',
    serumCoinVaultAccount: 'H1zQKGtwhT3mRMyeKmNpju4Vgzc8pqxfkceM1NBJNKm6',
    serumPcVaultAccount: 'H1zQKGtwhT3mRMyeKmNpju4Vgzc8pqxfkceM1NBJNKm6',
    serumVaultSigner: 'EqrboHB3p3Gx6YX1oANkSGDwb66xCd4GtGRLbdUGTFra',
  },
  // {
  //   name: 'ALPHA-USDC',
  //   coin: { ...TEST_TOKENS.ALPHA },
  //   pc: { ...TEST_TOKENS.USDP },
  //   lp: { ...LP_TOKENS['RAY-USDP-V4'] },

  //   version: 4,
  //   programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

  //   ammId: 'DVa7Qmb5ct9RCpaU7UTpSaf3GVMYz17vNVU67XpdCRut',
  //   ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //   ammOpenOrders: 'HboQAt9BXyejnh6SzdDNTx4WELMtRRPCr7pRSLpAW7Eq',
  //   ammTargetOrders: '3K2uLkKwVVPvZuMhcQAPLF8hw95somMeNwJS7vgWYrsJ',
  //   // no need
  //   ammQuantities: NATIVE_SOL.mintAddress,

  //   poolCoinTokenAccount: 'DUn4i71SXksHN7KtveP4uauWqsnfdSHa4PoEkzN8qqN6',
  //   poolPcTokenAccount: 'BUdDS4AUMSsvQ1QyHe4LLagvkFfUU4TW17udvxaDJaxR',

  //   // dont care
  //   poolWithdrawQueue: '8VuvrSWfQP8vdbuMAP9AkfgLxU9hbRR6BmTJ8Gfas9aK',
  //   poolTempLpTokenAccount: 'FBzqDD1cBgkZ1h6tiZNFpkh4sZyg6AG8K5P9DSuJoS5F',
  //   serumProgramId: SERUM_PROGRAM_ID_V3,
  //   serumMarket: 'teE55QrL4a4QSfydR9dnHF97jgCfptpuigbb53Lo95g',
  //   serumBids: 'AvKStCiY8LTp3oDFrMkiHHxxhxk4sQUWnGVcetm4kRpy',
  //   serumAsks: 'Hj9kckvMX96mQokfMBzNCYEYMLEBYKQ9WwSc1GxasW11',
  //   serumEventQueue: '58KcficuUqPDcMittSddhT8LzsPJoH46YP4uURoMo5EB',
  //   serumCoinVaultAccount: '2kVNVEgHicvfwiyhT2T51YiQGMPFWLMSp8qXc1hHzkpU',
  //   serumPcVaultAccount: '5AXZV7XfR7Ctr6yjQ9m9dbgycKeUXWnWqHwBTZT6mqC7',
  //   serumVaultSigner: 'HzWpBN6ucpsA9wcfmhLAFYqEUmHjE9n2cGHwunG5avpL'
  // },
]
export const devnet2_pools = [
  {
    name: 'ALPHA-USDP',
    coin: { ...TEST_TOKENS.ALPHA },
    pc: { ...TEST_TOKENS.USDP },
    lp: { ...LP_TOKENS['RAY-USDP-V4'] },

    version: 4,
    programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

    ammId: 'DVa7Qmb5ct9RCpaU7UTpSaf3GVMYz17vNVU67XpdCRut',
    ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    ammOpenOrders: 'HboQAt9BXyejnh6SzdDNTx4WELMtRRPCr7pRSLpAW7Eq',
    ammTargetOrders: '3K2uLkKwVVPvZuMhcQAPLF8hw95somMeNwJS7vgWYrsJ',
    // no need
    ammQuantities: NATIVE_SOL.mintAddress,

    poolCoinTokenAccount: 'DUn4i71SXksHN7KtveP4uauWqsnfdSHa4PoEkzN8qqN6',
    poolPcTokenAccount: 'BUdDS4AUMSsvQ1QyHe4LLagvkFfUU4TW17udvxaDJaxR',

    // dont care
    poolWithdrawQueue: '8VuvrSWfQP8vdbuMAP9AkfgLxU9hbRR6BmTJ8Gfas9aK',
    poolTempLpTokenAccount: 'FBzqDD1cBgkZ1h6tiZNFpkh4sZyg6AG8K5P9DSuJoS5F',
    serumProgramId: SERUM_PROGRAM_ID_V3,
    serumMarket: 'teE55QrL4a4QSfydR9dnHF97jgCfptpuigbb53Lo95g',
    serumBids: 'AvKStCiY8LTp3oDFrMkiHHxxhxk4sQUWnGVcetm4kRpy',
    serumAsks: 'Hj9kckvMX96mQokfMBzNCYEYMLEBYKQ9WwSc1GxasW11',
    serumEventQueue: '58KcficuUqPDcMittSddhT8LzsPJoH46YP4uURoMo5EB',
    serumCoinVaultAccount: '2kVNVEgHicvfwiyhT2T51YiQGMPFWLMSp8qXc1hHzkpU',
    serumPcVaultAccount: '5AXZV7XfR7Ctr6yjQ9m9dbgycKeUXWnWqHwBTZT6mqC7',
    serumVaultSigner: 'HzWpBN6ucpsA9wcfmhLAFYqEUmHjE9n2cGHwunG5avpL'
  },
  {
    name: 'BETA-USDP',
    coin: { ...TEST_TOKENS.BETA },
    pc: { ...TEST_TOKENS.USDP },
    lp: { ...LP_TOKENS['ETH-USDT-V4'] },

    version: 4,
    programId: LIQUIDITY_POOL_PROGRAM_ID_V4,

    ammId: 'He3iAEV5rYjv6Xf7PxKro19eVrC3QAcdic5CF2D2obPt',
    ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    ammOpenOrders: '8x4uasC632WSrk3wgwoCWHy7MK7Xo2WKAe9vV93tj5se',
    ammTargetOrders: 'G1eji3rrfRFfvHUbPEEbvnjmJ4eEyXeiJBVbMTUPfKL1',
    // no need
    ammQuantities: NATIVE_SOL.mintAddress,
    
    poolCoinTokenAccount: '2Ab9oAp9XcarKgdthdAtTitAHctuEkafKHh2GtzSJRyt',
    poolPcTokenAccount: 'BUdDS4AUMSsvQ1QyHe4LLagvkFfUU4TW17udvxaDJaxR',
    
    // dont care
    poolWithdrawQueue: 'EispXkJcfh2PZA2fSXWsAanEGq1GHXzRRtu1DuqADQsL',
    poolTempLpTokenAccount: '9SrcJk8TB4JvutZcA4tMvvkdnxCXda8Gtepre7jcCaQr',
    serumProgramId: SERUM_PROGRAM_ID_V3,
    serumMarket: '7dLVkUfBVfCGkFhSXDCq1ukM9usathSgS716t643iFGF',
    serumBids: 'J8a3dcUkMwrE5kxN86gsL1Mwrg63RnGdvWsPbgdFqC6X',
    serumAsks: 'F6oqP13HNZho3bhwuxTmic4w5iNgTdn89HdihMUNR24i',
    serumEventQueue: 'CRjXyfAxboMfCAmsvBw7pdvkfBY7XyGxB7CBTuDkm67v',
    serumCoinVaultAccount: '2CZ9JbDYPux5obFXb9sefwKyG6cyteNBSzbstYQ3iZxE',
    serumPcVaultAccount: 'D2f4NG1NC1yeBM2SgRe5YUF91w3M4naumGQMWjGtxiiE',
    serumVaultSigner: 'CVVGPFejAj3A75qPy2116iJFma7zGEuL8DgnxhwUaFBF'
  },
]


export const pools = [
  {
      name: 'WSOL-USDC',
      coin: { ...TOKENS.WSOL },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['SOL-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'HRk9CMrpq7Jn9sh7mzxE8CChHG8dneX9p475QKz4Fsfc',
      ammTargetOrders: 'CZza3Ej4Mc58MnxWA385itCC9jCo3L1D7zc3LKy1bZMR',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: '6LhPXhjdU76QxyxGdWMewFBGiEvDJ7F2AELS4GT3dXV1',
      poolPcTokenAccount: 'GxhY4tdNzr8CK52K5ecMPjxbro29nCqGjBLamWwDkAHW',
      poolWithdrawQueue: 'BwnphxXqiArEhaBmU2b15QxEbaG9AepPSWdqj9Gzshd2',
      poolTempLpTokenAccount: 'HbJe3pboTK5Hw1JzRs6t5jdZSvXHeKh4ZnXMVXksx7of',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: '4SZ7MvMfW2fbEu5SgLMfRaeTR2bXhP6GGLMr1L6N9PeW',
      serumBids: 'ANH8oSyZpYrgtqkXCn6LHf4vwRchXZ4Qpj5pvZScuhoJ',
      serumAsks: 'HARNnSrmnhChkSVDq6vUdxJRU7QuuyPAovsdLwRrfKMK',
      serumEventQueue: '3sr7NEu8xHqVf8Ak7fcx7EqH2CDtZdvQY8o3E3w9jKYg',
      serumCoinVaultAccount: 'H1zQKGtwhT3mRMyeKmNpju4Vgzc8pqxfkceM1NBJNKm6',
      serumPcVaultAccount: 'H1zQKGtwhT3mRMyeKmNpju4Vgzc8pqxfkceM1NBJNKm6',
      serumVaultSigner: 'EqrboHB3p3Gx6YX1oANkSGDwb66xCd4GtGRLbdUGTFra',
      official: true
    }, 
    {
      name: 'SRM-USDC',
      coin: { ...TOKENS.SRM },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['SRM-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '8tzS7SkUZyHPQY7gLqsMCXZ5EDCgjESUHcB17tiR1h3Z',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'GJwrRrNeeQKY2eGzuXGc3KBrBftYbidCYhmA6AZj2Zur',
      ammTargetOrders: '26LLpo8rscCpMxyAnJsqhqESPnzjMGiFdmXA4eF2Jrk5',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: 'zuLDJ5SEe76L3bpFp2Sm9qTTe5vpJL3gdQFT5At5xXG',
      poolPcTokenAccount: '4usvfgPDwXBX2ySX11ubTvJ3pvJHbGEW2ytpDGCSv5cw',
      poolWithdrawQueue: '7c1VbXTB7Xqx5eQQeUxAu5o6GHPq3P1ByhDsnRRUWYxB',
      poolTempLpTokenAccount: '2sozAi6zXDUCCkpgG3usphzeCDm4e2jTFngbm5atSdC9',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: 'ByRys5tuUWDgL73G8JBAEfkdFf8JWBzPBDHsBVQ5vbQA',
      serumBids: 'AuL9JzRJ55MdqzubK4EutJgAumtkuFcRVuPUvTX39pN8',
      serumAsks: '8Lx9U9wdE3afdqih1mCAXy3unJDfzSaXFqAvoLMjhwoD',
      serumEventQueue: '6o44a9xdzKKDNY7Ff2Qb129mktWbsCT4vKJcg2uk41uy',
      serumCoinVaultAccount: 'Ecfy8et9Mft9Dkavnuh4mzHMa2KWYUbBTA5oDZNoWu84',
      serumPcVaultAccount: 'hUgoKy5wjeFbZrXDW4ecr42T4F5Z1Tos31g68s5EHbP',
      serumVaultSigner: 'GVV4ZT9pccwy9d17STafFDuiSqFbXuRTdvKQ1zJX6ttX'
    }, 
     
    {
      name: 'COPE-USDC',
      coin: { ...TOKENS.COPE },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['COPE-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '3mYsmBQLB8EZSjRwtWjPbbE8LiM1oCCtNZZKiVBKsePa',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: '4tN7g8KbPt5bU9YDpeAsUNs2FY4G6GRvajTwCCHXt9Lk',
      ammTargetOrders: 'Fe5ZjyEhnB7mCgFhRkSLWNgvtkrut4iRzk1ydfJxwA9b',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: 'Guw4ErphtZQRC1foic6WweDSvA9AfuqJHKDXDcbrWH4f',
      poolPcTokenAccount: '86WgydpDUFRWa9aHzd9JgcKBELPJZVrkZ3uwxiiC3w2V',
      poolWithdrawQueue: 'Gvmc1zR72pdgoWSzNBqMyNoVHe78nxKgd7FSCE422Lcp',
      poolTempLpTokenAccount: '6FpDRYsKds3WkiCLjqpDzNBHWZP2Bz6CK9dZryBLKB9D',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: '7MpMwArporUHEGW7quUpkPZp5L5cHPs9eKUfKCdaPHq2',
      serumBids: '5SZ6xDgLzp3QbzkqT68BBAB7orCezSsV5Gb9eAk84zdY',
      serumAsks: 'Gwt93Xzp8aFrP8YFV8YSuHmYbkrGURBVVHnE6AqDT4Hp',
      serumEventQueue: 'Ea4bQ4wBJ5MXAwTG1hKzEv1zry5WnGY2G58YR8hcZTk3',
      serumCoinVaultAccount: '6LtcYXZVb7zfQG33F5dCDKZ29hyQaUh6BBhWjdHp8moy',
      serumPcVaultAccount: 'FCqm5xfy8ZvMxifVFfSz9Gxv1CTRABVMyLXuJrWvzAq7',
      serumVaultSigner: 'XoGZnpfyqj539wneBe8xUQyD282mwy5AMUaChz12JCH'
    },
    {
      name: 'STEP-USDC',
      coin: { ...TOKENS.STEP },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['STEP-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '4Sx1NLrQiK4b9FdLKe2DhQ9FHvRzJhzKN3LoD6BrEPnf',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'EXgME2sUuzBxEc2wuyoSZ8FZNZMC3ChhZgFZRAW3nCQG',
      ammTargetOrders: '78bwAGKJjaiPQqmwKmbj4fhrRTLAdzwqNwpFdpTzrhk1',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: '8Gf8Cc6yrxtfUZqM2vf2kg5uR9bGPfCHfzdYRVBAJSJj',
      poolPcTokenAccount: 'ApLc86fHjVbGbU9QFzNPNuWM5VYckZM92q6sgJN1SGYn',
      poolWithdrawQueue: '5bzBcB7cnJYGYvGPFxKcZETn6sGAyBbXgFhUbefbagYh',
      poolTempLpTokenAccount: 'CpfWKDYNYfvgk42tqR8HEHUWohGSJjASXfRBm3yaKJre',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: '97qCB4cAVSTthvJu3eNoEx6AY6DLuRDtCoPm5Tdyg77S',
      serumBids: '5Xdpf7CMGFDkJj1smcVQAAZG6GY9gqAns18QLKbPZKsw',
      serumAsks: '6Tqwg8nrKJrcqsr4zR9wJuPv3iXsHAMN65FxwJ3RMH8S',
      serumEventQueue: '5frw4m8pEZHorTKVzmMzvf8xLUrj65vN7wA57KzaZFK3',
      serumCoinVaultAccount: 'CVNye3Xr9Jv26c8TVqZZHq4F43BhoWWfmrzyp1M9YA67',
      serumPcVaultAccount: 'AnGbReAhCDFkR83nB8mXTDX5dQJFB8Pwicu6pGMfCLjt',
      serumVaultSigner: 'FbwU5U1Doj2PSKRJi7pnCny4dFPPJURwALkFhHwdHaMW'
    },
    {
      name: 'MEDIA-USDC',
      coin: { ...TOKENS.MEDIA },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['MEDIA-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '94CQopiGxxUXf2avyMZhAFaBdNatd62ttYGoTVQBRGdi',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'EdS5vqjihxRbRujPkqqzHYwBqcTP9QPbrBc9CDtnBDwo',
      ammTargetOrders: '6Rfew8qvNp97PVN14C9Wg8ybqRdF9HUEUhuqqZBWcAUW',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: '7zfTWDFmMi3Tzbbd3FZ2vZDdBm1w7whiZq1DrCxAHwMj',
      poolPcTokenAccount: 'FWUnfg1hHuanU8LxJv31TAfEWSvuWWffeMmHpcZ9BYVr',
      poolWithdrawQueue: 'F7MUnGrShtQqSvi9DoWyBNRo7FUpRiYPsS9aw77auhiS',
      poolTempLpTokenAccount: '7oX2VcPYwEV6EUUyMUoTKVVxAPAvGQZcGiGzotX43wNM',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: 'FfiqqvJcVL7oCCu8WQUMHLUC2dnHQPAPjTdSzsERFWjb',
      serumBids: 'GmqbTDL5QSAhWL7UsE8MriTHSnodWM1HyGR8Cn8GzZV5',
      serumAsks: 'CrTBp7ThkRRYJBL4tprke2VbKYj2wSxJp3Q1LDoHcQwP',
      serumEventQueue: 'HomZxFZNGmH2XedBavMsrXgLnWFpMLT95QV8nCYtKszd',
      serumCoinVaultAccount: 'D8ToFvpVWmNnfJzjHuumRJ4eoJc39hsWWcLtFZQpzQTt',
      serumPcVaultAccount: '6RSpnBYaegSKisXaJxeP36mkdVPe9SP3p2kDERz8Ahhi',
      serumVaultSigner: 'Cz2m3hW2Vcb8oEFz12uoWcdq8mKb9D1N7RTyXpigoFXU'
    },
    {
      name: 'ROPE-USDC',
      coin: { ...TOKENS.ROPE },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['ROPE-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: 'BuS4ScFcZjEBixF1ceCTiXs4rqt4WDfXLoth7VcM2Eoj',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'ASkE1yKPBei2aUxKHrLRptB2gpC3a6oTSxafMikoHYTG',
      ammTargetOrders: '5isDwR41fBJocfmcrcfwRtTnmSf7CdssdpsmBy2N2Eym',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: '3mS8mb1vDrD45v4zoxbSdrvbyVM1pBLM31cYLT2RfS2U',
      poolPcTokenAccount: 'BWfzmvvXhQ5V8ZWDMC4u82sEWgc6HyRLnq6nauwrtz5x',
      poolWithdrawQueue: '9T1cwwE5zZr3D2Rim8e5xnJoPJ9yKbTXvaRoxeVoqffo',
      poolTempLpTokenAccount: 'FTFx4Vg6hgKLZMLBUvazvPbM7AzDe5GpfeBZexe2S6WJ',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: '4Sg1g8U2ZuGnGYxAhc6MmX9MX7yZbrrraPkCQ9MdCPtF',
      serumBids: 'BDYAnAUSoBTtX7c8TKHeqmSy7U91V2pDg8ojvLs2fnCb',
      serumAsks: 'Bdm3R8X7Vt1FpTruE9SQVESSd3BjAyFhcobPwAoK2LSw',
      serumEventQueue: 'HVzqLTfcZKVC2PanNpyt8jVRJfDW8M5LgDs5NVVDa4G3',
      serumCoinVaultAccount: 'F8PdvS5QFhSqgVdUFo6ivXdXC4nDEiKGc4XU97ZhCKgH',
      serumPcVaultAccount: '61zxdnLpgnFgdk9Jom5f6d6cZ6cTbwnC6QqmJag1N9jB',
      serumVaultSigner: 'rCFXUwdmQvRK9jtnCip3SdDm1cLn8nB6HHgEHngzfjQ'
    },
    {
      name: 'ALEPH-USDC',
      coin: { ...TOKENS.ALEPH },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['ALEPH-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: 'GDHXjn9wF2zxW35DBkCegWQdoTfFBC9LXt7D5ovJxQ5B',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'AtUeUK7MZayoDktjrRSJAFsyPiPwPsbAeTsunM5pSnnK',
      ammTargetOrders: 'FMYSGYEL1CPYz8cpgAor5jV2HqeEQRDLMEggoz6wAiFV',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: 'BT3QMKHrha4fhqpisnYKaPDsv42XeHU2Aovhdu5Bazru',
      poolPcTokenAccount: '9L4tXPyuwuLhmtmX4yaRTK6TB7tYFNHupeENoCdPceq',
      poolWithdrawQueue: '4nRbmEUp7DQroG71jXv6cJjrhnh91ePdPhzmBSjinwB8',
      poolTempLpTokenAccount: '9JdpGvmo6aPZYf4hkiZNUjceXgd2RtR1fJgvjuoAuhsM',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: 'GcoKtAmTy5QyuijXSmJKBtFdt99e6Buza18Js7j9AJ6e',
      serumBids: 'HmpcmzzajDvhFSXb4pmJo5mb23zW8Cj9FEeB3hVT78jV',
      serumAsks: '8sfGm6jsFTAcb4oLuqMKr1xNEBd5CXuNPAKZEdbeezA',
      serumEventQueue: '99Cd6D9QnFfTdKpcwtoF3zAZdQAuZQi5NsPMERresj1r',
      serumCoinVaultAccount: 'EBRqW7DaUGFBHRbfgRagpSf9jTSS3yp9MAi3RvabdBGz',
      serumPcVaultAccount: '9QTMfdkgPWqLriB9J7FcYvroUEqfw6zW2VCi1dAabdUt',
      serumVaultSigner: 'HKt6xFufxTBBs719WQPbro9t1DfDxffurxFhTPntMgoe',
      official: true
    },
    {
      name: 'TULIP-USDC',
      coin: { ...TOKENS.TULIP },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['TULIP-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: '96hPvuJ3SRT82m7BAc7G1AUVPVcoj8DABAa5gT7wjgzX',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: '6GtSWZfdUFtT47RPk2oSxoB6RbNkp9aM6yP77jB4XmZB',
      ammTargetOrders: '9mB928abAihkhqM6AKLMW4cZkHBXFn2TmcxEKhTqs6Yr',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: 's9Xp7GV1jGvixdSfY6wPgivsTd3c4TzjW1eJGyojwV4',
      poolPcTokenAccount: 'wcyW58QFNfppgm4Wi7cKhSftdVNfpLdn67YvvCNMWrt',
      poolWithdrawQueue: '59NA3khShyZk4dhDjFN564nScNdEi3UR4wrCnLN6rRgX',
      poolTempLpTokenAccount: '71oLQgsHknJVHGJDCaBVUnb6udGepK7kwkHXGy47u2i4',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: '8GufnKq7YnXKhnB3WNhgy5PzU9uvHbaaRrZWQK6ixPxW',
      serumBids: '69W6zLetZ7FgXPXgHRp4i4wNd422tXeZzDuBzdkjgoBW',
      serumAsks: '42RcphsKYsVWDhaqJRETmx74RHXtHJDjZLFeeDrEL2F9',
      serumEventQueue: 'ExbLY71YpFaAGKuHjJKXSsWLA8hf1hGLoUYHNtzvbpGJ',
      serumCoinVaultAccount: '6qH3FNTSGKw34SEEj7GXbQ6kMQXHwuyGsAAeV5hLPhJc',
      serumPcVaultAccount: '6AdJbeH76BBSJ34DeQ6LLdauF6W8fZRrMKEfLt3YcMcT',
      serumVaultSigner: '5uJEd4wfVH84HyFEBf5chfJMTTPHBddXi1S7GmBE6x14',
      official: true
    },
    {
      name: 'MER-USDC',
      coin: { ...TOKENS.MER },
      pc: { ...TOKENS.USDC },
      lp: { ...LP_TOKENS['MER-USDC-V4'] },
  
      version: 4,
      programId: LIQUIDITY_POOL_PROGRAM_ID_V4,
  
      ammId: 'BkfGDk676QFtTiGxn7TtEpHayJZRr6LgNk9uTV2MH4bR',
      ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      ammOpenOrders: 'FNwXaqyYNKNwJ8Qc39VGzuGnPcNTCVKExrgUKTLCcSzU',
      ammTargetOrders: 'DKgXbNmsm1uCJ2eyh6xcnTe1G6YUav8RgzaxrbkG4xxe',
      // no need
      ammQuantities: NATIVE_SOL.mintAddress,
      poolCoinTokenAccount: '6XZ1hoJQZARtyA17mXkfnKSHWK2RvocC3UDNsY7f4Lf6',
      poolPcTokenAccount: 'F4opwQUoVhVRaf3CpMuCPpWNcB9k3AXvMMsfQh52pa66',
      poolWithdrawQueue: '8mqpqWGL7W2xh8B1s6XDZJsmPuo5zRedcM5sF55hhEKo',
      poolTempLpTokenAccount: '9ex6kCZsLR4ZbMCN4TcCuFzkw8YhiC9sdsJPavsrqCws',
      serumProgramId: SERUM_PROGRAM_ID_V3,
      serumMarket: 'G4LcexdCzzJUKZfqyVDQFzpkjhB1JoCNL8Kooxi9nJz5',
      serumBids: 'DVjhW8nLFWrpRwzaEi1fgJHJ5heMKddssrqE3AsGMCHp',
      serumAsks: 'CY2gjuWxUFGcgeCy3UiureS3kmjgDSRF59AQH6TENtfC',
      serumEventQueue: '8w4n3fcajhgN8TF74j42ehWvbVJnck5cewpjwhRQpyyc',
      serumCoinVaultAccount: '4ctYuY4ZvCVRvF22QDw8LzUis9yrnupoLQNXxmZy1BGm',
      serumPcVaultAccount: 'DovDds7NEzFn493DJ2yKBRgqsYgDXg6z38pUGXe1AAWQ',
      serumVaultSigner: 'BUDJ4F1ZknbZiwHb6xHEsH6o1LuW394DE8wKT8CoAYNF',
      official: true
    }
]