const inquirer = require('inquirer'),
      bip39 = require('bip39'),
      ethUtil = require('ethereumjs-util'),
      BN = ethUtil.BN,
      EthTransaction = require('ethereumjs-tx'),
      {openWallet} = require('./common'),
      qrcode = require('qrcode'),
      utils = require('../utils');

module.exports = (walletPath, value, targetAddress, options) => {
    if (!ethUtil.isValidChecksumAddress(targetAddress))
        throw Error("Invalid target address. Make sure it's checksummed.");

    value = +value;
    if (isNaN(value) || value <= 0)
        throw Error("Invalid amount to send.");

    if (options.data)
        options.data = ethUtil.toBuffer(options.data);
    else
        options.data = "";
    
    if (options.gasLimit) {
        options.gasLimit = +options.gasLimit;
        if (isNaN(options.gasLimit) || options.gasLimit < 21000)
            throw Error("Invalid Gas Limit");
    } else {
        options.gasLimit = 21000;
    }

    const canProceed = options.parent.allowOnline ? Promise.resolve(true) : utils.checkOffline();
    
    return canProceed.then((canProceed) => {
        if (!canProceed) {
            console.log("You're connected to internet. Please disconnect or supply --allow-online option.");
            return;
        }

        const checkDerivationDepth = (wallet) => 
            wallet.getDepth() == 4 ? wallet :
            inquirer.prompt([{
                name: 'confirmDepth',
                type: 'confirm',
                message: `WARNING: Derivation depth is ${wallet.getDepth()}, the usual being 4, would you like to continue?`,
            }]).then(({confirmDepth}) => 
                confirmDepth ? wallet : Promise.reject(new Error("See you!"))
            );

        return openWallet(walletPath)
            .then(checkDerivationDepth)
            .then((wallet) =>
                inquirer.prompt([{
                    name: 'gasPrice',
                    type: 'input',
                    message: 'Gas Price (in gwei)',
                    default: 10,
                    validate: (gasPrice) => {
                        gasPrice = +gasPrice;
                        if (isNaN(gasPrice) || gasPrice <= 0)
                            return "Invalid price";
                        if (gasPrice > 100)
                            return "Price too high - are you sure?";
                        return true;
                    },
                }, {
                    name: 'nonce',
                    type: 'input',
                    message: 'Wallet nonce',
                    validate: (nonce) => {
                        if (nonce.length == 0)
                            return "Enter nonce";
                        nonce = +nonce;
                        if (isNaN(nonce) || nonce < 0 || Math.round(nonce) !== nonce)
                            return "Invalid nonce - must be a non-negative integer";
                        return true;
                    }
                }]).then(({gasPrice, nonce}) => ({
                    gasPrice: +gasPrice,
                    nonce: +nonce,
                    wallet: wallet,
                }))
            ).then(({wallet, gasPrice, nonce}) => {
                // Sign.
                const etherToWei = new BN('1000000000000000000');
                const gweiToWei = new BN('1000000000');
                const floatConvert = (value, base) =>
                    base.muln(+value * 1000000).divn(1000000);  // BN only supports integers.

                const rawTx = {
                    nonce: new BN(nonce),
                    gasPrice: floatConvert(gasPrice, gweiToWei),
                    gasLimit: new BN(options.gasLimit),
                    to: targetAddress,
                    value: floatConvert(value, etherToWei),
                    data: options.data,
                    chainId: 1,
                };
        
                const tx = new EthTransaction(rawTx);            
                tx.sign(wallet.getPrivateKey());
                const txStr = "0x" + tx.serialize().toString('hex');

                console.log("\nRaw transaction: " + txStr);
                console.log(utils.QRCodeToStringCompact(qrcode.create(txStr)));
            });
    });
};