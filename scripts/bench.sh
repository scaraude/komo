#!/usr/bin/env bash
# Mesure le TTFB d'une page Komo et affiche la région d'exécution Vercel.
#
#   ./scripts/bench.sh                      # join d'un event (2 lectures DB)
#   ./scripts/bench.sh <url> [n]
#
# Vise une page qui lit vraiment la DB : l'accueil en anonyme court-circuite
# auth.getUser() (pas de cookie = pas d'appel réseau) et ne mesurerait rien.
set -uo pipefail

# curl rend « 0.295038 » : sans ça, un shell en locale FR attend une virgule
# décimale et printf/awk lisent 0.
export LC_ALL=C

URL="${1:-https://www.komoapp.fr/e/1X9A0SiP/join}"
N="${2:-12}"

printf 'URL    %s\n' "$URL"
printf 'Requêtes %s (+1 de chauffe, écartée)\n\n' "$N"

curl -s -o /dev/null "$URL?_=warmup$RANDOM"

region=$(curl -s -D - -o /dev/null "$URL?_=r$RANDOM" \
  | awk -F': ' 'tolower($1)=="x-vercel-id"{print $2}' | tr -d '\r')

times=()
for i in $(seq 1 "$N"); do
  t=$(curl -s -o /dev/null -w '%{time_starttransfer}' "$URL?_=b$i$RANDOM")
  times+=("$t")
  awk -v i="$i" -v t="$t" 'BEGIN { printf "  %2d  %6.0f ms\n", i, t * 1000 }'
done

printf '\n%s\n' "$(printf '%s\n' "${times[@]}" | sort -n | awk '
  { v[NR] = $1 * 1000 }
  END {
    mid = (NR % 2) ? v[(NR+1)/2] : (v[NR/2] + v[NR/2+1]) / 2
    printf "min %.0f ms   médiane %.0f ms   max %.0f ms", v[1], mid, v[NR]
  }')"

printf '\n\nx-vercel-id  %s\n' "$region"
case "$region" in
  *::cdg1::*) printf '             → fonction à Paris, colocalisée avec la DB ✓\n' ;;
  *::iad1::*) printf '             → fonction à Washington, DB à Paris ✗ (~85 ms par requête)\n' ;;
  *)          printf '             → région inattendue, à vérifier\n' ;;
esac
