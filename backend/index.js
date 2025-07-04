const express = require("express");
const cors = require("cors");
require("dotenv").config();

const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");

const app = express();
app.use(cors());
app.use(express.json());

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API LND Bitkaba",
    version: "1.0.0",
    description:
      "Documentation des endpoints pour interagir avec un noeud LND et une passerelle de paiement Fiat.",
  },
  servers: [{ url: "http://localhost:3000/api" }],
  tags: [
    {
      name: "Lightning",
      description: "API pour interagir avec LND (Lightning Network Daemon)",
    },
    {
      name: "Fiat Gateway",
      description: "API pour la passerelle de paiement en monnaie fiduciaire",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const lndRoutes = require("./routes/lndRoutes");
app.use("/api", lndRoutes);
app.use("/api", require("./routes/lnd.route"));
app.use("/api", require("./routes/client.lnd.route"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServeur BitKaba LND lancé sur le port ${PORT}`);

  console.log("----------------------------------------------------");

  console.log("Endpoints disponibles :");
  console.log("- GET    /api/getinfo");
  console.log("- GET    /api/balance");
  console.log("- GET    /api/invoices");
  console.log(
    '- POST   /api/invoice        (Body: { "sats": 1000, "description": "Test" })'
  );

  console.log(
    '- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })'
  );

  console.log(
    '- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'
  );

  console.log('- POST   /api/pay            (Body: { "request": "lnbc..." })');

  console.log(
    '- POST   /api/create-fiat-payment (Body: { "request": "lnbc..." })'
  );

  console.log("----------------------------------------------------\n");

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
  console.log("Documentation Swagger : http://localhost:3000/docs\n");
});
