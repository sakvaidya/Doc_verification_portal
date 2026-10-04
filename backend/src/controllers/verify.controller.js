const signatureService = require('../services/signature.service');

exports.verify = async (req, res) =>
  res.json(await signatureService.verifySignature(Number(req.params.signatureId)));
