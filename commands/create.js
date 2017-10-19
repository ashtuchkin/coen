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

    const canProceed = options.parent.allowOnline ? Promise.resolve(true) : utils.checkOffline();

    return canProceed.then((canProceed) => {
        if (!canProceed) {
            console.log("You're connected to internet. Please disconnect or supply --allow-online option.");
            return;
        }

        return inquirer.prompt([{
            name: 'mnemonicInput',
            message: "Enter mnemonic (leave empty to generate one)",
            type: 'input',
            validate: (mnemonic) => {
                if (!mnemonic || bip39.validateMnemonic(mnemonic) || mnemonic.endsWith("!"))
                    return true;
                return "Invalid mnemonic. Add '!' at the end if you want to use it anyway."
            }
        }, {
            name: 'mnemonicStrength',
            message: "Choose mnemonic strength (128 to 256 bits)",
            type: 'input',
            default: 128,
            when: ({mnemonicInput}) => !mnemonicInput,
            validate: (strength, answers) => {
                strength = +strength;
                if (strength < 128) return "Strength must be >= 128";
                if (strength > 256) return "Strength must be <= 256";
                if (strength % 32 !== 0) return "Strength must be divisible by 32";
                return true;
            },
        }, {
            name: 'mnemonicPassword',
            message: "Enter mnemonic password (optional)",
            type: 'password',
            default: '',
        }, {
            name: 'mnemonicPassword2',
            message: "Re-enter mnemonic password",
            type: 'password',
            when: ({mnemonicPassword}) => mnemonicPassword,
            validate: (mnemonicPassword2, answers) => {
                if (mnemonicPassword2 !== answers.mnemonicPassword)
                    return "Passwords do not match";
                return true;
            },
        }, {
            name: 'derivationPath',
            message: "Enter derivation path (leave default if you don't know what that is)",
            type: 'input',
            default: "m/44'/60'/0'/0",
            validate: (derivationPath) => {
                try {
                    Wallet.fromMasterSeed("irrelevant").derive(derivationPath);
                    return true;
                } catch (e) {
                    console.log(e);
                    return "Invalid path: " + derivationPath;
                }
            },
        }, {
            name: 'walletPassword',
            message: "Enter password for the wallet file:",
            type: 'password',
            validate: (walletPassword) => {
                if (!walletPassword) return "Please enter password";
                const {score, feedback} = zxcvbn(walletPassword);
                if (score < 2) return feedback.warning + ". " + feedback.suggestions.join(" ");
                return true;
            },
        }, {
            name: 'walletPassword2',
            message: "Re-enter password for the wallet file:",
            type: 'password',
            validate: (walletPassword2, answers) => {
                if (walletPassword2 !== answers.walletPassword)
                    return "Passwords don't match";
                return true;
            },    
        }]).then(({mnemonicInput, mnemonicStrength, mnemonicPassword, derivationPath, walletPassword}) => {
            mnemonicInput = mnemonicInput.replace(/!$/, ""); // Strip "!" as an override mechanism.
            const mnemonic = mnemonicInput || bip39.generateMnemonic(+mnemonicStrength);
            if (!mnemonicInput) {
                console.log("Generated mnemonic: " + mnemonic);
                console.log("Be sure to write it down. This is the only time it's shown.");
            } else {
                console.log("Using mnemonic: " + mnemonic);
            }
    
            const masterKey = Wallet.fromMasterSeed(bip39.mnemonicToSeed(mnemonic, mnemonicPassword));
            const derivedKey = masterKey.derive(derivationPath);
    
            console.log("Encrypting the wallet, please wait a minute.");
            const derivedKeyText = JSON.stringify(derivedKey.toV3(walletPassword, {exportExtendedKey: true}), null, 2);
    
            fs.writeFileSync(walletPath, derivedKeyText);
            console.log(`Created new wallet '${walletPath}'`);
        });    
    });
};
