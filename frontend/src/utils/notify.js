import { toast } from 'react-toastify';
import React from 'react';

export const notify = (text, type = "success", hideProgressBar=false) => toast[type](text, {
    position: "bottom-left",
    autoClose: 3000,
    hideProgressBar: hideProgressBar,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
});

export const TRX_URL = 'https://explorer.solana.com/tx/';
 //'https://solscan.io/tx/';
 //'https://explorer.solana.com/tx/';

const TrxView = (props) => {
    console.log("transaction : ", `${TRX_URL}${props.trxhash}`)
    return <div>
        Processing transction ...{`  `}
        <a target="_blank" rel="noopener noreferrer" href={`${TRX_URL}${props.trxhash}`}> View on explorer</a>
    </div>
}
export const notifyTrx = (trxhash, type = "info", autoClose = 3000) => {
    toast.info(<TrxView trxhash={trxhash} />, {
        position: "bottom-left",
        autoClose: autoClose,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
    });
}
export const sendTrxNotify = async (connection, signature, text, type = "info") => {
    if (type === "warn") {
        notify(signature + " " + text, "error");
        console.error("notify error:", signature);
    } else {
        notifyTrx(signature)
        // await awaitTransactionSignatureConfirmation2(connection, signature, 30000);
         notify(text);
    } 

}



export const simpleNotify = async (text, type = "info") => {
    notify(text, type);
}
