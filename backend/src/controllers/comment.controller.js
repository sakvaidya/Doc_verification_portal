const commentService = require('../services/comment.service');

exports.post = async (req, res) =>
  res.status(201).json(
    await commentService.post(req.user, Number(req.params.id), req.body.message, req.body.parentCommentNo)
  );
