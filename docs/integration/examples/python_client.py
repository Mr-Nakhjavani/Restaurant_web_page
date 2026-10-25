#!/usr/bin/env python3
"""
Bayt Al Ghaf API — standalone usage examples for an external HTTP client (Python 3.9+, standard library only).
These are API demonstrations only; they do not implement a conversational agent.

    BASE_URL=http://localhost:3000/api/v1 API_KEY=bg_dev_agent_key_for_local_testing_only python3 python_client.py
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000/api/v1")
API_KEY = os.environ.get("API_KEY", "")
PHONE = os.environ.get("CUSTOMER_PHONE", "050 555 0124")
DUBAI = timezone(timedelta(hours=4))  # Asia/Dubai, no daylight saving


class ApiError(Exception):
    def __init__(self, status, body):
        err = (body or {}).get("error", {})
        super().__init__(err.get("message", f"HTTP {status}"))
        self.status = status
        self.code = err.get("code", "UNKNOWN")
        self.retryable = err.get("retryable", status >= 500)
        self.details = err.get("details", {})
        self.request_id = err.get("requestId")


def api(method, path, body=None, headers=None, idempotency_key=None, retries=1):
    h = {"Accept": "application/json", **(headers or {})}
    if API_KEY:
        h["Authorization"] = f"Bearer {API_KEY}"
    data = None
    if body is not None:
        h["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if idempotency_key:
        h["Idempotency-Key"] = idempotency_key  # reuse the same key when retrying a create
    for attempt in range(retries + 1):
        req = urllib.request.Request(BASE_URL + path, data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as e:
            payload = json.loads(e.read() or b"null")
            err = ApiError(e.code, payload)
            if err.retryable and attempt < retries:
                time.sleep(min(int(e.headers.get("Retry-After", "1")), 5))
                continue
            raise err
        except urllib.error.URLError as e:
            if attempt < retries:
                continue
            raise ApiError(0, {"error": {"code": "NETWORK_ERROR", "message": str(e.reason), "retryable": True}})


def next_weekday(iso_weekday, min_days_ahead=1):
    today = datetime.now(DUBAI).date()
    for i in range(min_days_ahead, min_days_ahead + 8):
        d = today + timedelta(days=i)
        if d.isoweekday() == iso_weekday:
            return d.isoformat()


def show(title, value):
    print(f"\n=== {title}")
    print(value if isinstance(value, str) else json.dumps(value, indent=2, ensure_ascii=False))


def main():
    menu = api("GET", "/menu?category=desserts")
    show("1. Desserts", [f"{i['name']} — {i['price']['formatted']} — contains: {', '.join(i['allergens']) or 'none'}" for i in menu["data"]])

    sauce = api("GET", "/sauces/" + urllib.parse.quote("al-ghaf-house-green"))["data"]
    show("2. What is in Al Ghaf House Green?", {
        "ingredients": [f"{i['name']} {i['quantity']}" for i in sauce["ingredients"]],
        "contains": sauce["allergens"],
        "mayContain": sauce["mayContain"],
        "crossContact": sauce["crossContactNotes"],
    })

    special = api("GET", f"/menu/items/mi_iftar_set/availability?date={next_weekday(6)}&mode=pickup&quantity=2")["data"]["availability"]
    show("3. Iftar set this Saturday?", " ".join(r["message"] for r in special["reasons"]) or "Available")

    date = next_weekday(4, 2)
    avail = api("GET", f"/reservations/availability?date={date}&partySize=2&time=20:00&seatingPreference=window")["data"]
    slot = "20:00" if avail["requested"] and avail["requested"]["available"] else (avail["alternatives"][0]["time"] if avail["alternatives"] else None)
    show("4a. Window table for two", {"date": date, "requested": avail["requested"], "alternatives": [s["time"] for s in avail["alternatives"]]})
    booking = api("POST", "/reservations", idempotency_key=f"py-{uuid.uuid4()}", body={
        "date": date, "time": slot, "partySize": 2, "seatingPreference": "window",
        "customer": {"name": "Python Example", "phone": PHONE},
    })["data"]
    show("4b. Booked", {"reference": booking["reservation"]["reference"], "status": booking["reservation"]["status"], "message": booking["message"]})

    order = api("POST", "/orders", idempotency_key=f"py-{uuid.uuid4()}", body={
        "items": [{"itemId": "mi_luqaimat", "quantity": 1, "options": ["syrup_side"]}],
        "fulfilment": {"type": "pickup", "asap": True},
        "customer": {"name": "Python Example", "phone": PHONE},
    })["data"]
    show("5. Pickup order (ASAP)", {"number": order["order"]["number"], "status": order["order"]["status"], "readyAt": order["order"]["fulfilment"]["promisedAt"], "total": order["order"]["totals"]["total"]["formatted"]})

    quote = api("POST", "/bulk-orders/quotes", body={
        "items": [{"itemId": "mi_lamb_machboos", "quantity": 100}],
        "fulfilment": {"type": "pickup", "date": (datetime.now(DUBAI) + timedelta(days=1)).date().isoformat(), "time": "13:00"},
    })["data"]
    show("6. 100 portions tomorrow", {"status": quote["status"], "issues": [i["message"] for i in quote["issues"]], "alternatives": quote["alternatives"]})

    try:
        api("POST", "/orders", idempotency_key=f"py-{uuid.uuid4()}", body={
            "items": [{"itemId": "mi_chicken_machboos", "quantity": 2}],
            "fulfilment": {"type": "delivery", "asap": True},
            "deliveryAddress": {"area": "Abu Dhabi", "building": "Tower 1", "street": "Corniche"},
            "customer": {"name": "Python Example", "phone": PHONE},
        })
    except ApiError as e:
        show("7. Refused (expected)", {"code": e.code, "status": e.status, "message": str(e), "servedAreas(sample)": e.details.get("servedAreas", [])[:5], "requestId": e.request_id})

    api("POST", f"/orders/{order['order']['number']}/cancel", headers={"X-Customer-Phone": PHONE}, body={"reason": "example clean-up"})
    api("POST", f"/reservations/{booking['reservation']['reference']}/cancel", headers={"X-Customer-Phone": PHONE}, body={"reason": "example clean-up"})
    show("Clean-up", "Example order and reservation cancelled.")


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        print(f"Failed: {e.code} {e}")
        raise SystemExit(1)
