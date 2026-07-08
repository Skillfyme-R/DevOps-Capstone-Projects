"""
MediNova Health Solutions — Appointment & Patient Management API
Platform  : Healthcare Appointment & Patient Management
Company   : MediNova Health Solutions
Version   : 1.0.0
"""
from flask import Flask, jsonify, request
import os
import logging
import time
import uuid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("medinova.api")

app = Flask(__name__)

# --- Platform Configuration ---
PLATFORM_NAME = "MediNova Appointment & Patient Management Platform"
COMPANY       = "MediNova Health Solutions"
API_VERSION   = "v1"
APP_VERSION   = os.getenv("APP_VERSION", "1.0.0")
ENVIRONMENT   = os.getenv("ENVIRONMENT", "development")
AWS_REGION    = os.getenv("AWS_REGION", "us-east-1")


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

def _request_id() -> str:
    return request.headers.get("X-Request-Id", str(uuid.uuid4()))

def _ok(data: dict, status: int = 200):
    return jsonify({
        "status": "success",
        "request_id": _request_id(),
        "timestamp": int(time.time()),
        "data": data
    }), status

def _err(message: str, status: int = 400):
    return jsonify({
        "status": "error",
        "request_id": _request_id(),
        "timestamp": int(time.time()),
        "message": message
    }), status


# ---------------------------------------------------------------------------
# Platform info
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def platform_info():
    return _ok({
        "platform": PLATFORM_NAME,
        "company": COMPANY,
        "version": APP_VERSION,
        "api_version": API_VERSION,
        "environment": ENVIRONMENT,
        "region": AWS_REGION,
        "tagline": "Smarter Healthcare, Closer to You",
        "services": [
            "appointment-scheduling",
            "patient-management",
            "doctor-directory",
            "medical-records",
            "prescription-management",
            "billing-invoicing",
            "lab-results",
            "telemedicine",
            "notifications",
            "analytics"
        ]
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "platform": PLATFORM_NAME,
        "version": APP_VERSION,
        "environment": ENVIRONMENT,
        "timestamp": int(time.time())
    }), 200

@app.route("/ready", methods=["GET"])
def ready():
    return jsonify({
        "status": "ready",
        "environment": ENVIRONMENT,
        "timestamp": int(time.time())
    }), 200


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

PATIENTS = [
    {
        "patient_id": "PAT-001",
        "name": "Rajesh Kumar",
        "age": 45,
        "gender": "Male",
        "blood_group": "O+",
        "phone": "+91-9800000001",
        "email": "rajesh.k@example.com",
        "city": "Mumbai",
        "registered_on": "2023-01-15",
        "medical_history": ["Hypertension", "Type 2 Diabetes"],
        "primary_doctor": "DR-001",
        "insurance_provider": "Star Health Insurance",
        "status": "active"
    },
    {
        "patient_id": "PAT-002",
        "name": "Priya Sharma",
        "age": 32,
        "gender": "Female",
        "blood_group": "A+",
        "phone": "+91-9800000002",
        "email": "priya.s@example.com",
        "city": "Delhi",
        "registered_on": "2023-03-20",
        "medical_history": ["Asthma"],
        "primary_doctor": "DR-002",
        "insurance_provider": "HDFC Ergo",
        "status": "active"
    },
    {
        "patient_id": "PAT-003",
        "name": "Arjun Mehta",
        "age": 58,
        "gender": "Male",
        "blood_group": "B-",
        "phone": "+91-9800000003",
        "email": "arjun.m@example.com",
        "city": "Bengaluru",
        "registered_on": "2022-11-10",
        "medical_history": ["Coronary Artery Disease", "Hypothyroidism"],
        "primary_doctor": "DR-001",
        "insurance_provider": "Bajaj Allianz",
        "status": "active"
    }
]

@app.route("/api/v1/patients", methods=["GET"])
def list_patients():
    city   = request.args.get("city")
    status = request.args.get("status")
    results = PATIENTS
    if city:
        results = [p for p in results if p["city"].lower() == city.lower()]
    if status:
        results = [p for p in results if p["status"] == status]
    logger.info("Patient list requested — returned %d records", len(results))
    return _ok({"patients": results, "total": len(results)})

