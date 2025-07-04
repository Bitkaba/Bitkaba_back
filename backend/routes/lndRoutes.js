const express = require("express");
const router = express.Router();
<<<<<<< Updated upstream
const { getLnd } = require('../lnd');
const axios = require('axios');
const { decode } = require('light-bolt11-decoder');
const crypto = require('crypto');

// Middleware pour injecter lnd
router.use((req, res, next) => {
  req.lnd = getLnd();
  next();
});

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
=======
const axios = require("axios");
const { decode } = require("light-bolt11-decoder");
>>>>>>> Stashed changes

/**
 * @swagger
 * /api/getinfo:
 *   get:
 *     summary: Récupère des informations générales sur le noeud LND
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Informations du noeud LND
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Erreur serveur lors de la récupération des infos
 */
router.get("/getinfo", async (req, res) => {
  try {
    const info = await getWalletInfo({ lnd: req.lnd });
    res.json(info);
  } catch (error) {
    console.error("Error getting node info:", error);
    res.status(500).json({ error: "Failed to get node info.", details: error });
  }
});

/**
 * @swagger
 * /api/balance:
 *   get:
 *     summary: Récupère les soldes on-chain et off-chain (channels)
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Soldes récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onChainBalance:
 *                   type: object
 *                   description: Solde on-chain (Bitcoin)
 *                 offChainBalance:
 *                   type: object
 *                   description: Solde off-chain (canaux Lightning)
 *       500:
 *         description: Erreur serveur lors de la récupération des soldes
 */
router.get("/balance", async (req, res) => {
  try {
    const onChainBalance = await getChainBalance({ lnd: req.lnd });
    const offChainBalance = await getChannelBalance({ lnd: req.lnd });
    res.json({ onChainBalance, offChainBalance });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ error: "Failed to get balance.", details: error });
  }
});

/**
 * @swagger
 * /api/invoice:
 *   post:
 *     summary: Crée une nouvelle invoice Lightning
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sats
 *             properties:
 *               sats:
 *                 type: number
 *                 description: Montant en satoshis
 *                 example: 1000
 *               description:
 *                 type: string
 *                 description: Description optionnelle de la facture
 *                 example: "Paiement test"
 *     responses:
 *       200:
 *         description: Invoice créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Identifiant de l'invoice
 *                 request:
 *                   type: string
 *                   description: Chaîne BOLT11 de paiement
 *       400:
 *         description: Mauvais format ou montant invalide
 *       500:
 *         description: Erreur serveur lors de la création de l'invoice
 */
router.post("/invoice", async (req, res) => {
  try {
    const { sats, description } = req.body;
    if (sats === undefined || typeof sats !== "number" || sats <= 0) {
      return res.status(400).json({ error: "A positive numeric `sats` value is required." });
    }

    const invoice = await createInvoice({
      lnd: req.lnd,
      tokens: sats,
      description: description || "",
    });
    res.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Récupère la liste de toutes les invoices
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Liste des invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur lors de la récupération des invoices
 */
router.get("/invoices", async (req, res) => {
  try {
    const { invoices } = await getInvoices({ lnd: req.lnd });
    res.json(invoices);
  } catch (error) {
    console.error("Error listing invoices:", error);
    res.status(500).json({ error: "Failed to list invoices.", details: error });
  }
});

/**
 * @swagger
 * /api/pay:
 *   post:
 *     summary: Payer une invoice Lightning
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
 *                 description: Chaîne BOLT11 de paiement (invoice)
 *                 example: "lnbc1..."
 *     responses:
 *       200:
 *         description: Paiement effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment_info:
 *                   type: object
 *       400:
 *         description: Requête invalide (request manquant)
 *       500:
 *         description: Erreur serveur lors du paiement
 */
router.post("/pay", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res.status(400).json({ error: "A `request` string (BOLT11 invoice) is required." });
    }
    const paymentResult = await pay({ lnd: req.lnd, request });
    res.json({ success: true, payment_info: paymentResult });
  } catch (error) {
    console.error("Error paying invoice:", error);
    res.status(500).json({ error: "Failed to pay invoice.", details: error });
  }
});

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


