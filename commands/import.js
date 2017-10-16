const inquirer = require('inquirer');
const fs = require('fs');
const bip39 = require('bip39');
const zxcvbn = require('zxcvbn');
const Wallet = require('../wallet');
const utils = require('../utils');


module.exports = (walletPath, options) => {
    if (fs.existsSync(walletPath)) {
        console.log("Error: Wallet file already exists.");
        return;
    }

    return inquirer.prompt([{
        name: 'xpub',
        message: "Enter extended public key",
        type: 'input',
        validate: (xpub, answers) => {
            answers.wallet = Wallet.fromExtendedKey(xpub);
            return true;
        },
    }]).then(({wallet}) => {
        const walletText = JSON.stringify(wallet.toV3("", {exportExtendedKey: true}), null, 2);
        fs.writeFileSync(walletPath, walletText);
        console.log("Created new wallet at " + walletPath);
    });
};
