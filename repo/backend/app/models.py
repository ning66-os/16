from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class FireCase(Base):
    __tablename__ = "fire_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True)
    title = Column(String(200))
    description = Column(Text)
    location = Column(String(200))
    fire_date = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status = Column(String(20), default="processing")

    audio_records = relationship("AudioRecord", back_populates="fire_case")
    annotations = relationship("Annotation", back_populates="fire_case")
    timeline_events = relationship("TimelineEvent", back_populates="fire_case")
    reports = relationship("Report", back_populates="fire_case")


class AudioRecord(Base):
    __tablename__ = "audio_records"

    id = Column(Integer, primary_key=True, index=True)
    fire_case_id = Column(Integer, ForeignKey("fire_cases.id"))
    filename = Column(String(255))
    original_path = Column(String(500))
    denoised_path = Column(String(500))
    duration = Column(Float)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fire_case = relationship("FireCase", back_populates="audio_records")
    transcriptions = relationship("Transcription", back_populates="audio_record")
    speaker_segments = relationship("SpeakerSegment", back_populates="audio_record")


class Transcription(Base):
    __tablename__ = "transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    audio_record_id = Column(Integer, ForeignKey("audio_records.id"))
    text = Column(Text)
    language = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audio_record = relationship("AudioRecord", back_populates="transcriptions")


class SpeakerSegment(Base):
    __tablename__ = "speaker_segments"

    id = Column(Integer, primary_key=True, index=True)
    audio_record_id = Column(Integer, ForeignKey("audio_records.id"))
    speaker = Column(String(50))
    speaker_role = Column(String(50))
    start_time = Column(Float)
    end_time = Column(Float)
    text = Column(Text)
    confidence = Column(Float)

    audio_record = relationship("AudioRecord", back_populates="speaker_segments")


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    fire_case_id = Column(Integer, ForeignKey("fire_cases.id"))
    annotation_type = Column(String(20))
    position = Column(JSON)
    label = Column(String(200))
    description = Column(Text)
    timestamp = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fire_case = relationship("FireCase", back_populates="annotations")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    fire_case_id = Column(Integer, ForeignKey("fire_cases.id"))
    event_time = Column(Float)
    event_type = Column(String(50))
    title = Column(String(200))
    description = Column(Text)
    source = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fire_case = relationship("FireCase", back_populates="timeline_events")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    fire_case_id = Column(Integer, ForeignKey("fire_cases.id"))
    title = Column(String(200))
    content = Column(Text)
    content_type = Column(String(20), default="markdown")
    report_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fire_case = relationship("FireCase", back_populates="reports")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    fire_case_id = Column(Integer, ForeignKey("fire_cases.id"))
    to_email = Column(String(200))
    subject = Column(String(200))
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    success = Column(Boolean, default=False)
    error_message = Column(Text)
