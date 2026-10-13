#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
node -e "if (process.versions.node.split('.')[0] !== '24') process.exit(1)"
npm ci --ignore-scripts
npm run build
npm run setup
printf '%s\n' 'Davet baglantisini acin. Bot katilinca Enter. / Open invite, then press Enter after the bot joins.'
read -r _reply
npm run register
printf '%s\n' 'Hazir / Ready: bash start.sh'
