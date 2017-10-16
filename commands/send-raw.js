const ethUtil = require('ethereumjs-util'),
      BN = ethUtil.BN;
      inquirer = require('inquirer'),
      ethTransaction = require('ethereumjs-tx'),
      {ethRequest} = require('../utils');

module.exports = (rawTx, options) => {
    const buf = ethUtil.toBuffer(rawTx);
    if (!buf.length)
        throw new Error("Invalid hex string");

    const tx = new ethTransaction(buf);
    const etherToWei = new BN('1000000000000000000');
    const gweiToWei = new BN('1000000000');

    return Promise.all([
        ethRequest("eth_getBalance", "0x"+tx.from.toString('hex'), "latest").then(ethUtil.toBuffer),
        ethRequest("eth_getBalance", "0x"+tx.to.toString('hex'), "latest").then(ethUtil.toBuffer),
        ethRequest("eth_getTransactionCount", "0x"+tx.from.toString('hex'), "latest").then(ethUtil.toBuffer),
    ]).then(([fromBalance, toBalance, fromNonce]) => {
        const toAddr = (val) => ethUtil.toChecksumAddress(val.toString('hex'));
        const toEth = (val, base=etherToWei) => new BN(val).muln(1e6).div(base)/1e6;
        const nonceCmp = new BN(tx.nonce).cmp(new BN(fromNonce));
        const nonceMessage = nonceCmp > 0 
            ? `[Error: Too high; currrent value in network: ${new BN(fromNonce)}]`
            : nonceCmp < 0
                ? `[Error: Stale; current value in network: ${new BN(fromNonce)}]`
                : `[correct]`;
        
        console.log(`Transaction parameters: `);
        console.log(`  From:  ${toAddr(tx.from)} [${toEth(fromBalance)} Eth]`);
        console.log(`  To:    ${toAddr(tx.to)} [${toEth(toBalance)} Eth]`);
        console.log(`  Value: ${toEth(tx.value)} Eth`);
        console.log(`  Nonce: ${new BN(tx.nonce)} ${nonceMessage}`);
        console.log(`  Gas Price: ${toEth(tx.gasPrice, gweiToWei)} Gwei`);
        console.log(`  Gas Limit: ${new BN(tx.gasLimit)}`);
        console.log(`  Data: "${tx.data.toString('hex')}"`);
    
        return inquirer.prompt([{
            name: 'confirmation',
            message: 'Would you like to send this transaction?',
            type: 'confirm',
            default: false,
        }]).then(({confirmation}) => {
            if (!confirmation) return;
            return ethRequest("eth_sendRawTransaction", rawTx)
                .then((result) => console.log(`Success. Transaction hash: ${result}`))
                .catch((err) => {console.error("Error: "); console.error(err); });
        });
    });
};