const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", require("./routes/lnd.route"));
app.use("/api", require("./routes/client.lnd.route"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API LND en écoute sur le port ${PORT}`);
  console.log("----------------------------------------------------");
  console.log("Endpoints disponibles :");
  console.log("- GET    /api/getinfo");

  console.log(
    '- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "exipry": })'
  );
  console.log(
    '- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'
  );
  console.log("----------------------------------------------------");
  console.log("Endpoints disponibles coté client :");
  console.log(
    '- POST   /api/client/pay            (Body: { "payment_request": "lnbc...", "amount": 1000 })'
  );
  console.log("- POST   /api/client/balance");
  console.log("- GET    /api/client/getinfo");
});
