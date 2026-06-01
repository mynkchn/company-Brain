import requests, json, os

BASE = "http://127.0.0.1:5000"
TOKEN = None  # will be set manually after OAuth
PG_ID = None

def p(label, res):
    print(f"\n{'='*50}")
    print(f"  {label}")
    print(f"  Status : {res.status_code}")
    try:
        print(f"  Response: {json.dumps(res.json(), indent=2)}")
    except:
        print(f"  Response: {res.text}")

def headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


# ── 1. Health check ────────────────────────────────────
def test_health():
    p("GET / (health check)", requests.get(f"{BASE}/"))

# ── 2. Auth login redirect ─────────────────────────────
def test_auth_login():
    res = requests.get(f"{BASE}/auth/login", allow_redirects=False)
    print(f"\n{'='*50}")
    print("  GET /auth/login")
    print(f"  Status : {res.status_code}")
    print(f"  Redirects to: {res.headers.get('location', 'N/A')}")

# ── 3. Me (requires token) ─────────────────────────────
def test_me():
    p("GET /me", requests.get(f"{BASE}/me", headers=headers()))

# ── 4. Create playground ───────────────────────────────
def test_create_playground(db_url):
    global PG_ID
    res = requests.post(f"{BASE}/playground/new", headers=headers(), json={
        "name": "Test Playground",
        "db_url": db_url,
        "context": "This is a test database for endpoint testing."
    })
    p("POST /playground/new", res)
    if res.status_code == 200:
        PG_ID = res.json().get("id")
        print(f"  >> Playground ID saved: {PG_ID}")

# ── 5. List playgrounds ────────────────────────────────
def test_list_playgrounds():
    p("GET /playground/list", requests.get(f"{BASE}/playground/list", headers=headers()))

# ── 6. Get playground ──────────────────────────────────
def test_get_playground():
    if not PG_ID:
        print("\n  !! Skipping get playground — no PG_ID")
        return
    p(f"GET /playground/{PG_ID}", requests.get(f"{BASE}/playground/{PG_ID}", headers=headers()))

# ── 7. Ingest text file ────────────────────────────────
def test_ingest():
    if not PG_ID:
        print("\n  !! Skipping ingest — no PG_ID")
        return
    with open("test_doc.txt", "w") as f:
        f.write("Users table contains customer data. Orders table has purchase history.")
    with open("test_doc.txt", "rb") as f:
        res = requests.post(f"{BASE}/ingest",
            headers={"Authorization": f"Bearer {TOKEN}"},
            data={"playground_id": PG_ID, "context": "Test context about the schema"},
            files={"files": ("test_doc.txt", f, "text/plain")}
        )
    p("POST /ingest", res)
    os.remove("test_doc.txt")

# ── 8. Ask question ────────────────────────────────────
def test_ask(question="How many tables are in the database?"):
    if not PG_ID:
        print("\n  !! Skipping ask — no PG_ID")
        return
    p("POST /ask", requests.post(f"{BASE}/ask", headers=headers(), json={
        "playground_id": PG_ID,
        "question": question
    }))

# ── 9. Delete playground ───────────────────────────────
def test_delete_playground():
    if not PG_ID:
        print("\n  !! Skipping delete — no PG_ID")
        return
    p(f"DELETE /playground/{PG_ID}", requests.delete(f"{BASE}/playground/{PG_ID}", headers=headers()))


if __name__ == "__main__":
    print("\n" + "█"*50)
    print("  SQL AGENT — ENDPOINT TESTS")
    print("█"*50)

    # Step 1: no auth needed
    test_health()
    test_auth_login()

    # Step 2: set your token here after GitHub OAuth
    # Go to http://127.0.0.1:5000/auth/login in browser
    # copy the token from the redirect URL (?token=xxx)
    # then paste it below and re-run from test_me() onwards

    TOKEN = input("\nPaste your JWT token (from /auth/login flow): ").strip()
    if not TOKEN:
        print("No token provided — skipping authenticated tests.")
        exit()

    test_me()

    DB_URL = input("\nPaste a database URL to test with (e.g. postgresql://...): ").strip()
    if not DB_URL:
        print("No DB URL — skipping playground tests.")
        exit()

    test_create_playground(DB_URL)
    test_list_playgrounds()
    test_get_playground()
    test_ingest()

    question = input("\nEnter a test question for /ask (or press Enter for default): ").strip()
    test_ask(question or "How many tables are in the database?")

    confirm = input("\nDelete the test playground? (y/n): ").strip()
    if confirm == "y":
        test_delete_playground()

    print("\n" + "█"*50)
    print("  ALL TESTS DONE")
    print("█"*50 + "\n")