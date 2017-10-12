const inquirer = require('inquirer'),
      fs = require('fs'),
      hdkey = require('hdkey'),
      bip39 = require('bip39'),
      ethUtil = require('ethereumjs-util'),
      etx = require('ethereumjs-tx'),
      Wallet = require('./wallet').Wallet,
      BN = ethUtil.BN;

module.exports = () => {
    return inquirer.prompt([{
        name: 'walletFileName',
        message: "Wallet filename",
        type: 'input',
        default: '~/Private/wallet.json',
        validate: (walletFileName, answers) => {
            try {
                const json = JSON.parse(fs.readFileSync(walletFileName, {encoding: 'utf8'}));
                if (json.version !== 3)
                    return "Invalid file format";
                answers.walletFileContents = json;
                return true;
            }
            catch (e) {
                return e.message;
            }
        },
    }, {
        name: 'walletPassword',
        type: 'password',
        message: 'Password',
        validate: (walletPassword, answers) => {
            try {
                const wallet = Wallet.fromV3(answers.walletFileContents, walletPassword);
                console.log("\nWallet read successfully. Public key " + wallet.getChecksumAddressString());
                answers.wallet = wallet;
                return true;
            } catch (e) {
                return e.message;
            }
        },
    // }, {
    //     name: 'derivePath',
    //     type: 'input',
    //     message: 'Derivation Path',
    //     default: '0',
    //     validate: (derivePath, answers) => {
    //         try {
    //             answers.wallet = 
    //         } catch (e) {
    //             return e.message;
    //         }
    //     },
    }, {
        name: 'targetAddress',
        type: 'input',
        message: 'Target Address',
        validate: (targetAddress) => {
            if (!ethUtil.isValidChecksumAddress(targetAddress))
                return "Invalid address. Make sure it's checksummed."
            return true;
        },
    }, {
        name: 'value',
        type: 'input',
        message: 'Amount to send (mETH)',
    }, {
        name: 'gasLimit',
        type: 'input',
        message: 'Gas Limit',
        default: 21000,
    }, {
        name: 'gasPrice',
        type: 'input',
        message: 'Gas Price',
        default: 21000000000,
    }, {
        name: 'nonce',
        type: 'input',
        message: 'Source Address Nonce',
        default: 0,
    }, {
        name: 'data',
        type: 'input',
        message: 'Data',
    }]).then(({wallet, targetAddress, value, gasLimit, gasPrice, nonce, data}) => {

        var milliether = new BN('1000000000000000', 10);
        
        // Sign.
        var tx = {
            nonce: +nonce,
            gasPrice: +gasPrice, //sanitizeHex('04e3b29200'),
            gasLimit: +gasLimit,
            to: targetAddress,
            value: "0x"+milliether.muln(+value).toString(16), //sanitizeHex('0x4615 343e 73b9 0000'),
            data: data,
            chainId: 1,
        };

        tx = new etx(tx);
        console.log("tx data: " + JSON.stringify(tx));
        
        tx.sign(wallet.getPrivateKey());
        console.log("Transaction: 0x" + tx.serialize().toString('hex'));
    });
};