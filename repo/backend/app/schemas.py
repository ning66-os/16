from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class FireCaseBase(BaseModel):
    case_number: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    fire_date: Optional[datetime] = None


class FireCaseCreate(FireCaseBase):
    pass


class FireCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    fire_date: Optional[datetime] = None
    status: Optional[str] = None


class FireCase(FireCaseBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AudioRecordBase(BaseModel):
    fire_case_id: int
    filename: str


class AudioRecord(AudioRecordBase):
    id: int
    original_path: Optional[str] = None
    denoised_path: Optional[str] = None
    duration: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptionBase(BaseModel):
    audio_record_id: int
    text: str
    language: Optional[str] = None


class Transcription(TranscriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SpeakerSegmentBase(BaseModel):
    audio_record_id: int
    speaker: str
    speaker_role: Optional[str] = None
    start_time: float
    end_time: float
    text: Optional[str] = None
    confidence: Optional[float] = None


class SpeakerSegment(SpeakerSegmentBase):
    id: int

    class Config:
        from_attributes = True


class AnnotationBase(BaseModel):
    fire_case_id: int
    annotation_type: str
    position: Dict[str, Any]
    label: Optional[str] = None
    description: Optional[str] = None
    timestamp: Optional[float] = None


class AnnotationCreate(AnnotationBase):
    pass


class Annotation(AnnotationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TimelineEventBase(BaseModel):
    fire_case_id: int
    event_time: float
    event_type: str
    title: str
    description: Optional[str] = None
    source: Optional[str] = None


class TimelineEventCreate(TimelineEventBase):
    pass


class TimelineEvent(TimelineEventBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    fire_case_id: int
    title: str
    content: str
    content_type: str = "markdown"
    report_type: str


class Report(ReportBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EmailSendRequest(BaseModel):
    fire_case_id: int
    to_emails: List[EmailStr]
    subject: Optional[str] = None
    include_3d_link: bool = True


class AudioProcessingResponse(BaseModel):
    audio_record_id: int
    status: str
    message: str


class SummaryGenerateRequest(BaseModel):
    fire_case_id: int


class SmokePathCreate(BaseModel):
    fire_case_id: int
    points: List[Dict[str, float]]
    label: Optional[str] = None
    description: Optional[str] = None
