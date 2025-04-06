#!/usr/bin/env sh

# Navigate to the project root directory
set -e
projectRoot="$(cd "$(dirname "$0")/.." && pwd)"
cd "${projectRoot}"

# Create certificates directory
mkdir -p certificates

# Generate Root CA
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out ./certificates/rootCA-private-key.pem
openssl req -new -key ./certificates/rootCA-private-key.pem -out ./certificates/rootCA.csr -subj "/CN=root"
openssl x509 -req -days 3650 -in ./certificates/rootCA.csr -signkey ./certificates/rootCA-private-key.pem -out ./certificates/rootCA.crt

# Generate server certificate
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out ./certificates/server-private-key.pem
openssl req -new -key ./certificates/server-private-key.pem -out ./certificates/server.csr -subj "/CN=localhost"
openssl x509 -req -days 365 -in ./certificates/server.csr -CA ./certificates/rootCA.crt -CAkey ./certificates/rootCA-private-key.pem -CAcreateserial -out ./certificates/server.crt
