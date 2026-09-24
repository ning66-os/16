from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from ..database import get_db
from .. import models, schemas
from ..services.audio_service import AudioProcessor, WhisperTranscriber, PyannoteDiarizer
from ..services.summary_service import SummaryGenerator
from ..services.email_service import EmailService
from ..config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])

audio_processor = AudioProcessor()
transcriber = WhisperTranscriber()
diarizer = PyannoteDiarizer(settings.PYANNOTE_AUTH_TOKEN)
summary_generator = SummaryGenerator()
email_service = EmailService()


@router.post("", response_model=schemas.FireCase)
def create_case(case: schemas.FireCaseCreate, db: Session = Depends(get_db)):
    db_case = models.FireCase(**case.model_dump())
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


@router.get("", response_model=List[schemas.FireCase])
def list_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = db.query(models.FireCase).offset(skip).limit(limit).all()
    return cases


@router.get("/{case_id}", response_model=schemas.FireCase)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.put("/{case_id}", response_model=schemas.FireCase)
def update_case(case_id: int, case_update: schemas.FireCaseUpdate, db: Session = Depends(get_db)):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = case_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)
    
    db.commit()
    db.refresh(case)
    return case


@router.post("/{case_id}/upload-audio")
async def upload_audio(
    case_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if file.size and file.size > settings.MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail="Audio file too large")
    
    content = await file.read()
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    original_path, duration = audio_processor.save_upload(content, unique_filename)
    
    audio_record = models.AudioRecord(
        fire_case_id=case_id,
        filename=file.filename,
        original_path=original_path,
        duration=duration,
        status="uploaded"
    )
    db.add(audio_record)
    db.commit()
    db.refresh(audio_record)
    
    background_tasks.add_task(
        process_audio_background,
        audio_record.id,
        original_path,
        db
    )
    
    return {
        "audio_record_id": audio_record.id,
        "filename": file.filename,
        "duration": duration,
        "status": "processing"
    }


def process_audio_background(audio_record_id: int, audio_path: str, db: Session):
    try:
        audio_record = db.query(models.AudioRecord).filter(
            models.AudioRecord.id == audio_record_id
        ).first()
        if not audio_record:
            return
        
        audio_record.status = "denoising"
        db.commit()
        
        denoised_path, _, _ = audio_processor.reduce_noise(audio_path)
        audio_record.denoised_path = denoised_path
        
        audio_record.status = "transcribing"
        db.commit()
        
        transcription_result = transcriber.transcribe(denoised_path, language="zh")
        
        transcription = models.Transcription(
            audio_record_id=audio_record_id,
            text=transcription_result["text"],
            language=transcription_result["language"]
        )
        db.add(transcription)
        
        audio_record.status = "diarizing"
        db.commit()
        
        diarization_segments = diarizer.diarize(denoised_path)
        enriched_segments = diarizer.classify_speaker_roles(
            diarization_segments,
            transcription_result["segments"]
        )
        
        for seg in enriched_segments:
            speaker_segment = models.SpeakerSegment(
                audio_record_id=audio_record_id,
                speaker=seg["speaker"],
                speaker_role=seg.get("speaker_role", "未知"),
                start_time=seg["start"],
                end_time=seg["end"],
                text=seg.get("text", ""),
                confidence=0.8
            )
            db.add(speaker_segment)
        
        audio_record.status = "completed"
        db.commit()
        
        fire_case = db.query(models.FireCase).filter(
            models.FireCase.id == audio_record.fire_case_id
        ).first()
        if fire_case:
            fire_case.status = "audio_processed"
            db.commit()
            
    except Exception as e:
        if audio_record:
            audio_record.status = "failed"
            db.commit()
        print(f"Audio processing error: {e}")


@router.get("/{case_id}/audio", response_model=List[schemas.AudioRecord])
def get_case_audio(case_id: int, db: Session = Depends(get_db)):
    audio_records = db.query(models.AudioRecord).filter(
        models.AudioRecord.fire_case_id == case_id
    ).all()
    return audio_records


@router.get("/{case_id}/transcriptions")
def get_case_transcriptions(case_id: int, db: Session = Depends(get_db)):
    audio_records = db.query(models.AudioRecord).filter(
        models.AudioRecord.fire_case_id == case_id
    ).all()
    
    transcriptions = []
    for ar in audio_records:
        for t in ar.transcriptions:
            transcriptions.append({
                "id": t.id,
                "audio_record_id": t.audio_record_id,
                "text": t.text,
                "language": t.language,
                "created_at": t.created_at
            })
    
    return transcriptions


@router.get("/{case_id}/speaker-segments")
def get_case_speaker_segments(case_id: int, db: Session = Depends(get_db)):
    audio_records = db.query(models.AudioRecord).filter(
        models.AudioRecord.fire_case_id == case_id
    ).all()
    
    segments = []
    for ar in audio_records:
        for seg in ar.speaker_segments:
            segments.append({
                "id": seg.id,
                "speaker": seg.speaker,
                "speaker_role": seg.speaker_role,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": seg.text,
                "confidence": seg.confidence
            })
    
    return sorted(segments, key=lambda x: x["start_time"])


