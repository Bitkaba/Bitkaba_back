# BitKaba
Bitcoin app 

Repôt front 
https://github.com/Bitkaba/BitKaba-front.git

LND Express API Server
This is a simple but powerful backend server built with Node.js and Express that provides a RESTful API to communicate with your LND (Lightning Network Daemon) node.

How to Set Up and Run
1. Prerequisites
Node.js: Ensure you have Node.js (version 14 or higher) installed on your system.

LND Node: You must have a running LND node. This server is designed to connect to it.

LND Credentials: You need access to your LND node's tls.cert and admin.macaroon files, as well as its gRPC host address.

2. Installation
Clone the project: Create a directory for this project and save the index.js, package.json, and .env files inside it.

Install dependencies: Open your terminal in the project directory and run:

npm install

3. Configuration
Edit the .env file: This is the most important step. Open the .env file and replace the placeholder values with the correct details for your LND node.

LND_GRPC_HOST: The IP address or hostname and gRPC port of your LND node (e.g., localhost:10009 or 192.168.1.100:10009).

LND_MACAROON: The base64-encoded content of your admin.macaroon file. You can get this by running `base64 -w 0 admin.macaroon` on Linux or `base64 -i admin.macaroon` on macOS.

LND_MACAROON2: The base64-encoded content of a second, more restricted macaroon (e.g., `readonly.macaroon` or a custom-baked one) for client-side operations.

Note: This server uses the system's SSL trust store to connect to LND, so a `LND_TLS_CERT_PATH` is not needed if your node uses a standard certificate.

Security Note: The .env file contains sensitive credentials. It should never be committed to a public repository. The provided .gitignore file will prevent this.

4. Running the Server
For production:

npm start

For development (with automatic restarts on file changes):

npm run dev

If the connection to your LND node is successful, you will see a confirmation message in your console, along with a list of available API endpoints.

API Endpoints
Once the server is running, you can interact with it using a tool like curl or Postman, or by building a frontend application that communicates with these endpoints.
See the console output on startup for a list of available endpoints or visit the Swagger documentation.

**Admin Endpoints (prefix: `/api/admin`)**
- `GET /getinfo`: Retrieves general information about your node.
- `GET /invoices`: Lists all invoices.
- `POST /holdinvoice`: Creates a new hold invoice.

**Client Endpoints (prefix: `/api/client`)**
- `GET /getinfo`, `GET /balance`, `POST /pay`

**Gateway Endpoints (prefix: `/api`)**
- `POST /create-fiat-payment`: Creates a Fiat-to-Lightning payment link.
- `POST /decode-invoice`: Decodes a BOLT11 payment request.
