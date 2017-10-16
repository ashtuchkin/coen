const {openWallet} = require('./common');
const _ = require('lodash');
const {ethRequest, checkOffline} = require('../utils');
const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN;


module.exports = (walletPath, range, options) => {
    let deriveWallets = (wallet) => [{wallet}];
    if (range != null) {
        const parts = range.split('-').map(Number);
        const from = parts[0];
        const to = parts.length > 1 ? parts[1] : (from + 10);
        const ids = [];
        for (let i = from; i <= to; i++)
            ids.push(i);
        
        deriveWallets = (wallet) => 
            ids.map((id) => ({wallet: wallet.deriveChild(id), idx: id}));
    }

    return checkOffline().then((isOffline) => 
        openWallet(walletPath)
        .then(deriveWallets)
        .then((wallets) => {
            const etherToWei = new BN('1000000000000000000');

            let requests = [];
            if (!isOffline) {
                console.log("Getting current nonces and balances...");
                requests = [].concat(
                    wallets.map((w) =>
                        ethRequest("eth_getBalance", w.wallet.getAddressString(), "latest")
                            .then(result => w.balance = new BN(result).muln(1e6).div(etherToWei) / 1e6)),
                    wallets.map((w) =>
                        ethRequest("eth_getTransactionCount", w.wallet.getAddressString(), "latest")
                            .then(result => w.nonce = +result))
                );
            } else {
                console.log("Offline mode; nonces and balances not available.");
            }

            return Promise.all(requests).then(() => {
                console.log("\nIdx Address                                 " + (!isOffline ? "Nonce  Balance (ETH)" : ""));
                wallets.forEach(({wallet, idx, nonce, balance}) => {
                    idx = (idx == null) ? "--" : idx;
                    nonce = (nonce == null) ? "" : nonce;
                    balance = (balance == null) ? "" : balance;
                    const address = wallet.getChecksumAddressString();
                    console.log(`${_.padStart(idx, 3)} ${address} ${_.padStart(nonce, 2)}  ${balance}`);
                });
            });
        })
    );
};