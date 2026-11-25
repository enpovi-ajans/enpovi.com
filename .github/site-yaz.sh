#!/usr/bin/env bash
# Siteye otomatik yazan işlerin (vitrin.yml, icerik.yml) ortak gönderimi. İki iş aynı concurrency grubundadır (site-yaz), yine de
# arada elle bir gönderim olursa: güncel main alınır, değişiklik baştan uygulanır, en çok 4 deneme. Gönderim olunca GitHub Pages
# yapımı açıkça istenir (GITHUB_TOKEN ile yapılan gönderim yapımı her zaman tetiklemez).
# Kullanım: .github/site-yaz.sh "<commit iletisi>" "<uygula komutu>" <eklenecek yol>...
#   uygula komutu: sayfaları güncel veriyle yazar; 0 = tamam, 3 = tamam ama uyarı (işlenir; kırmızıyı iş akışının ayrı adımı verir), başka = dur.
#   Bu işin yeni eklediği dosyalar (ör. vitrinin yeni ekran görüntüleri) yeniden denemede korunur: güncel main alınırken silinmez.
set -euo pipefail
ileti="$1"; uygula="$2"; shift 2
git config user.name "Enpovi otomatik"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
for deneme in 1 2 3 4; do
  set +e; bash -c "$uygula"; kod=$?; set -e
  if [ "$kod" != 0 ] && [ "$kod" != 3 ]; then exit "$kod"; fi
  if [ -z "$(git status --porcelain -- "$@")" ]; then echo "değişiklik yok"; exit 0; fi
  python3 .github/kontrol/kontrol.py
  git add -A -- "$@"
  git commit -q -m "$ileti"
  if git push -q origin HEAD:main; then
    curl -sf -X POST -H "authorization: Bearer $GITHUB_TOKEN" -H 'accept: application/vnd.github+json' \
      "https://api.github.com/repos/$GITHUB_REPOSITORY/pages/builds" >/dev/null || echo "::warning::Pages yapımı istenemedi (bir sonraki gönderimde yayınlanır)"
    echo "gönderildi ($deneme. deneme)"; exit 0
  fi
  echo "gönderim reddedildi (main ilerlemiş); güncel main üstünde baştan uygulanıyor"
  sleep $((deneme * 5))
  yedek=$(mktemp -d)
  git diff --name-only -z --diff-filter=A HEAD~1 HEAD -- "$@" | while IFS= read -r -d '' f; do mkdir -p "$yedek/$(dirname "$f")"; cp -p "$f" "$yedek/$f"; done
  git fetch -q origin main && git reset -q --hard FETCH_HEAD
  cp -a "$yedek/." . 2>/dev/null || true; rm -rf "$yedek"
done
echo "::error::4 denemede gönderilemedi"; exit 1