@app.route("/api/v1/patients/<patient_id>", methods=["GET"])
def get_patient(patient_id: str):
    patient = next((p for p in PATIENTS if p["patient_id"] == patient_id), None)
    if not patient:
        return _err(f"Patient '{patient_id}' not found", 404)
    return _ok({"patient": patient})


# ---------------------------------------------------------------------------
# Doctors
# ---------------------------------------------------------------------------

DOCTORS = [
    {
        "doctor_id": "DR-001",
        "name": "Dr. Anil Kapoor",
        "specialization": "Cardiology",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience_years": 18,
        "hospital": "MediNova Heart Centre",
        "city": "Mumbai",
        "consultation_fee": 1500,
        "currency": "INR",
        "available_slots": ["Mon", "Wed", "Fri"],
        "rating": 4.9,
        "languages": ["Hindi", "English", "Marathi"],
        "status": "available"
    },
    {
        "doctor_id": "DR-002",
        "name": "Dr. Sunita Reddy",
        "specialization": "Pulmonology",
        "qualification": "MBBS, MD (Respiratory Medicine)",
        "experience_years": 12,
        "hospital": "MediNova Respiratory Clinic",
        "city": "Delhi",
        "consultation_fee": 1200,
        "currency": "INR",
        "available_slots": ["Tue", "Thu", "Sat"],
        "rating": 4.7,
        "languages": ["Telugu", "Hindi", "English"],
        "status": "available"
    },
    {
        "doctor_id": "DR-003",
        "name": "Dr. Vikram Singh",
        "specialization": "Orthopedics",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience_years": 15,
        "hospital": "MediNova Bone & Joint Institute",
        "city": "Bengaluru",
        "consultation_fee": 1800,
        "currency": "INR",
        "available_slots": ["Mon", "Tue", "Thu", "Fri"],
        "rating": 4.8,
        "languages": ["Kannada", "Hindi", "English"],
        "status": "available"
    }
]

@app.route("/api/v1/doctors", methods=["GET"])
def list_doctors():
    specialization = request.args.get("specialization")
    city           = request.args.get("city")
    results        = DOCTORS
    if specialization:
        results = [d for d in results if d["specialization"].lower() == specialization.lower()]
    if city:
        results = [d for d in results if d["city"].lower() == city.lower()]
    return _ok({"doctors": results, "total": len(results)})

@app.route("/api/v1/doctors/<doctor_id>", methods=["GET"])
def get_doctor(doctor_id: str):
    doctor = next((d for d in DOCTORS if d["doctor_id"] == doctor_id), None)
    if not doctor:
        return _err(f"Doctor '{doctor_id}' not found", 404)
    return _ok({"doctor": doctor})


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------

APPOINTMENTS = [
    {
        "appointment_id": "APT-2024-001",
        "patient_id": "PAT-001",
        "doctor_id": "DR-001",
        "appointment_date": "2024-07-15",
        "appointment_time": "10:00 AM",
        "type": "in-person",
        "status": "confirmed",
        "reason": "Cardiac follow-up",
        "hospital": "MediNova Heart Centre",
        "consultation_fee": 1500,
        "currency": "INR",
        "booked_on": "2024-07-10T08:30:00Z"
    },
    {
        "appointment_id": "APT-2024-002",
        "patient_id": "PAT-002",
        "doctor_id": "DR-002",
        "appointment_date": "2024-07-16",
        "appointment_time": "03:00 PM",
        "type": "telemedicine",
        "status": "confirmed",
        "reason": "Asthma follow-up",
        "hospital": "MediNova Respiratory Clinic",
        "consultation_fee": 1200,
        "currency": "INR",
        "booked_on": "2024-07-11T14:00:00Z"
    },
    {
        "appointment_id": "APT-2024-003",
        "patient_id": "PAT-003",
        "doctor_id": "DR-003",
        "appointment_date": "2024-07-18",
        "appointment_time": "11:30 AM",
        "type": "in-person",
        "status": "completed",
        "reason": "Knee pain evaluation",
        "hospital": "MediNova Bone & Joint Institute",
        "consultation_fee": 1800,
        "currency": "INR",
        "booked_on": "2024-07-08T10:00:00Z"
    }
]

