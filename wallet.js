'use strict';
// Inspired by MyEthereumWallet.

const ethUtil = require('ethereumjs-util'),
      crypto = require('crypto'),
      scrypt = require('scryptsy'),
      uuid = require('uuid');

class Wallet {
    constructor(priv, pub) {
        if (typeof priv != "undefined") {
            this.privKey = priv.length == 32 ? priv : Buffer(priv, 'hex');
        }
        this.pubKey = pub;
    }

    getPrivateKey() {
        return this.privKey;
    }
    getPrivateKeyString() {
        if (typeof this.privKey != "undefined") {
            return this.getPrivateKey().toString('hex');
        } else {
            return "";
        }
    }
    getPublicKey() {
        if (typeof this.pubKey == "undefined") {
            return ethUtil.privateToPublic(this.privKey);
        } else {
            return this.pubKey;
        }
    }
    getPublicKeyString() {
        if (typeof this.pubKey == "undefined") {
            return '0x' + this.getPublicKey().toString('hex');
        } else {
            return "0x" + this.pubKey.toString('hex');
        }
    }
    getAddress() {
        if (typeof this.pubKey == "undefined") {
            return ethUtil.privateToAddress(this.privKey);
        } else {
            return ethUtil.publicToAddress(this.pubKey, true);
        }
    }

    getAddressString() {
        return '0x' + this.getAddress().toString('hex');
    }
    getChecksumAddressString() {
        return ethUtil.toChecksumAddress(this.getAddressString());
    }


    toV3(password, opts = {}) {
        const uuidRandom = opts.uuid || crypto.randomBytes(16);
        const cipher = opts.cipher || 'aes-128-ctr';
        const iv = opts.iv || crypto.randomBytes(16);
        const kdf = opts.kdf || 'scrypt';
        const kdfparams = {};

        const derivedKey = Wallet._deriveKeyV3(password, kdf, kdfparams, opts);
        const cipherStream = crypto.createCipheriv(cipher, derivedKey.slice(0, 16), iv);
        if (!cipherStream) {
            throw new Error('Unsupported cipher');
        }

        const ciphertext = Buffer.concat([cipherStream.update(this.privKey), cipherStream.final()]);
        const mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), new Buffer(ciphertext, 'hex')]));
        return {
            version: 3,
            id: uuid.v4({random: uuidRandom}),
            address: this.getAddress().toString('hex'),
            crypto: {
                ciphertext: ciphertext.toString('hex'),
                cipherparams: {
                    iv: iv.toString('hex')
                },
                cipher: cipher,
                kdf: kdf,
                kdfparams: kdfparams,
                mac: mac.toString('hex'),
            }
        };
    }
    getV3Filename(timestamp) {
        const ts = timestamp ? new Date(timestamp) : new Date();
        return ['UTC--', ts.toJSON().replace(/:/g, '-'), '--', this.getAddress().toString('hex')].join('');
    }

    static fromV3(input, password, nonStrict) {
        const json = (typeof input === 'object') ? input : JSON.parse(nonStrict ? input.toLowerCase() : input);
        if (json.version !== 3) {
            throw new Error('Not a V3 wallet');
        }

        const {kdf, kdfparams, cipher, cipherparams, ciphertext, mac} = json.crypto;
        const derivedKey = Wallet._deriveKeyV3(password, kdf, kdfparams);
        const ciphertextBuf = new Buffer(ciphertext, 'hex');
        const macCalc = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertextBuf])).toString('hex');
        if (macCalc !== mac) {
            throw new Error('Key derivation failed - possibly wrong passphrase');
        };
        const decipherStream = crypto.createDecipheriv(
            cipher, derivedKey.slice(0, 16), new Buffer(cipherparams.iv, 'hex')
        );
        let seed = Buffer.concat([decipherStream.update(ciphertextBuf), decipherStream.final()]);
        while (seed.length < 32) {
            const nullBuff = new Buffer([0x00]);
            seed = Buffer.concat([nullBuff, seed]);
        }
        return new Wallet(seed);
    }

    static _deriveKeyV3(password, kdf, kdfparams, opts) {
        if (opts) {
            kdfparams.dklen = opts.dklen || 32;
            kdfparams.salt = (opts.salt || crypto.randomBytes(32)).toString('hex');
        }
        if (kdf === 'scrypt') {
            if (opts) {
                kdfparams.n = opts.n || 262144;
                kdfparams.r = opts.r || 8;
                kdfparams.p = opts.p || 1;
            }
            return scrypt(
                new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen
            );
        } else if (kdf === 'pbkdf2') {
            if (opts) {
                kdfparams.c = opts.c || 262144;
                kdfparams.prf = 'hmac-sha256';
            }
            if (kdfparams.prf !== 'hmac-sha256') {
                throw new Error('Unsupported parameters to PBKDF2');
            }
            return crypto.pbkdf2Sync(
                new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256'
            );
        } else {
            throw new Error('Unsupported key derivation scheme');
        }
    }
}

exports.Wallet = Wallet;