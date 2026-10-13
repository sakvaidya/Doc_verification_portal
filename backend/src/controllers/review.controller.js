const reviewService = require('../services/review.service');

exports.approve = async (req, res) =>
  res.json(await reviewService.approve(req.user, Number(req.params.id), Number(req.params.stepNo)));
exports.reject = async (req, res) =>
  res.json(await reviewService.reject(req.user, Number(req.params.id), Number(req.params.stepNo), req.body.remark));
