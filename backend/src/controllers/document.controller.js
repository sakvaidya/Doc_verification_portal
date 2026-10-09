const documentService = require('../services/document.service');

exports.download = async (req, res) => {
  const { filePath, fileName } = await documentService.getFile(
    req.user, Number(req.params.id), Number(req.params.docNo)
  );
  res.download(filePath, fileName);
};
