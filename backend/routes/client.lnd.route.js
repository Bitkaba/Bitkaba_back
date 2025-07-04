require("dotenv").config();
const express = require("express");
const router = express.Router();

router.get("/getinfo", async (req, res) => {
  try {
    const response = await new Promise((resolve, reject) => {
      req.userClients.lightning.getInfo({}, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json(response);
  } catch (err) {
    console.error("Erreur gRPC (Client) - getInfo:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la récupération des informations (client).", details: err.details || err.message });
  }
});

router.get("/balance", async (req, res) => {
  try {
    const response = await new Promise((resolve, reject) => {
      req.userClients.lightning.walletBalance({}, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    res.json(response);
  } catch (err) {
    console.error("Erreur gRPC (Client) - walletBalance:", JSON.stringify(err, null, 2));
    res.status(500).json({ error: "Échec de la récupération de la balance (client).", details: err.details || err.message });
  }
});

router.post("/pay", async (req, res) => {
  const { payment_request, amount } = req.body;

  if (!payment_request) {
    return res.status(400).json({ error: "Payment request is required." });
  }

  try {
    const request = {
      payment_request: payment_request,
      amt: amount, // Montant en satoshis (optionnel, LND le déduira de la facture)
      timeout_seconds: 60, // Timeout pour le paiement
      fee_limit_sat: 21, // Limite de frais raisonnable (à ajuster si besoin)
    };

    // On utilise le bon client : 'router' au lieu de 'lightning'
    const call = req.userClients.router.sendPaymentV2(request);

    call.on('data', (response) => {
      // Le stream fournit des mises à jour. Le statut final est 'SUCCEEDED' ou 'FAILED'.
      if (response.status === 'SUCCEEDED') {
        console.log("Paiement réussi (sendPaymentV2):", response);
        if (!res.headersSent) {
          res.json({ success: true, payment: response });
        }
      } else if (response.status === 'FAILED') {
        console.error("Échec du paiement (sendPaymentV2):", response.failure_reason);
        if (!res.headersSent) {
          // 422 est un bon code HTTP pour une requête valide qui n'a pas pu être traitée.
          res.status(422).json({ error: "Le paiement a échoué.", details: response.failure_reason });
        }
      }
      // Les autres statuts (IN_FLIGHT, UNKNOWN) sont ignorés pour cette réponse simple.
    });

    call.on('error', (err) => {
      if (!res.headersSent) {
        console.error("Erreur gRPC (Client) - sendPaymentV2:", JSON.stringify(err, null, 2));
        res.status(500).json({ error: "Échec de la communication pour le paiement.", details: err.details || err.message });
      }
    });
  } catch (err) {
    // Intercepte les erreurs synchrones (rares avec cette approche)
    console.error("Erreur inattendue dans la route /pay:", err);
    res.status(500).json({ error: "Erreur interne du serveur.", details: err.message });
  }
});

module.exports = router;
