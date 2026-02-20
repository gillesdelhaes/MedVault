"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("color", sa.String(7), nullable=False, server_default="#4A6FA5"),
        sa.Column("notes", sa.String, nullable=True),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("provider_name", sa.String(255), nullable=False),
        sa.Column("location", sa.String, nullable=True),
        sa.Column("reason", sa.String, nullable=True),
        sa.Column("follow_up_required", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("notes", sa.String, nullable=True),
    )
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_datetime", "appointments", ["datetime"])

    op.create_table(
        "symptom_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("severity", sa.Integer, nullable=False),
        sa.Column("description", sa.String, nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String, nullable=True),
    )
    op.create_index("ix_symptom_logs_patient_id", "symptom_logs", ["patient_id"])
    op.create_index("ix_symptom_logs_logged_at", "symptom_logs", ["logged_at"])

    op.create_table(
        "medications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("dosage", sa.String(100), nullable=False),
        sa.Column("frequency_per_day", sa.Integer, nullable=False, server_default="1"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("is_ongoing", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("schedule_notes", sa.String, nullable=True),
        sa.Column("notes", sa.String, nullable=True),
    )
    op.create_index("ix_medications_patient_id", "medications", ["patient_id"])

    op.create_table(
        "medication_doses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("medication_id", sa.String(36), sa.ForeignKey("medications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantity", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("notes", sa.String, nullable=True),
    )
    op.create_index("ix_medication_doses_medication_id", "medication_doses", ["medication_id"])


def downgrade() -> None:
    op.drop_table("medication_doses")
    op.drop_table("medications")
    op.drop_table("symptom_logs")
    op.drop_table("appointments")
    op.drop_table("patients")
