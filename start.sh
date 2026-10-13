#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
npm run build
exec npm start
