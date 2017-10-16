const inquirer = require('inquirer'),
        fs = require('fs'),
        Wallet = require('../wallet');

exports.openWallet = (walletPath) => {
    const walletPathParts = walletPath.split(":");
    const walletFileName = walletPathParts[0];
    let derivationPath = walletPathParts[1];

    const walletJson = JSON.parse(fs.readFileSync(walletFileName, {encoding: 'utf8'}));
    if (walletJson.version !== 3)
        throw new Error("Invalid file format");

    if (derivationPath) { // Check derivation path correct.
        derivationPath = "m/" + derivationPath;
        Wallet.fromMasterSeed("irrelevant").derive(derivationPath);
    }
    
    return inquirer.prompt([{
        name: 'walletPassword',
        type: 'password',
        message: 'Enter wallet password',
        when: () => !walletJson.xpub,
        validate: (walletPassword, answers) => {
            answers.wallet = Wallet.fromV3(walletJson, walletPassword);
            return true;
        },
    }]).then(({wallet}) => {
        wallet = wallet || Wallet.fromV3(walletJson, ""); // xpub case.
        if (derivationPath)
            wallet = wallet.derive(derivationPath);
        console.log("Opened wallet " + wallet.getChecksumAddressString());
        return wallet;
    });
};