const {openWallet} = require("./common");
const qrcode = require('qrcode');
const utils = require('../utils');

module.exports = (walletPath, range, options) => {
    return openWallet(walletPath)
        .then((wallet) => {
            const pubkey = wallet.getPublicExtendedKey();
            console.log("Extended private key: " + pubkey);
            console.log(utils.QRCodeToStringCompact(qrcode.create(pubkey)));
        });
};