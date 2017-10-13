const colors = require('colors/safe');

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

