require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Ce fichier centralise la création des clients gRPC pour LND.

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Charger les fichiers .proto
const packageDefinition = protoLoader.loadSync(
  [
    path.resolve(__dirname, "./lightning.proto"),
    path.resolve(__dirname, "./invoices.proto"),
    path.resolve(__dirname, "./router.proto"), // Ajout du proto pour le service Router
  ],
  loaderOptions
);

const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
const lnrpc = lnrpcDescriptor.lnrpc;
const invoicesrpc = lnrpcDescriptor.invoicesrpc;
const routerrpc = lnrpcDescriptor.routerrpc; // Récupération du package routerrpc

/**
 * Crée une instance de client gRPC avec les credentials fournis.
 * @param {string} macaroonHex - Le macaroon en format hexadécimal.
 * @returns {{lightning: lnrpc.Lightning, invoices: invoicesrpc.Invoices, router: routerrpc.Router}}
 */
function createClient(macaroonHex) {
  const metadata = new grpc.Metadata();
  metadata.add("macaroon", macaroonHex);

  const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
    (args, callback) => callback(null, metadata)
  );

  // Pour se connecter à un nœud distant avec un certificat public (comme Voltage),
  // on utilise createSsl() sans argument. Cela utilise le magasin de certificats
  // de confiance du système, qui connaît déjà les autorités comme Let's Encrypt.
  const sslCreds = grpc.credentials.createSsl();

  const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

  const lndHost = process.env.LND_GRPC_HOST;

  const lightning = new lnrpc.Lightning(lndHost, credentials);
  const invoices = new invoicesrpc.Invoices(lndHost, credentials);
  const router = new routerrpc.Router(lndHost, credentials);

  return { lightning, invoices, router };
}


let adminClients, userClients;

try {
  if (!process.env.LND_GRPC_HOST || !process.env.LND_MACAROON || !process.env.LND_MACAROON2) {
    throw new Error("Les variables d'environnement LND_GRPC_HOST, LND_MACAROON et LND_MACAROON2 sont requises.");
  }

  /**
   * S'assure qu'un macaroon est au format hexadécimal.
   * Si la chaîne est déjà en hex, la retourne.
   * Sinon, suppose qu'elle est en base64 et la convertit.
   * @param {string} macaroon - Le macaroon en base64 ou hex.
   * @returns {string} Le macaroon en hex.
   */
  function ensureHex(macaroon) {
    // Vérifie si la chaîne est déjà en hexadécimal (ne contient que des caractères 0-9 et a-f)
    if (/^[0-9a-fA-F]+$/.test(macaroon)) {
      return macaroon;
    }
    // Sinon, la convertit depuis le format base64
    return Buffer.from(macaroon, 'base64').toString('hex');
  }

  const adminMacaroon = ensureHex(process.env.LND_MACAROON);
  const clientMacaroon = ensureHex(process.env.LND_MACAROON2);

  adminClients = createClient(adminMacaroon);
  userClients = createClient(clientMacaroon);

} catch (error) {
  console.error("\nERREUR CRITIQUE: Impossible de créer les clients gRPC pour LND.");
  console.error("Vérifiez que les variables LND_GRPC_HOST, LND_MACAROON, et LND_MACAROON2 sont correctement définies dans votre fichier .env.");
  console.error("Détail de l'erreur:", error.message);
  process.exit(1); // Arrête le serveur si la configuration est invalide
}

module.exports = {
  adminClients,
  userClients,
};
