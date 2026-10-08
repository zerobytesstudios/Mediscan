from pydantic import BaseModel


class AdminStats(BaseModel):
    total_users: int
    patients: int
    doctors: int
    hospitals: int
    documents: int
    appointments: int
    pending_doctor_approvals: int
    unread_notifications: int
