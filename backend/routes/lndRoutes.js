const express = require("express");
const router = express.Router();
const axios = require("axios");
const { decode } = require("light-bolt11-decoder");
const crypto = require("crypto");

const {
  getWalletInfo,
  getChainBalance,
  getChannelBalance,
  createInvoice,
  getInvoices,
  createHodlInvoice,
  subscribeToInvoice,
  settleHodlInvoice,
  pay,
  cancelInvoice,
  getInvoice,
  decodePaymentRequest,
} = require("ln-service");

/**
 * @swagger
 * /api/create-fiat-payment:
 *   post:
 *     summary: Crée un lien de paiement Fiat (Feedapay) à partir d'une facture Lightning
 *     tags: [Fiat Gateway]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request
 *               - email
 *               - firstname
 *               - lastname
 *             properties:
 *               request:
 *                 type: string
 *                 description: Facture Lightning (BOLT11) à payer
 *                 example: "lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3k2ql2pfkyv3qg2r0vfsx2us0vfssxgr5wdehhueqfu3wd66zs36sp5zyg3w2eun3w5l5v6fxp7fe2y5zphwpej5yeqeqq4q7l4f8v"
 *               email:
 *                 type: string
 *                 description: Email du client pour la transaction.
 *                 example: "client@example.com"
 *               firstname:
 *                 type: string
 *                 description: Prénom du client.
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 description: Nom de famille du client.
 *                 example: "Doe"
 *     responses:
 *       200:
 *         description: Lien de paiement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *                   description: URL de la page de paiement Feedapay
 *                   example: "https://pay.feedapay.com/link/xxxxxxxx"
 *       400:
 *         description: Requête invalide (facture manquante ou invalide).
 *       500:
 *         description: Erreur interne du serveur (problème de configuration ou erreur de l'API Feedapay).
 */
// Dans une application réelle, ce taux devrait être récupéré dynamiquement
// depuis une API de change et mis en cache.
const SAT_TO_XOF_RATE = parseFloat(process.env.SAT_TO_XOF_RATE) || 0.4;

// Pour la démo, nous utilisons une Map en mémoire pour lier l'ID de transaction FedaPay à la facture Lightning.
// Dans une application réelle, utilisez une base de données (ex: Redis, PostgreSQL).
const pendingFiatToLnPayments = new Map();

router.post("/create-fiat-payment", async (req, res) => {
  const { request, email, firstname, lastname } = req.body;

  if (!request || !email || !firstname || !lastname) {
    return res.status(400).json({
      error:
        'Les champs "request", "email", "firstname" et "lastname" sont requis.',
    });
  }

  try {
    // 1. Décoder la facture Lightning pour obtenir le montant en msats
    let decodedInvoice;
    try {
      decodedInvoice = decode(request);
    } catch (e) {
      return res.status(400).json({
        error: "Facture Lightning (request) invalide.",
        details: e.message,
      });
    }

    const amountMsatsSection = decodedInvoice.sections.find(
      (s) => s.name === "amount"
    );

    if (!amountMsatsSection || !amountMsatsSection.value) {
      return res
        .status(400)
        .json({ error: "Facture invalide : montant non trouvé." });
    }

    const amountSats = Number(amountMsatsSection.value) / 1000;
    if (isNaN(amountSats)) {
      return res
        .status(400)
        .json({ error: "Facture invalide : montant invalide." });
    }

    const amountXOF = Math.ceil(amountSats * SAT_TO_XOF_RATE);

    // 3. Préparer la requête pour l'API de Feedapay
    const feedapayApiKey = process.env.FEEDAPAY_SECRET_KEY;
    if (!feedapayApiKey) {
      console.error(
        "La variable FEEDAPAY_SECRET_KEY n'est pas définie dans le fichier .env"
      );
      return res.status(500).json({
        error: "Erreur de configuration du serveur: Clé API FedaPay manquante.",
      });
    }

    const callbackUrl = process.env.FEEDAPAY_CALLBACK_URL;
    if (!callbackUrl) {
      console.error(
        "La variable FEEDAPAY_CALLBACK_URL n'est pas définie dans le fichier .env"
      );
      // Vous pourriez vouloir une URL de fallback ou simplement une erreur.
      return res.status(500).json({
        error:
          "Erreur de configuration du serveur: URL de callback FedaPay manquante.",
      });
    }

    const transactionPayload = {
      customer: {
        firstname,
        lastname,
        email,
      },
      amount: amountXOF,
      currency: {
        iso: "XOF",
      },
      description: `Paiement pour facture BitKaba de ${amountSats} sats`,
      // IMPORTANT: Définissez une URL de callback sur votre site pour gérer les retours de FedaPay
      callback_url: callbackUrl,
    };

    const headers = {
      Authorization: `Bearer ${feedapayApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const FEDAPAY_API_BASE_URL = "https://api.fedapay.com/v1";

    // 4. Créer la transaction sur FedaPay
    const transactionResponse = await axios.post(
      `${FEDAPAY_API_BASE_URL}/transactions`,
      transactionPayload,
      { headers }
    );

    // 5. Récupérer l'ID de la transaction créée
    const transactionId = transactionResponse.data?.["v1/transaction"]?.id;
    if (!transactionId) {
      console.error(
        "La réponse de FedaPay ne contient pas d'ID de transaction:",
        transactionResponse.data
      );
      return res.status(500).json({
        error: "Échec de la création de la transaction avec le fournisseur.",
      });
    }

    // Associer l'ID de transaction FedaPay à la facture Lightning pour le callback
    pendingFiatToLnPayments.set(transactionId, request);

    // 6. Générer le token de paiement (et l'URL) pour cette transaction
    const tokenResponse = await axios.post(
      `${FEDAPAY_API_BASE_URL}/transactions/${transactionId}/token`,
      {},
      { headers }
    );

    // 7. Retourner l'URL de paiement au frontend
    // La propriété `url` provient de la réponse de génération de token de FedaPay.
    const paymentUrl = tokenResponse.data?.url;

    if (!paymentUrl) {
      console.error(
        "La réponse de FedaPay ne contient pas d'URL de paiement:",
        tokenResponse.data
      );
      return res
        .status(500)
        .json({ error: "Échec de la génération du lien de paiement." });
    }

    res.json({ paymentUrl });
  } catch (error) {
    if (error.code === "ENOTFOUND") {
      console.error(
        `Erreur de résolution DNS (ENOTFOUND) pour l'hôte : ${error.hostname}. Vérifiez l'URL de l'API FedaPay et la configuration réseau du serveur.`
      );
      res.status(500).json({
        error:
          "Impossible de contacter le service de paiement. Veuillez vérifier la configuration du serveur.",
      });
    } else if (error.response) {
      // Erreur renvoyée par l'API FedaPay (exemple: 400, 401, 500)
      console.error(
        "Erreur API FedaPay:",
        error.response.status,
        error.response.data
      );
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // Requête envoyée mais pas de réponse reçue
      console.error(
        "Erreur requête : aucune réponse reçue de FedaPay",
        error.request
      );
      res
        .status(500)
        .json({ error: "Aucune réponse reçue du service de paiement." });
    } else {
      // Autre erreur (ex: problème dans le code)
      console.error("Erreur interne:", error.message);
      res.status(500).json({
        error:
          "Une erreur interne est survenue lors de la communication avec le service de paiement.",
      });
    }
  }
});

