require('dotenv').config();
const app = require('./app');

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Digital Heroes API listening on http://localhost:${port}`);
});
