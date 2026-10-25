#!/usr/bin/env bash
# Bayt Al Ghaf API — curl examples (requires curl; jq optional for pretty output).
#   BASE_URL=http://localhost:3000/api/v1 API_KEY=bg_dev_agent_key_for_local_testing_only ./curl-examples.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
API_KEY="${API_KEY:-}"
PHONE="${CUSTOMER_PHONE:-050 555 0125}"
AUTH=()
[ -n "$API_KEY" ] && AUTH=(-H "Authorization: Bearer $API_KEY")
pp() { if command -v jq >/dev/null; then jq "${1:-.}"; else cat; fi; echo; }
# Dubai date N days ahead (UTC+4)
day() { date -u -d "@$(( $(date -u +%s) + 4*3600 + $1*86400 ))" +%F; }

echo "== Health";                         curl -s "$BASE_URL/health" | pp
echo "== Hours (today + 2 days)";          curl -s "$BASE_URL/restaurant/hours?days=3" | pp '.data.days[] | {date, opensAt, closesAt, notes}'
echo "== Dish ingredients & allergens";    curl -s "$BASE_URL/menu/items/hummus-lamb" | pp '.data | {name, price: .price.formatted, allergens: [.allergenDetails[] | {allergen, sources, avoidableWith}], mayContain}'
echo "== Special-day check (tomorrow)";    curl -s "$BASE_URL/menu/items/mi_friday_platter/availability?date=$(day 1)&mode=pickup" | pp '.data.availability | {orderable, reasons, nextAvailable}'
D=$(day 3)
echo "== Table availability on $D";        curl -s "$BASE_URL/reservations/availability?date=$D&partySize=4&time=19:00" | pp '.data | {requested, alternatives: [.alternatives[].time]}'
echo "== Book";
BOOK=$(curl -s -X POST "$BASE_URL/reservations" "${AUTH[@]}" -H 'Content-Type: application/json' -H "Idempotency-Key: curl-$(date +%s)-$RANDOM" \
  -d "{\"date\":\"$D\",\"time\":\"19:00\",\"partySize\":4,\"customer\":{\"name\":\"Curl Example\",\"phone\":\"$PHONE\"}}")
echo "$BOOK" | pp '.data.reservation // . | {reference, status} // .'
REF=$(echo "$BOOK" | sed -n 's/.*"reference":"\(RES-[0-9]*\)".*/\1/p')
echo "== Pickup order quote";              curl -s -X POST "$BASE_URL/orders/quote" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"itemId\":\"mi_shish_tawook\",\"quantity\":1}],\"fulfilment\":{\"type\":\"pickup\",\"date\":\"$D\",\"time\":\"13:30\"}}" | pp '.data | {valid, total: .totals.total.formatted, accepted: .fulfilment.accepted}'
echo "== Catering quote (40 boxes)";       curl -s -X POST "$BASE_URL/bulk-orders/quotes" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"itemId\":\"mi_office_lunch_box\",\"quantity\":40}],\"fulfilment\":{\"type\":\"pickup\",\"date\":\"$(day 4)\",\"time\":\"12:30\"}}" | pp '.data | {quoteId, status, total: .totals.total.formatted, issues}'
echo "== Unsuccessful request (expected 422)"
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE_URL/orders" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"itemId\":\"mi_whole_lamb_ouzi\",\"quantity\":1}],\"fulfilment\":{\"type\":\"pickup\",\"asap\":true},\"customer\":{\"name\":\"Curl Example\",\"phone\":\"$PHONE\"}}"
if [ -n "$REF" ]; then
  echo "== Clean-up: cancel $REF"; curl -s -X POST "$BASE_URL/reservations/$REF/cancel" -H 'Content-Type: application/json' -H "X-Customer-Phone: $PHONE" -d '{"reason":"example clean-up"}' | pp '.data.message'
fi
