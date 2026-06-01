from dotenv import load_dotenv
import os

load_dotenv()

key = os.getenv("OPENAI_API_KEY")

print("KEY FOUND:", key is not None)
print("KEY PREFIX:", key[:10] if key else "NONE")
print("KEY LENGTH:", len(key) if key else 0)