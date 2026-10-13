# Katkı / Contributing

Türkçe veya İngilizce sorun/PR açabilirsiniz. Önce beklenen davranışı ve küçük yeniden üretme adımlarını açıklayın. Token, `.env`, oy kimlikleri veya sunucuya ait özel içerik eklemeyin. Güvenlik sorunları için SECURITY.md dosyasını izleyin.

Use Node.js 24. Run `npm ci --ignore-scripts`, `npm run check`, `npm audit --audit-level=low` and `bash -n setup.sh start.sh` (with Bash). Add meaningful tests for changed permissions, retention, concurrency or Discord write behavior. Keep Turkish/English documentation and interface text aligned. Do not add privileged intents or broader bot permissions without explaining the user need and updating the privacy documentation.

Changes should preserve explicit publication/closure confirmation, source-message and preview-owner binding, bounded retention and safe logs. Test live integration only in your own test server with private credentials. Do not add media extraction, unsolicited mass messages or tracking features. Keep commit titles short and describe the actual behavior changed.
