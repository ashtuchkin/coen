#!/usr/bin/env node

const program = require('commander');

program
    .version(require('./package.json').version)
    .description(require('./package.json').description)
    .option("--allow-online", "allow online operation")
    .usage('<command> [options]');

program
    .command('create <wallet>')
    .description('generate new wallet')
    .action((wallet, options) => {
        require('./commands/create')(wallet, options);
    });

program
    .command('send <wallet:idx> <value> <to_address>')
    .description('create offline transaction to send funds')
    .option("--gasLimit", "Gas Limit", 21000)
    .option("--data", "Data to pass, in hex")
    .action((wallet, value, address, options) => {
        require('./commands/send')(wallet, value, address, options);
    });

program
    .command('show <wallet:idx> [range]')
    .description('show wallet addresses')
    .action((wallet, range, options) => {
        require('./commands/show')(wallet, range, options);
    });

program
    .command('export <wallet:idx>')
    .description('show extended public address of the wallet')
    .action((wallet, options) => {
        require('./commands/export')(wallet, options);
    });

program
    .command('import <wallet:idx>')
    .description('create a wallet from extended public address')
    .action((wallet, options) => {
        require('./commands/import')(wallet, options);
    });

program
    .command('send-raw <raw tx>')
    .description('create a wallet from extended public address')
    .action((rawTx, options) => {
        require('./commands/send-raw')(rawTx, options);
    });

program
    .command('*', null, {noHelp: true})
    .action(() => {
        program.help((str) => str + "\n");
    });

program.parse(process.argv);
if (!program.args.length)
    program.emit('command:*');
