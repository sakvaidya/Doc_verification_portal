const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/auth.routes'));

app.use(errorHandler);

module.exports = app;
