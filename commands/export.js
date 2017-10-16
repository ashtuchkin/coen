const {openWallet} = require("./common");
const qrcode = require('qrcode');
const utils = require('../utils');

module.exports = (walletPath, options) => {
    const canProceed = options.parent.allowOnline ? Promise.resolve(true) : utils.checkOffline();
    
    return canProceed.then((canProceed) => {
        if (!canProceed) {
            console.log("You're connected to internet. Please disconnect or supply --allow-online option.");
            return;
        }
        
        return openWallet(walletPath)
            .then((wallet) => {
                const pubkey = wallet.getPublicExtendedKey();
                console.log("Extended private key: " + pubkey);
                console.log(utils.QRCodeToStringCompact(qrcode.create(pubkey)));
            });
    });
};