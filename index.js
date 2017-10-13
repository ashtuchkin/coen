const inquirer = require('inquirer'),
      bip39 = require('bip39'),
      hdkey = require('hdkey'),
      ethUtil = require('ethereumjs-util'),
      etx = require('ethereumjs-tx'),
      Wallet = require('./wallet').Wallet,
      BN = ethUtil.BN;
/*
// Generate mnemonic:
var mnemonic = bip39.generateMnemonic();
//console.log(mnemonic);

mnemonic = 'among cream near ancient deer tuition peasant evoke someone scorpion helmet slow';

var derivationPath = "m/44'/60'/0'/0";
var masterKey = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic, ''));
var parentKey = masterKey.derive(derivationPath);


var key = parentKey.deriveChild(0);
var privateKey = key.privateKey;
console.log("Private key: " + privateKey.toString('hex'));

var addr = ethUtil.privateToAddress(privateKey);
addr = ethUtil.toChecksumAddress(addr.toString('hex'));
console.log("Address: " + addr);

var privateKey2 = parentKey.deriveChild(1).privateKey;

key.privateExtendedKey (str) -> HDKey.fromExtendedKey()
*/

require('./sign')();
