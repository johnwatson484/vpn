#!/usr/bin/env sh

# Navigate to the project root directory
set -e
projectRoot="$(cd "$(dirname "$0")/.." && pwd)"

# Install dependencies
cd "${projectRoot}"/server
npm install

cd "${projectRoot}"/client
npm install
