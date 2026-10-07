const applicationService = require('../services/application.service');

exports.create = async (req, res) =>
  res.status(201).json(await applicationService.create(req.user, req.body, req.files));
exports.listMine = async (req, res) => res.json(await applicationService.listMine(req.user));
exports.listAssigned = async (req, res) => res.json(await applicationService.listAssigned(req.user));
exports.listAll = async (req, res) => res.json(await applicationService.listAll());
exports.getDetail = async (req, res) =>
  res.json(await applicationService.getDetail(req.user, Number(req.params.id)));
exports.forward = async (req, res) =>
  res.json(await applicationService.forward(req.user, Number(req.params.id), req.body.facultyUserId));
