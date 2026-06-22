const multer = require("multer");

// Memory storage — no disk writes. Files available as req.file.buffer
const upload = multer({ storage: multer.memoryStorage() });

module.exports = upload;