/**
 * @swagger
 * /api/fedapay-callback:
 *   post:
 *     summary: Endpoint de callback pour les notifications de FedaPay
 *     tags: [Fiat Gateway]
 *     description: "ATTENTION : Cet endpoint est destiné à être appelé par les serveurs de FedaPay, pas directement par un client. Il gère les événements de transaction (paiement réussi, échoué, etc.)."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "transaction.approved"
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification reçue et traitée.
 *       400:
 *         description: Requête invalide ou événement non géré.
 *       500:
 *         description: Erreur interne lors du traitement de la notification.
 */
router.post("/fedapay-callback", async (req, res) => {
  const event = req.body;

  // TODO: Pour la production, il est CRUCIAL de vérifier la signature de l'événement
  // pour s'assurer qu'il provient bien de FedaPay. Consultez leur documentation.

  if (event && event.name === "transaction.approved") {
    const transaction = event.data;
    const fedaTransactionId = transaction.id;
    const lightningInvoice = pendingFiatToLnPayments.get(fedaTransactionId);

    if (lightningInvoice) {
      console.log(
        `Paiement Fiat approuvé pour la transaction ${fedaTransactionId}. Tentative de règlement de la facture Lightning...`
      );
      try {
        await pay({ lnd: req.lnd, request: lightningInvoice });
        console.log(
          `Facture Lightning pour la transaction ${fedaTransactionId} payée avec succès !`
        );
        pendingFiatToLnPayments.delete(fedaTransactionId); // Nettoyer la map
      } catch (paymentError) {
        console.error(
          `Échec du paiement de la facture Lightning pour la transaction FedaPay ${fedaTransactionId}:`,
          paymentError
        );
        // Gérer l'échec (ex: notifier un administrateur)
      }
    }
  }

  // Répondre à FedaPay pour accuser réception de la notification.
  res.status(200).send("OK");
});

/**
 * @swagger
 * /api/decode-invoice:
 *   post:
 *     summary: Décode une facture Lightning (payment request)
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request
 *             properties:
 *               request:
 *                 type: string
 *                 description: La chaîne de la facture BOLT11 (lnbc...)
 *     responses:
 *       200:
 *         description: Détails de la facture décodée
 *       400:
 *         description: Facture invalide ou expirée
 */
router.post("/decode-invoice", async (req, res) => {
  const { request } = req.body;
  if (!request) {
    return res.status(400).json({ error: "Payment request is required." });
  }
  try {
    const decoded = await decodePaymentRequest({ lnd: req.lnd, request });
    res.status(200).json({
      description: decoded.description,
      tokens: decoded.tokens,
      expires_at: decoded.expires_at,
    });
  } catch (error) {
    console.error("Failed to decode payment request:", error);
    res.status(400).json({ error: "Cette facture est invalide ou a expiré." });
  }
});

module.exports = router;