@router.post("/{case_id}/annotations", response_model=schemas.Annotation)
def create_annotation(
    case_id: int,
    annotation: schemas.AnnotationCreate,
    db: Session = Depends(get_db)
):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db_annotation = models.Annotation(**annotation.model_dump())
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation


@router.get("/{case_id}/annotations", response_model=List[schemas.Annotation])
def get_case_annotations(case_id: int, db: Session = Depends(get_db)):
    annotations = db.query(models.Annotation).filter(
        models.Annotation.fire_case_id == case_id
    ).all()
    return annotations


@router.delete("/{case_id}/annotations/{annotation_id}")
def delete_annotation(case_id: int, annotation_id: int, db: Session = Depends(get_db)):
    annotation = db.query(models.Annotation).filter(
        models.Annotation.id == annotation_id,
        models.Annotation.fire_case_id == case_id
    ).first()
    if annotation is None:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(annotation)
    db.commit()
    return {"message": "Annotation deleted"}


@router.post("/{case_id}/timeline-events", response_model=schemas.TimelineEvent)
def create_timeline_event(
    case_id: int,
    event: schemas.TimelineEventCreate,
    db: Session = Depends(get_db)
):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db_event = models.TimelineEvent(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.get("/{case_id}/timeline-events", response_model=List[schemas.TimelineEvent])
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    events = db.query(models.TimelineEvent).filter(
        models.TimelineEvent.fire_case_id == case_id
    ).order_by(models.TimelineEvent.event_time).all()
    return events


@router.post("/{case_id}/generate-summary")
def generate_summary(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    audio_records = db.query(models.AudioRecord).filter(
        models.AudioRecord.fire_case_id == case_id
    ).all()
    
    transcriptions = []
    speaker_segments = []
    
    for ar in audio_records:
        for t in ar.transcriptions:
            transcriptions.append({
                "text": t.text,
                "start_time": 0
            })
        
        for seg in ar.speaker_segments:
            speaker_segments.append({
                "speaker": seg.speaker,
                "speaker_role": seg.speaker_role,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": seg.text
            })
    
    annotations = db.query(models.Annotation).filter(
        models.Annotation.fire_case_id == case_id
    ).all()
    
    annotation_dicts = []
    for ann in annotations:
        annotation_dicts.append({
            "annotation_type": ann.annotation_type,
            "position": ann.position,
            "label": ann.label,
            "description": ann.description,
            "timestamp": ann.timestamp
        })
    
    case_info = {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "description": case.description,
        "location": case.location,
        "fire_date": case.fire_date.isoformat() if case.fire_date else None
    }
    
    result = summary_generator.generate_fire_summary(
        case_info,
        transcriptions,
        speaker_segments,
        annotation_dicts
    )
    
    if result["success"]:
        report = models.Report(
            fire_case_id=case_id,
            title=f"{case.title} - 复盘报告",
            content=result["content"],
            content_type="markdown",
            report_type="summary"
        )
        db.add(report)
        
        timeline_events = summary_generator.generate_timeline_events(
            case_id,
            speaker_segments
        )
        
        for event in timeline_events:
            db_event = models.TimelineEvent(**event)
            db.add(db_event)
        
        case.status = "completed"
        db.commit()
    
    return result


@router.get("/{case_id}/reports", response_model=List[schemas.Report])
def get_case_reports(case_id: int, db: Session = Depends(get_db)):
    reports = db.query(models.Report).filter(
        models.Report.fire_case_id == case_id
    ).all()
    return reports


@router.post("/{case_id}/send-email")
async def send_report_email(
    case_id: int,
    email_request: schemas.EmailSendRequest,
    db: Session = Depends(get_db)
):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    reports = db.query(models.Report).filter(
        models.Report.fire_case_id == case_id,
        models.Report.report_type == "summary"
    ).order_by(models.Report.created_at.desc()).all()
    
    if not reports:
        raise HTTPException(status_code=400, detail="No summary report found. Generate one first.")
    
    report = reports[0]
    subject = email_request.subject or f"[火灾复盘报告] {case.case_number} - {case.title}"
    
    case_info = {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "location": case.location,
        "fire_date": case.fire_date.strftime('%Y-%m-%d %H:%M:%S') if case.fire_date else "未知"
    }
    
    result = await email_service.send_report_email(
        to_emails=email_request.to_emails,
        subject=subject,
        case_info=case_info,
        report_content=report.content,
        include_3d_link=email_request.include_3d_link
    )
    
    for email in email_request.to_emails:
        email_log = models.EmailLog(
            fire_case_id=case_id,
            to_email=email,
            subject=subject,
            success=result["success"],
            error_message=None if result["success"] else result.get("message", "")
        )
        db.add(email_log)
    
    db.commit()
    
    return result


@router.get("/{case_id}/3d-link")
def get_3d_link(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.FireCase).filter(models.FireCase.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    annotations = db.query(models.Annotation).filter(
        models.Annotation.fire_case_id == case_id
    ).all()
    
    annotation_data = []
    for ann in annotations:
        annotation_data.append({
            "id": ann.id,
            "type": ann.annotation_type,
            "position": ann.position,
            "label": ann.label,
            "description": ann.description,
            "timestamp": ann.timestamp
        })
    
    return {
        "url": f"{settings.APP_URL}/cases/{case_id}/3d",
        "case_id": case_id,
        "annotations": annotation_data
    }
