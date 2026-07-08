"""Unit tests for MediNova Appointment & Patient Management API."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))
from main import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ---------------------------------------------------------------------------
# Platform endpoints
# ---------------------------------------------------------------------------

def test_platform_info(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "success"
    assert "MediNova" in data["data"]["platform"]
    assert len(data["data"]["services"]) >= 5


def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_ready_endpoint(client):
    r = client.get("/ready")
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "ready"


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

def test_list_all_patients(client):
    r = client.get("/api/v1/patients")
    assert r.status_code == 200
    data = r.get_json()
    assert data["data"]["total"] == 3


def test_filter_patients_by_city(client):
    r = client.get("/api/v1/patients?city=Mumbai")
    assert r.status_code == 200
    for p in r.get_json()["data"]["patients"]:
        assert p["city"] == "Mumbai"


def test_filter_patients_by_status(client):
    r = client.get("/api/v1/patients?status=active")
    assert r.status_code == 200
    for p in r.get_json()["data"]["patients"]:
        assert p["status"] == "active"


def test_get_patient_found(client):
    r = client.get("/api/v1/patients/PAT-001")
    assert r.status_code == 200
    assert r.get_json()["data"]["patient"]["patient_id"] == "PAT-001"


def test_get_patient_not_found(client):
    r = client.get("/api/v1/patients/PAT-999")
    assert r.status_code == 404
    assert r.get_json()["status"] == "error"


# ---------------------------------------------------------------------------
# Doctors
# ---------------------------------------------------------------------------

def test_list_all_doctors(client):
    r = client.get("/api/v1/doctors")
    assert r.status_code == 200
    assert r.get_json()["data"]["total"] == 3


def test_filter_doctors_by_specialization(client):
    r = client.get("/api/v1/doctors?specialization=Cardiology")
    assert r.status_code == 200
    for d in r.get_json()["data"]["doctors"]:
        assert d["specialization"] == "Cardiology"


def test_filter_doctors_by_city(client):
    r = client.get("/api/v1/doctors?city=Delhi")
    assert r.status_code == 200
    for d in r.get_json()["data"]["doctors"]:
        assert d["city"] == "Delhi"


def test_get_doctor_found(client):
    r = client.get("/api/v1/doctors/DR-001")
    assert r.status_code == 200
    assert r.get_json()["data"]["doctor"]["doctor_id"] == "DR-001"


def test_get_doctor_not_found(client):
    r = client.get("/api/v1/doctors/DR-999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------

def test_list_all_appointments(client):
    r = client.get("/api/v1/appointments")
    assert r.status_code == 200
    assert r.get_json()["data"]["total"] == 3


def test_filter_appointments_by_status(client):
    r = client.get("/api/v1/appointments?status=confirmed")
    assert r.status_code == 200
    for a in r.get_json()["data"]["appointments"]:
        assert a["status"] == "confirmed"


def test_filter_appointments_by_patient(client):
    r = client.get("/api/v1/appointments?patient_id=PAT-001")
    assert r.status_code == 200
    for a in r.get_json()["data"]["appointments"]:
        assert a["patient_id"] == "PAT-001"


def test_filter_appointments_by_type(client):
    r = client.get("/api/v1/appointments?type=telemedicine")
    assert r.status_code == 200
    for a in r.get_json()["data"]["appointments"]:
        assert a["type"] == "telemedicine"


def test_get_appointment_found(client):
    r = client.get("/api/v1/appointments/APT-2024-001")
    assert r.status_code == 200
    assert r.get_json()["data"]["appointment"]["appointment_id"] == "APT-2024-001"


def test_get_appointment_not_found(client):
    r = client.get("/api/v1/appointments/APT-XXXX")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Medical Records
# ---------------------------------------------------------------------------

def test_list_medical_records(client):
    r = client.get("/api/v1/medical-records")
    assert r.status_code == 200
    assert r.get_json()["data"]["total"] == 1


def test_filter_medical_records_by_patient(client):
    r = client.get("/api/v1/medical-records?patient_id=PAT-001")
    assert r.status_code == 200
    for rec in r.get_json()["data"]["records"]:
        assert rec["patient_id"] == "PAT-001"


def test_get_medical_record_found(client):
    r = client.get("/api/v1/medical-records/REC-001")
    assert r.status_code == 200
    data = r.get_json()["data"]["record"]
    assert "vitals" in data
    assert "prescriptions" in data


def test_get_medical_record_not_found(client):
    r = client.get("/api/v1/medical-records/REC-999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def test_analytics_summary(client):
    r = client.get("/api/v1/analytics/summary")
    assert r.status_code == 200
    data = r.get_json()["data"]
    assert "total_appointments" in data
    assert "completion_rate_pct" in data
    assert len(data["top_specializations"]) >= 3


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

def test_404_handler(client):
    r = client.get("/nonexistent-route")
    assert r.status_code == 404
    assert r.get_json()["status"] == "error"


def test_response_has_request_id(client):
    r = client.get("/")
    assert "request_id" in r.get_json()


def test_response_has_timestamp(client):
    r = client.get("/health")
    assert "timestamp" in r.get_json()