@app.route("/api/v1/appointments", methods=["GET"])
def list_appointments():
    status     = request.args.get("status")
    patient_id = request.args.get("patient_id")
    apt_type   = request.args.get("type")
    results    = APPOINTMENTS
    if status:
        results = [a for a in results if a["status"] == status]
    if patient_id:
        results = [a for a in results if a["patient_id"] == patient_id]
    if apt_type:
        results = [a for a in results if a["type"] == apt_type]
    return _ok({"appointments": results, "total": len(results)})

@app.route("/api/v1/appointments/<appointment_id>", methods=["GET"])
def get_appointment(appointment_id: str):
    appt = next((a for a in APPOINTMENTS if a["appointment_id"] == appointment_id), None)
    if not appt:
        return _err(f"Appointment '{appointment_id}' not found", 404)
    return _ok({"appointment": appt})


# ---------------------------------------------------------------------------
# Medical Records
# ---------------------------------------------------------------------------

MEDICAL_RECORDS = [
    {
        "record_id": "REC-001",
        "patient_id": "PAT-001",
        "appointment_id": "APT-2024-001",
        "doctor_id": "DR-001",
        "date": "2024-07-15",
        "diagnosis": "Hypertensive Heart Disease — Stable",
        "vitals": {
            "blood_pressure": "138/88 mmHg",
            "heart_rate": "76 bpm",
            "temperature": "98.4°F",
            "weight": "82 kg",
            "spo2": "98%"
        },
        "prescriptions": [
            {"medicine": "Amlodipine 5mg", "dosage": "1 tablet daily", "duration": "30 days"},
            {"medicine": "Metformin 500mg", "dosage": "1 tablet twice daily", "duration": "30 days"}
        ],
        "lab_tests_ordered": ["Lipid Profile", "HbA1c", "ECG"],
        "follow_up_date": "2024-08-15",
        "notes": "Patient responding well to current medication. Continue lifestyle modifications."
    }
]

@app.route("/api/v1/medical-records", methods=["GET"])
def list_medical_records():
    patient_id = request.args.get("patient_id")
    results    = MEDICAL_RECORDS
    if patient_id:
        results = [r for r in results if r["patient_id"] == patient_id]
    return _ok({"records": results, "total": len(results)})

@app.route("/api/v1/medical-records/<record_id>", methods=["GET"])
def get_medical_record(record_id: str):
    record = next((r for r in MEDICAL_RECORDS if r["record_id"] == record_id), None)
    if not record:
        return _err(f"Medical record '{record_id}' not found", 404)
    return _ok({"record": record})


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@app.route("/api/v1/analytics/summary", methods=["GET"])
def analytics_summary():
    return _ok({
        "period": "last_30_days",
        "total_appointments": 4832,
        "completed_appointments": 4201,
        "cancelled_appointments": 631,
        "completion_rate_pct": 86.9,
        "new_patients": 423,
        "returning_patients": 4409,
        "telemedicine_appointments": 1820,
        "in_person_appointments": 3012,
        "telemedicine_pct": 37.7,
        "top_specializations": [
            {"specialization": "General Medicine", "appointments": 1240},
            {"specialization": "Cardiology", "appointments": 820},
            {"specialization": "Orthopedics", "appointments": 610},
            {"specialization": "Pulmonology", "appointments": 480},
            {"specialization": "Dermatology", "appointments": 390}
        ],
        "total_revenue_inr": 6842500,
        "avg_consultation_fee_inr": 1415
    })


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return _err("Resource not found", 404)

@app.errorhandler(405)
def method_not_allowed(e):
    return _err("Method not allowed", 405)

@app.errorhandler(500)
def server_error(e):
    logger.error("Internal server error: %s", str(e))
    return _err("Internal server error", 500)


if __name__ == "__main__":  # pragma: no cover
    host  = os.getenv("FLASK_HOST", "0.0.0.0")
    port  = int(os.getenv("FLASK_PORT", "8080"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    logger.info("Starting %s v%s on %s:%d [%s]", PLATFORM_NAME, APP_VERSION, host, port, ENVIRONMENT)
    app.run(host=host, port=port, debug=debug)
