const inquirer = require('inquirer'),
        fs = require('fs'),
        Wallet = require('../wallet');

exports.openWallet = (walletPath) => {
    const walletPathParts = walletPath.split(":");
    const walletFileName = walletPathParts[0];
    let derivationPath = walletPathParts[1];

    const walletJson = JSON.parse(fs.readFileSync(walletFileName, {encoding: 'utf8'}));
    let pubWallet = Wallet.fromV3AsPublic(walletJson);
    if (pubWallet && derivationPath) {  // Check derivation path correct.
        pubWallet = pubWallet.derive(derivationPath);
    }
    if (pubWallet) {
        console.log(`Opening wallet ${pubWallet.getChecksumAddressString()} (${walletPath})`)
    } else {
        console.log(`Opening wallet ${walletPath}`);
    }
    
    return inquirer.prompt([{
        name: 'walletPassword',
        type: 'password',
        message: 'Enter wallet password',
        when: () => !!walletJson.crypto,
        validate: (walletPassword, answers) => {
            answers.wallet = Wallet.fromV3(walletJson, walletPassword);
            return true;
        },
    }]).then(({wallet}) => {
        if (wallet) {
            if (derivationPath)
                wallet = wallet.derive(derivationPath);
            console.log("Opened private key for wallet " + wallet.getChecksumAddressString());
        } else {
            wallet = pubWallet;
        }
        return wallet;
    });
};