const { connectToLnd } = require('./lnd');
connectToLnd(); // ← initialise la connexion LND AVANT d'importer les routes
const express = require('express');
const cors = require('cors');
const chalk = require('chalk').default;
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const { adminClients, userClients } = require("./grpcClient");

const app = express();

// --- Configuration CORS Robuste ---
// Placer la configuration CORS avant toutes les autres routes et middlewares est crucial.
// Cette configuration est plus explicite et autorise les requêtes depuis les ports
// couramment utilisés pour le développement frontend.
const corsOptions = {
  origin: [
    "http://localhost:4200", // Angular
    "http://localhost:8080", // Vue.js
    "http://localhost:5173", // Vite (React, Vue, Svelte)
    "http://127.0.0.1:5500", // VS Code Live Server
  ],
  methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware pour injecter les clients gRPC dans les requêtes
app.use((req, res, next) => {
  req.adminClients = adminClients;
  req.userClients = userClients;
  next();
});

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API LND Bitkaba',
    version: '1.0.0',
    description: 'Documentation des endpoints pour interagir avec un noeud LND et une passerelle de paiement Fiat.'
  },
  servers: [
    { url: 'http://localhost:3000/api' }
  ],
  tags: [
    {
      name: 'Lightning',
      description: 'API pour interagir avec LND (Lightning Network Daemon)'
    },
    {
      name: 'Fiat Gateway',
      description: 'API pour la passerelle de paiement en monnaie fiduciaire'
    }
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

<<<<<<< Updated upstream
const lndRoutes = require('./routes/lndRoutes');
app.use('/api', lndRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(chalk.green.bold(`\nServeur BitKaba LND lancé sur le port ${PORT}`));
  console.log(chalk.cyan('----------------------------------------------------'));
  console.log(chalk.yellow('Endpoints disponibles :'));
  console.log(chalk.blue('- GET    /api/getinfo'));
  console.log(chalk.blue('- GET    /api/balance'));
  console.log(chalk.blue('- GET    /api/invoices'));
  console.log(chalk.blue('- POST   /api/invoice        (Body: { "sats": 1000, "description": "Test" })'));
  console.log(chalk.blue('- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })'));
  console.log(chalk.blue('- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'));
  console.log(chalk.blue('- POST   /api/pay            (Body: { "request": "lnbc..." })'));
  console.log(chalk.blue('- POST   /api/create-fiat-payment (Body: { "request": "lnbc..." })'));
  console.log(chalk.cyan('----------------------------------------------------\n'));
  console.log(chalk.magenta('Documentation Swagger : http://localhost:3000/docs\n'));
});
=======
// It's better practice to combine routes into a single router or organize them by resource.
// This avoids potential conflicts and makes the structure clearer.
app.use("/api", require("./routes/lndRoutes")); // Contains Fiat Gateway and decode
app.use("/api/admin", require("./routes/lnd.route")); // Contains admin-level LND calls
app.use("/api/client", require("./routes/client.lnd.route")); // Contains client-specific calls

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServeur BitKaba LND lancé sur le port ${PORT}`);

  console.log("----------------------------------------------------");

  console.log("Admin Endpoints (prefix: /api/admin):");
  console.log("  - GET    /getinfo");
  console.log("  - GET    /invoices");
  console.log("  - POST   /holdinvoice");
  console.log("\nClient Endpoints (prefix: /api/client):");
  console.log("  - GET    /getinfo");
  console.log("  - GET    /balance");
  console.log("  - POST   /pay");
  console.log("\nGateway Endpoints (prefix: /api):");
  console.log("  - POST   /create-fiat-payment");
  console.log("  - POST   /decode-invoice");
  console.log("Documentation Swagger : http://localhost:3000/docs\n");
});
>>>>>>> Stashed changes
