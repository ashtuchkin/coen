const ethUtil = require('ethereumjs-util'),
      crypto = require('crypto'),
      {encodeCrypto, decodeCrypto} = require('./utils'),
      HDKey = require('hdkey'),
      cs = require('coinstring'),
      assert = require('assert'),
      uuid = require('uuid');

class Wallet {
    constructor(key) {
        if (key instanceof HDKey) {
            this.hdkey = key;
        } else if (Buffer.isBuffer(key)) {
            assert(key.length == 32, "Invalid private key length: " + key.length + " (must be 32)");
            this.hdkey = new HDKey();
            this.hdkey.privateKey = key;
        } else
            assert(false, "Invalid private key type: " + typeof key);
    }

    getPrivateKey() {
        // Private key is a 32 byte buffer.
        return this.hdkey.privateKey;
    }
    getPrivateKeyString() {
        return (this.getPrivateKey() != null) ? this.getPrivateKey().toString('hex') : "";
    }
    getPrivateExtendedKey() {
        if (!this.hdkey.chainCode)
            throw new Error("Cannot get extended info from this wallet - it lacks information needed for derivation.");
        return this.hdkey.privateExtendedKey || "";
    }

    getPublicKey() {
        // Public key in Ethereum is uncompressed => 64 byte buffer.
        if (this.hdkey.privateKey)
            return ethUtil.privateToPublic(this.hdkey.privateKey);
        else if (this.hdkey.publicKey)
            return ethUtil.importPublic(this.hdkey.publicKey)
        else
            assert(false, "Wallet not initialized - can't get public key.");
    }
    getPublicKeyString() {
        return pubKey ? '0x' + this.getPublicKey().toString('hex') : "";
    }
    getPublicExtendedKey() {
        if (!this.hdkey.chainCode)
            throw new Error("Cannot get extended info from this wallet - it lacks information needed for derivation.");
        return this.hdkey.publicExtendedKey || "";
    }

    getAddress() {
        return ethUtil.publicToAddress(this.getPublicKey());
    }
    getAddressString() {
        return '0x' + this.getAddress().toString('hex');
    }
    getChecksumAddressString() {
        return ethUtil.toChecksumAddress(this.getAddressString());
    }


    derive(path) {
        // Derive supports both public and private keys.
        if (!this.hdkey.chainCode)
            throw new Error("Cannot derive from this wallet - it lacks information needed for derivation.");
        return new Wallet(this.hdkey.derive(path));
    }

    deriveChild(idx, isHardened) {
        if (!this.hdkey.chainCode)
            throw new Error("Cannot derive from this wallet - it lacks information needed for derivation.");
        return new Wallet(this.hdkey.deriveChild(idx + (isHardened ? HDKey.HARDENED_OFFSET : 0)));
    }

    getDepth() {
        return this.hdkey.depth;
    }

    getV3Filename(timestamp) {
        const ts = timestamp ? new Date(timestamp) : new Date();
        return ['UTC--', ts.toJSON().replace(/:/g, '-'), '--', this.getAddress().toString('hex')].join('');
    }
    toV3(password, opts = {}) {
        const uuidRandom = opts.uuid || crypto.randomBytes(16);
        const json = {
            version: 3,
            id: uuid.v4({random: uuidRandom}),
            address: this.getAddress().toString('hex'),
        };
        if (this.getPrivateKey())
            json.crypto = encodeCrypto(this.getPrivateKey(), password, opts);

        if (opts.exportExtendedKey)
            json.xpub = this.getPublicExtendedKey();

        return json;
    }

    static fromV3(json, password) {
        if (json.version !== 3) {
            throw new Error('Not a V3 wallet');
        }

        const hdkey = json.xpub ? HDKey.fromExtendedKey(json.xpub) : new HDKey();
        if (json.crypto)
            hdkey.privateKey = ethUtil.setLength(decodeCrypto(json.crypto, password), 32)
        return new Wallet(hdkey);
    }

    static fromV3AsPublic(json) {
        if (json.version !== 3)
            throw new Error('Not a V3 wallet');

        if (json.xpub)
            return Wallet.fromExtendedKey(json.xpub);
        // TODO: Return wallet with just address if no xpub key.
    }

    static fromMasterSeed(seedBuffer) {
        return new Wallet(HDKey.fromMasterSeed(seedBuffer));
    }

    static fromExtendedKey(extendedKey) {
        // Both PrivateExtendedKey and PublicExtendedKey are supported.
        return new Wallet(HDKey.fromExtendedKey(extendedKey));
    }
}

module.exports = Wallet;