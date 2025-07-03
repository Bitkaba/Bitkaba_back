const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", require("./routes/lnd.route"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API LND en écoute sur le port ${PORT}`);
  console.log("----------------------------------------------------");
  console.log("Endpoints disponibles :");
  console.log("- GET    /api/getinfo");

  console.log(
    '- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })'
  );
  console.log(
    '- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'
  );
  console.log('- POST   /api/pay            (Body: { "request": "lnbc..." })');
});
