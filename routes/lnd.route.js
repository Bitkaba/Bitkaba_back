require("dotenv").config();
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const crypto = require("crypto");

const router = express.Router();

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const packageDefinition = protoLoader.loadSync(
  ["lightning.proto", "invoices.proto"],
  loaderOptions
);

const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
const lnrpc = lnrpcDescriptor.lnrpc;
const invoicesrpc = lnrpcDescriptor.invoicesrpc;

// Prépare les credentials une seule fois
process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";
let macaroon = process.env.LND_MACAROON;
if (/[^a-fA-F0-9]/.test(macaroon)) {
  macaroon = Buffer.from(macaroon, "base64").toString("hex");
}
let metadata = new grpc.Metadata();
metadata.add("macaroon", macaroon);
let macaroonCreds = grpc.credentials.createFromMetadataGenerator(
  (args, callback) => {
    callback(null, metadata);
  }
);

const sslCreds = grpc.credentials.createSsl();
let credentials = grpc.credentials.combineChannelCredentials(
  sslCreds,
  macaroonCreds
);

let invoicesClient = new invoicesrpc.Invoices(
  process.env.LND_GRPC_HOST,
  credentials
);

// Route pour créer une hold invoice
router.post("/holdinvoice", async (req, res) => {
  try {
    const { amount, description, expiry } = req.body;
    const preimage = crypto.randomBytes(32);
    const hash = crypto.createHash("sha256").update(preimage).digest();

    const request = {
      memo: description || "Hold Invoice",
      hash: hash,
      value: amount || 1000,
      expiry: expiry || 3600,
    };

    invoicesClient.AddHoldInvoice(request, (err, response) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        invoice: response,
        preimage: preimage.toString("hex"),
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exemple route pour vérifier la connexion LND
router.get("/getinfo", (req, res) => {
  let client = new lnrpc.Lightning(process.env.LND_GRPC_HOST, credentials);
  client.getInfo({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

//Route pour faire un settle invoice
router.post("/settleinvoice", async (req, res) => {
  try {
    const { id, secret } = req.body;
    if (!id || !secret) {
      return res
        .status(400)
        .json({ error: "Both `id` and `secret` are required." });
    }

    let call = invoicesClient.subscribeSingleInvoice(id);

    let responded = false;

    call.on("invoice_updated", async (invoice) => {
      if (responded) return;

      if (!invoice.is_held) {
        responded = true;
        call.removeAllListeners();
        return res.status(400).json({ error: "Invoice is not held." });
      }

      if (invoice.is_confirmed) {
        responded = true;
        call.removeAllListeners();
        return res.status(400).json({ error: "Invoice already settled." });
      }

      try {
        const hash = crypto.createHash("sha256").update(secret).digest();

        const request = {
          preimage: hash,
        };

        invoicesClient.SettleInvoice(request, (err, response) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({
            settled: response,
          });
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;
  try {
    await invoicesClient.CancelInvoice({ id });
    res.json({ message: "Invoice cancelled" });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res
      .status(500)
      .json({ error: "Failed to cancel invoice.", details: error });
  }
});

module.exports = router;
