require("dotenv").config();
const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Route pour créer une hold invoice
router.post("/holdinvoice", async (req, res) => {
  const { amount, description, expiry } = req.body;
  const preimage = crypto.randomBytes(32);
  const hash = crypto.createHash("sha256").update(preimage).digest();

  try {
    const request = {
      memo: description || "Hold Invoice",
      hash: hash,
      value: amount || 1000,
      expiry: expiry || 3600,
    };

    const addInvoiceResponse = await new Promise((resolve, reject) => {
      req.adminClients.invoices.AddHoldInvoice(request, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    // Après la création, on recherche la facture pour obtenir tous ses détails
    const fullInvoice = await new Promise((resolve, reject) => {
      // On utilise le `hash` que nous avons nous-mêmes créé, car c'est le r_hash de la facture.
      // La réponse de `AddHoldInvoice` ne contient pas le r_hash.
      req.adminClients.lightning.lookupInvoice({ r_hash: hash }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    // On formate la facture pour la rendre plus facile à utiliser par le frontend
    const formattedInvoice = {
      memo: fullInvoice.memo,
      description: fullInvoice.memo, // Alias pour la clarté
      // Les champs de type int64 peuvent être des objets Long.js.
      // Il faut les convertir en string avant de les parser.
      value: parseInt(fullInvoice.value.toString(), 10),
      creation_date: parseInt(fullInvoice.creation_date.toString(), 10),
      settled: fullInvoice.settled,
      state: fullInvoice.state,
      payment_request: fullInvoice.payment_request,
      expiry: parseInt(fullInvoice.expiry.toString(), 10),
      r_hash: Buffer.from(fullInvoice.r_hash).toString('hex'),
    };

    res.json({
      invoice: formattedInvoice,
      preimage: preimage.toString("hex"),
    });
  } catch (err) {
    console.error("Erreur gRPC - AddHoldInvoice:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la création de la hold invoice.", details: err.details || err.message });
  }
});

// Exemple route pour vérifier la connexion LND
<<<<<<< Updated upstream:routes/lnd.route.js
router.get("/getinfo", (req, res) => {
  let client = new lnrpc.Lightning(process.env.LND_GRPC_HOST, credentials);
  client.getInfo({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

//Route pour faire un settle invoice
router.post("/settleinvoice", async (req, res) => {
=======
router.get("/getinfo", async (req, res) => {
>>>>>>> Stashed changes:backend/routes/lnd.route.js
  try {
    const response = await new Promise((resolve, reject) => {
      req.adminClients.lightning.getInfo({}, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json(response);
  } catch (err) {
    console.error("Erreur gRPC - getInfo:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la récupération des informations du noeud.", details: err.details || err.message });
  }
});

router.get("/invoices", async (req, res) => {
  // Ajout de la pagination via les query parameters de l'URL
  // Exemple d'appel : /api/admin/invoices?limit=10&offset=20&reversed=true
  const { limit, offset, reversed } = req.query;

  try {
    const requestParams = {
      num_max_invoices: limit ? parseInt(limit, 10) : 100,
      index_offset: offset ? parseInt(offset, 10) : 0,
      reversed: reversed === 'true',
    };

    const response = await new Promise((resolve, reject) => {
      req.adminClients.lightning.listInvoices(requestParams, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    // On formate la liste des factures pour la rendre plus facile à utiliser par le frontend
    // On s'assure que response.invoices est un tableau avant de mapper.
    // On convertit également les champs Long en string avant de les parser.
    const mappedInvoices = (response.invoices || []).map(invoice => ({
      memo: invoice.memo,
      description: invoice.memo,
      // Les champs de type int64 peuvent être des objets Long.js.
      // Il faut les convertir en string avant de les parser.
      value: parseInt(invoice.value.toString(), 10),
      creation_date: parseInt(invoice.creation_date.toString(), 10),
      settled: invoice.settled,
      state: invoice.state,
      payment_request: invoice.payment_request,
      expiry: parseInt(invoice.expiry.toString(), 10),
      r_hash: Buffer.from(invoice.r_hash).toString('hex'),
    }));

    const formattedResponse = { ...response, invoices: mappedInvoices };
    res.json(formattedResponse);
  } catch (err) {
    console.error("Erreur gRPC - listInvoices:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la récupération des factures.", details: err.details || err.message });
  }
});

router.get("/invoice/:id", async (req, res) => {
  try {
    const response = await new Promise((resolve, reject) => {
      req.adminClients.lightning.lookupInvoice({ r_hash_str: req.params.id }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json(response);
  } catch (err) {
    console.error("Erreur gRPC - lookupInvoice:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la recherche de la facture.", details: err.details || err.message });
  }
});

// Route pour régler (settle) une hold invoice
router.post("/settleholdinvoice", async (req, res) => {
  const { secret } = req.body; // Le 'secret' est la pré-image en format hexadécimal
  if (!secret) {
    return res.status(400).json({ error: "Le champ `secret` (preimage) est requis." });
  }

  try {
    const request = { preimage: Buffer.from(secret, "hex") };
    const response = await new Promise((resolve, reject) => {
      req.adminClients.invoices.SettleInvoice(request, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json({ settled: true, response });
  } catch (err) {
    console.error("Erreur gRPC - SettleInvoice:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec du règlement de la facture.", details: err.details || err.message });
  }
});

router.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Le champ `id` (payment hash) est requis." });
  }

  try {
    const request = { payment_hash: Buffer.from(id, 'hex') };
    const response = await new Promise((resolve, reject) => {
      req.adminClients.invoices.CancelInvoice(request, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json({ message: "Invoice cancelled", response });
  } catch (err) {
    console.error("Erreur gRPC - CancelInvoice:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de l'annulation de la facture.", details: err.details || err.message });
  }
});

module.exports = router;
