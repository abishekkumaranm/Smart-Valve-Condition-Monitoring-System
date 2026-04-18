from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from simulator import update_valves
from ai_model import predict_health
from database import log_event, get_history
from report import generate_report

from fastapi import HTTPException
from pydantic import BaseModel

app = FastAPI()

# ---- CORS FIX ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- ROOT TEST ----
@app.get("/")
def home():
    return {"message": "Smart Valve Monitoring API Running"}


# ---- VALVE DATA ----
@app.get("/valves")
def valves():

    data = update_valves()
    output = {}

    for v in data:

        valve = data[v]

        health, status = predict_health(
            valve["pressure"],
            valve["temperature"],
            valve["vibration"]
        )

        if status == "CRITICAL":
            log_event(v, "Failure risk detected")

        output[v] = {
            "pressure": valve["pressure"],
            "temperature": valve["temperature"],
            "vibration": valve["vibration"],
            "position": valve["position"],
            "flow": valve["flow"],
            "health": health,
            "status": status
        }

    return output


# ---- HISTORY ----
@app.get("/history/{valve}")
def history(valve: int):
    return get_history(valve)


# ---- PROFESSIONAL PDF REPORT ----
@app.get("/report/{valve}")
def report(valve: int):

    data = update_valves()[valve]

    file_path = generate_report(valve, data)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"valve_{valve}_report.pdf"
    )

# ---- USER MODEL ----
class LoginData(BaseModel):
    username: str
    password: str

# ---- DEMO USER DATABASE ----
users = {
    "admin": "admin123",
    "operator": "valve123"
}

# ---- LOGIN API ----
@app.post("/login")
def login(data: LoginData):

    if data.username in users and users[data.username] == data.password:
        return {"status": "success", "user": data.username}

    raise HTTPException(status_code=401, detail="Invalid username or password")