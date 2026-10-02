const authService = require('../services/auth.service');

exports.register = async (req, res) => res.status(201).json(await authService.register(req.body));
exports.login = async (req, res) => res.json(await authService.login(req.body.email, req.body.password));
exports.listFaculty = async (req, res) => res.json(await authService.listFaculty());
