const inquirer = require('inquirer'),
      fs = require('fs'),
      hdkey = require('hdkey'),
      bip39 = require('bip39'),
      ethUtil = require('ethereumjs-util'),
      BN = ethUtil.BN,
      EthTransaction = require('ethereumjs-tx'),
      Wallet = require('./wallet').Wallet,
      qrcode = require('qrcode'),
      utils = require('./utils');

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
        message: 'Amount to send (ETH)',
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

        // Sign.
        const microEther = new BN('1000000000000');        
        const rawTx = {
            nonce: new BN(nonce),
            gasPrice: new BN(gasPrice),
            gasLimit: new BN(gasLimit),
            to: targetAddress,
            value: microEther.muln(+value * 1000000),  // BN only supports integers.
            data: data,
            chainId: 1,
        };

        const tx = new EthTransaction(rawTx);
        console.log("tx data: " + JSON.stringify(tx));
        
        tx.sign(wallet.getPrivateKey());
        const txStr = "0x" + tx.serialize().toString('hex');
        console.log("Transaction: " + txStr);
        console.log(utils.QRCodeToStringCompact(qrcode.create(txStr)));
    });
};