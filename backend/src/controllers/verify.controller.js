const signatureService = require('../services/signature.service');

exports.verify = async (req, res) => res.json(await signatureService.verifySignature(req.params.code));
exports.download = async (req, res) => {
  const { filePath, fileName } = await signatureService.getVerifiedFile(req.params.code);
  res.download(filePath, fileName);
};