router.post('/create-fiat-payment', async (req, res) => {
  const { request, email, firstname, lastname } = req.body;

  if (!request || !email || !firstname || !lastname) {
    return res.status(400).json({ error: 'Les champs "request", "email", "firstname" et "lastname" sont requis.' });
  }

  try {
    // 1. Décoder la facture Lightning pour obtenir le montant en msats
    let decodedInvoice;
    try {
      decodedInvoice = decode(request);
    } catch (e) {
      return res.status(400).json({ error: 'Facture Lightning (request) invalide.', details: e.message });
    }

    const amountMsatsSection = decodedInvoice.sections.find(s => s.name === 'amount');

    if (!amountMsatsSection || !amountMsatsSection.value) {
        return res.status(400).json({ error: 'Facture invalide : montant non trouvé.' });
    }

    const amountSats = Number(amountMsatsSection.value) / 1000;
    if (isNaN(amountSats)) {
        return res.status(400).json({ error: 'Facture invalide : montant invalide.' });
    }

    const amountXOF = Math.ceil(amountSats * SAT_TO_XOF_RATE);

    // 2. Préparer la requête pour l'API de Feedapay
    const feedapayApiKey = process.env.FEEDAPAY_SECRET_KEY;
    if (!feedapayApiKey) {
        console.error('La variable FEEDAPAY_SECRET_KEY n\'est pas définie dans le fichier .env');
        return res.status(500).json({ error: 'Erreur de configuration du serveur: Clé API FedaPay manquante.' });
    }

    const callbackUrl = process.env.FEEDAPAY_CALLBACK_URL;
    if (!callbackUrl) {
        console.error('La variable FEEDAPAY_CALLBACK_URL n\'est pas définie dans le fichier .env');
        // Vous pourriez vouloir une URL de fallback ou simplement une erreur.
        return res.status(500).json({ error: 'Erreur de configuration du serveur: URL de callback FedaPay manquante.' });
    }

    const transactionPayload = {
      customer: {
        firstname,
        lastname,
        email,
      },
      amount: amountXOF,
      currency: {
        iso: 'XOF'
      },
      description: `Paiement pour facture BitKaba de ${amountSats} sats`,
      // IMPORTANT: Définissez une URL de callback sur votre site pour gérer les retours de FedaPay
      callback_url: callbackUrl,
    };

    const headers = {
      'Authorization': `Bearer ${feedapayApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const FEDAPAY_API_BASE_URL = 'https://api.fedapay.com/v1';

<<<<<<< Updated upstream
    // 4. Créer la transaction sur FedaPay
    const transactionResponse = await axios.post(`${FEDAPAY_API_BASE_URL}/transactions`, transactionPayload, { headers });

    // 5. Récupérer l'ID de la transaction créée
    const transactionId = transactionResponse.data?.['v1/transaction']?.id;
=======
    // 3. Créer la transaction sur FedaPay
    const transactionResponse = await axios.post(
      `${FEDAPAY_API_BASE_URL}/transactions`,
      transactionPayload,
      { headers }
    );

    // 4. Récupérer l'ID de la transaction créée
    const transactionId = transactionResponse.data?.["v1/transaction"]?.id;
>>>>>>> Stashed changes
    if (!transactionId) {
        console.error('La réponse de FedaPay ne contient pas d\'ID de transaction:', transactionResponse.data);
        return res.status(500).json({ error: 'Échec de la création de la transaction avec le fournisseur.' });
    }

    // Associer l'ID de transaction FedaPay à la facture Lightning pour le callback
    pendingFiatToLnPayments.set(transactionId, request);

<<<<<<< Updated upstream
    // 6. Générer le token de paiement (et l'URL) pour cette transaction
    const tokenResponse = await axios.post(`${FEDAPAY_API_BASE_URL}/transactions/${transactionId}/token`, {}, { headers });
    
    // 7. Retourner l'URL de paiement au frontend
=======
    // 5. Générer le token de paiement (et l'URL) pour cette transaction
    const tokenResponse = await axios.post(
      `${FEDAPAY_API_BASE_URL}/transactions/${transactionId}/token`,
      {},
      { headers }
    );

    // 6. Retourner l'URL de paiement au frontend
>>>>>>> Stashed changes
    // La propriété `url` provient de la réponse de génération de token de FedaPay.
    const paymentUrl = tokenResponse.data?.url;

    if (!paymentUrl) {
        console.error('La réponse de FedaPay ne contient pas d\'URL de paiement:', tokenResponse.data);
        return res.status(500).json({ error: 'Échec de la génération du lien de paiement.' });
    }

    res.json({ paymentUrl });

  } catch (error) {
  if (error.code === 'ENOTFOUND') {
    console.error(`Erreur de résolution DNS (ENOTFOUND) pour l'hôte : ${error.hostname}. Vérifiez l'URL de l'API FedaPay et la configuration réseau du serveur.`);
    res.status(500).json({ error: 'Impossible de contacter le service de paiement. Veuillez vérifier la configuration du serveur.' });
  } else if (error.response) {
    // Erreur renvoyée par l'API FedaPay (exemple: 400, 401, 500)
    console.error('Erreur API FedaPay:', error.response.status, error.response.data);
    res.status(error.response.status).json({ error: error.response.data });
  } else if (error.request) {
    // Requête envoyée mais pas de réponse reçue
    console.error('Erreur requête : aucune réponse reçue de FedaPay', error.request);
    res.status(500).json({ error: 'Aucune réponse reçue du service de paiement.' });
  } else {
    // Autre erreur (ex: problème dans le code)
    console.error('Erreur interne:', error.message);
    res.status(500).json({ error: 'Une erreur interne est survenue lors de la communication avec le service de paiement.' });
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
router.post('/fedapay-callback', async (req, res) => {
  const event = req.body;

  // TODO: Pour la production, il est CRUCIAL de vérifier la signature de l'événement
  // pour s'assurer qu'il provient bien de FedaPay. Consultez leur documentation.

  if (event && event.name === 'transaction.approved') {
    const transaction = event.data;
    const fedaTransactionId = transaction.id;
    const lightningInvoice = pendingFiatToLnPayments.get(fedaTransactionId);

    if (lightningInvoice) {
<<<<<<< Updated upstream
      console.log(`Paiement Fiat approuvé pour la transaction ${fedaTransactionId}. Tentative de règlement de la facture Lightning...`);
      try {
        await pay({ lnd: req.lnd, request: lightningInvoice });
        console.log(`Facture Lightning pour la transaction ${fedaTransactionId} payée avec succès !`);
        pendingFiatToLnPayments.delete(fedaTransactionId); // Nettoyer la map
      } catch (paymentError) {
        console.error(`Échec du paiement de la facture Lightning pour la transaction FedaPay ${fedaTransactionId}:`, paymentError);
        // Gérer l'échec (ex: notifier un administrateur)
      }
=======
      console.log(
        `Paiement Fiat approuvé pour la transaction ${fedaTransactionId}. Tentative de règlement de la facture Lightning...`
      );
      // Utilise le client gRPC injecté pour payer la facture.
      // C'est un appel asynchrone "fire-and-forget". Le webhook répondra 200 OK
      // immédiatement, et le paiement s'exécutera en arrière-plan. Utilisation de sendPaymentV2.
      // On utilise le bon client : 'router' au lieu de 'lightning'
      const call = req.adminClients.router.sendPaymentV2({
        payment_request: lightningInvoice,
        timeout_seconds: 60, // Un timeout pour éviter que le paiement ne reste bloqué indéfiniment
      });

      call.on('data', (response) => {
        if (response.status === 'SUCCEEDED') {
          console.log(`Facture Lightning pour la transaction FedaPay ${fedaTransactionId} payée avec succès !`);
          pendingFiatToLnPayments.delete(fedaTransactionId); // Nettoyer la map
        } else if (response.status === 'FAILED') {
          console.error(`Échec du paiement de la facture Lightning pour la transaction FedaPay ${fedaTransactionId}:`, response.failure_reason);
          // On pourrait vouloir stocker cet échec dans la DB pour une nouvelle tentative.
        }
      });

      call.on('error', (err) => {
        console.error(`Erreur gRPC lors du paiement de la facture Lightning pour la transaction FedaPay ${fedaTransactionId}:`, err);
      });
>>>>>>> Stashed changes
    }
  }

  // Répondre à FedaPay pour accuser réception de la notification.
  res.status(200).send('OK');
});

/**
 * @swagger
 * /api/holdinvoice:
 *   post:
 *     summary: Créer une hold invoice (requiert un règlement manuel)
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Montant en satoshis
 *                 example: 1000
 *               description:
 *                 type: string
 *                 description: Description optionnelle
 *                 example: "Hold invoice example"
 *               timestamp:
 *                 type: integer
 *                 description: Timestamp expiration (en ms ou en date ISO)
 *                 example: 1679043200000
 *     responses:
 *       200:
 *         description: Hold invoice créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoice:
 *                   type: object
 *       400:
 *         description: Montant invalide ou requête mal formée
 *       500:
 *         description: Erreur serveur lors de la création de la hold invoice
 */
router.post("/holdinvoice", async (req, res) => {
  try {
    const { amount, description, timestamp } = req.body;
    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "A positive numeric `amount` value is required." });
    }

    const invoice = await createHodlInvoice({
      lnd: req.lnd,
      tokens: amount,
      description: description || "",
      expires_at: timestamp ? new Date(timestamp).toISOString() : new Date(Date.now() + 3600000).toISOString(),
    });

    res.json({ invoice });
  } catch (error) {
    console.error("Error creating hold invoice:", error);
    res.status(500).json({ error: "Failed to create hold invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/settleholdinvoice:
 *   post:
 *     summary: Règler une hold invoice manuellement
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - secret
 *             properties:
 *               id:
 *                 type: string
 *                 description: Identifiant de la hold invoice
 *               secret:
 *                 type: string
 *                 description: Secret de règlement de la hold invoice
 *     responses:
 *       200:
 *         description: Hold invoice réglée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settled:
 *                   type: object
 *       400:
 *         description: Paramètres manquants ou invoice non détenue
 *       500:
 *         description: Erreur serveur lors du règlement
 */
router.post("/settleholdinvoice", async (req, res) => {
  const { secret } = req.body;
  if (!secret || typeof secret !== 'string' || secret.length !== 64) {
    return res.status(400).json({ error: "Un 'secret' (preimage) valide de 64 caractères hexadécimaux est requis." });
  }

  try {
    // L'ID de la facture (payment_hash) est le hash SHA-256 du secret (preimage).
    const id = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');

    // On s'abonne aux mises à jour de la facture pour vérifier son état avant de la régler.
    const sub = subscribeToInvoice({ lnd: req.lnd, id });
    let responded = false;

    // Ajout d'un timeout pour éviter que la requête ne reste bloquée indéfiniment
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        sub.removeAllListeners();
        res.status(408).json({ error: "Timeout : Impossible de récupérer le statut de la facture à temps. Le secret est peut-être incorrect." });
      }
    }, 15000); // Timeout de 15 secondes

    sub.on("invoice_updated", async (invoice) => {
      if (responded) return;
      clearTimeout(timeout);

      if (!invoice.is_held) {
        responded = true;
        sub.removeAllListeners();
        return res.status(400).json({ error: "La facture n'est pas en attente de règlement. Elle a peut-être déjà été payée, annulée ou a expiré." });
      }

      if (invoice.is_confirmed) {
        responded = true;
        sub.removeAllListeners();
        return res.status(400).json({ error: "La facture a déjà été réglée." });
      }

      try {
        const settled = await settleHodlInvoice({ lnd: req.lnd, secret });
        responded = true;
        sub.removeAllListeners();
        res.json({ success: true, message: "Fonds débloqués avec succès !", settled });
      } catch (err) {
        responded = true;
        sub.removeAllListeners();
        const errorMessage = err[2]?.err?.details || "Échec du déblocage de la facture.";
        res.status(500).json({ error: errorMessage, details: err });
      }
    });

    sub.on('error', (err) => {
      if (responded) return;
      clearTimeout(timeout);
      responded = true;
      sub.removeAllListeners();
      console.error("Erreur de souscription pour le règlement de la facture:", err);
      res.status(500).json({ error: "Impossible de souscrire aux mises à jour de la facture.", details: err });
    });
  } catch (error) {
    console.error("Erreur lors du règlement de la hold invoice:", error);
    res.status(500).json({ error: "Une erreur inattendue est survenue lors du règlement de la facture.", details: error });
  }
});

/**
 * @swagger
 * /api/cancel-invoice:
 *   post:
 *     summary: Annuler une invoice existante
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: Identifiant de l'invoice à annuler
 *     responses:
 *       200:
 *         description: Invoice annulée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invoice cancelled
 *       500:
 *         description: Erreur serveur lors de l'annulation
 */
router.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;
  try {
    await cancelInvoice({ lnd: req.lnd, id });
    res.json({ message: "Invoice cancelled" });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res.status(500).json({ error: "Failed to cancel invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/invoice/{id}:
 *   get:
 *     summary: Récupérer une invoice par son identifiant
 *     tags: [Lightning]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Identifiant de l'invoice à récupérer
 *     responses:
 *       200:
 *         description: Invoice récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Erreur serveur lors de la récupération de l'invoice
 */
router.get("/invoice/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await getInvoice({ lnd: req.lnd, id });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice.", details: error });
  }
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
router.post("/decode-invoice", (req, res) => {
  const { request } = req.body;
  if (!request) {
    return res.status(400).json({ error: 'Payment request is required.' });
  }
<<<<<<< Updated upstream
  try {
    const decoded = await decodePaymentRequest({ lnd: req.lnd, request });
    res.status(200).json({ description: decoded.description, tokens: decoded.tokens, expires_at: decoded.expires_at });
  } catch (error) {
    console.error('Failed to decode payment request:', error);
    res.status(400).json({ error: 'Cette facture est invalide ou a expiré.' });
  }
=======
  // Utilise le client gRPC injecté pour décoder la facture
  req.adminClients.lightning.decodePayReq({ pay_req: request }, (err, response) => {
    if (err) {
      return res.status(400).json({ error: "Cette facture est invalide ou a expiré.", details: err.details });
    }
    res.status(200).json(response);
  });
>>>>>>> Stashed changes
});

module.exports = router;