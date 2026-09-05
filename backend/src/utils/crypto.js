const crypto = require('crypto');

function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function sign(text, privateKey) {
  return crypto.sign('sha256', Buffer.from(text), privateKey).toString('base64');
}

function verify(text, publicKey, signature) {
  return crypto.verify('sha256', Buffer.from(text), publicKey, Buffer.from(signature, 'base64'));
}

module.exports = { generateKeyPair, sign, verify };
