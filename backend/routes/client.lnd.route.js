const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
require("dotenv").config();
const express = require("express");
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

process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";

let macaroon = process.env.LND_MACAROON2;
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

// Pass the credentials when creating a channel
let lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
let lnrpc = lnrpcDescriptor.lnrpc;
let client = new lnrpc.Lightning("nakamoto.m.voltageapp.io:10009", credentials);

let request = {
  payment_request: "lnbc...", // Paste the invoice's payment request here
  amt: 1000, // Amount to pay in satoshis
};

router.get("/client/getinfo", (req, res) => {
  client.getInfo({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.get("/client/balance", (req, res) => {
  client.walletBalance({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.post("/client/pay", async (req, res) => {
  try {
    const { payment_request, amount } = req.body;

    if (!payment_request) {
      return res.status(400).json({ error: "Payment request is required." });
    }

    let client = new lnrpc.Lightning(process.env.LND_GRPC_HOST2, credentials);

    const request = {
      payment_request: payment_request,
      amt: amount, // Amount to pay in satoshis
    };
    client.sendPaymentSync(request, (err, response) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(response);
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/client/invoice", (req, res) => {
  const { amount, description } = req.body;
  const request = {
    memo: description || "Invoice",
    value: amount || 1000,
  };
  let client = new lnrpc.Lightning(process.env.LND_GRPC_HOST2, credentials);
  client.addInvoice(request, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

module.exports = router;
