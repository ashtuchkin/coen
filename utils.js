const colors = require('colors/safe'),
      ethUtil = require('ethereumjs-util'),
      crypto = require('crypto'),
      request = require('request-promise-native'),
      scrypt = require('scryptsy'),
      dns = require('dns');

// converts qr code to a terminal-printable string, with compact representation.
// usage: console.log(QRCodeToStringCompact(qrcode.create(text)));
exports.QRCodeToStringCompact = (code) => {
    const {size, data} = code.modules;
    const neg = colors.black.bgWhite, pos = colors.white.bgBlack;
    const chars = [[neg(' '), neg('▄')], [pos('▄'), pos(' ')]];
    
    let out =  '';
    for (let j = 0; j < size+4; j++) out += chars[0][0]; out += '\n';
    for (let i = 0; i < size; i += 2) {
        out += chars[0][0] + chars[0][0];
        for (let j = 0; j < size; j++) {
            const bit1 = data[(i+0) * size + j];
            const bit2 = (i+1 < size) ? data[(i+1) * size + j] : 0;
            out += chars[bit1][bit2];
        }
        out += chars[0][0] + chars[0][0] + '\n';
    }
    for (let j = 0; j < size+4; j++) out += chars[0][1];
    return out;
};


exports.checkOffline = () => {
    return new Promise((resolve, reject) => {
        dns.lookupService('8.8.8.8', 53, function(err, address, family) {
            resolve(!!err);
        });
    });
};

exports.ethRequest = (method, ...params) => {
    return request({
        url: "https://mainnet.infura.io/",
        method: "POST",
        body: {
            jsonrpc: "2.0",
            id: 1, 
            method: method,
            params: params,
        },
        json: true,      
    }).then(({result}) => result);
};

function _deriveKeyV3(password, kdf, kdfparams, opts) {
    if (opts) {
        kdfparams.dklen = opts.dklen || 32;
        kdfparams.salt = (opts.salt || crypto.randomBytes(32)).toString('hex');
    }
    if (kdf === 'scrypt') {
        if (opts) {
            kdfparams.n = opts.n || 32768;
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

exports.encodeCrypto = (privKey, password, opts = {}) => {
    const cipher = opts.cipher || 'aes-128-ctr';
    const iv = opts.iv || crypto.randomBytes(16);
    const kdf = opts.kdf || 'scrypt';
    const kdfparams = {};
    
    const derivedKey = _deriveKeyV3(password, kdf, kdfparams, opts);
    const cipherStream = crypto.createCipheriv(cipher, derivedKey.slice(0, 16), iv);
    const ciphertextBuf = Buffer.concat([cipherStream.update(privKey), cipherStream.final()]);
    const mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertextBuf]));

    return {
        ciphertext: ciphertextBuf.toString('hex'),
        cipherparams: {
            iv: iv.toString('hex')
        },
        cipher: cipher,
        kdf: kdf,
        kdfparams: kdfparams,
        mac: mac.toString('hex'),
    };
}

exports.decodeCrypto = (obj, password) => {
    const {kdf, kdfparams, cipher, cipherparams, ciphertext, mac} = obj;

    const derivedKey = _deriveKeyV3(password, kdf, kdfparams);
    const ciphertextBuf = new Buffer(ciphertext, 'hex');
    const macCalc = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertextBuf])).toString('hex');
    if (macCalc !== mac)
        throw new Error('Wrong password.');
    const decipherStream = crypto.createDecipheriv(
        cipher, derivedKey.slice(0, 16), new Buffer(cipherparams.iv, 'hex')
    );
    return Buffer.concat([decipherStream.update(ciphertextBuf), decipherStream.final()]);
}

