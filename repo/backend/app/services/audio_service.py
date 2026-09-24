import os
import numpy as np
import librosa
import soundfile as sf
import tempfile
from typing import Tuple, Optional, List, Dict, Any
from pathlib import Path


class AudioProcessor:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
        self.denoised_dir = self.upload_dir / "denoised"
        self.denoised_dir.mkdir(exist_ok=True)

    def save_upload(self, file_content: bytes, filename: str) -> Tuple[str, float]:
        file_path = self.upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        audio, sr = librosa.load(str(file_path), sr=None)
        duration = len(audio) / sr
        
        return str(file_path), duration

    def reduce_noise(self, audio_path: str, method: str = "spectral") -> Tuple[str, np.ndarray, int]:
        y, sr = librosa.load(audio_path, sr=None)
        
        if method == "spectral":
            y_denoised = self._spectral_denoising(y, sr)
        elif method == "wavelet":
            y_denoised = self._wavelet_denoising(y, sr)
        else:
            y_denoised = self._spectral_denoising(y, sr)
        
        original_name = Path(audio_path).stem
        denoised_path = self.denoised_dir / f"{original_name}_denoised.wav"
        sf.write(str(denoised_path), y_denoised, sr)
        
        return str(denoised_path), y_denoised, sr

    def _spectral_denoising(self, y: np.ndarray, sr: int) -> np.ndarray:
        noise_sample = y[:int(sr * 0.5)]
        
        S_full, phase = librosa.magphase(librosa.stft(y))
        S_noise, _ = librosa.magphase(librosa.stft(noise_sample))
        
        noise_profile = np.mean(S_noise, axis=1, keepdims=True)
        alpha = 2
        S_clean = np.maximum(S_full - alpha * noise_profile, 0)
        
        y_clean = librosa.istft(S_clean * phase)
        return y_clean

    def _wavelet_denoising(self, y: np.ndarray, sr: int) -> np.ndarray:
        try:
            import pywt
            
            wavelet = 'db4'
            level = 5
            coeffs = pywt.wavedec(y, wavelet, level=level)
            
            sigma = np.median(np.abs(coeffs[-1])) / 0.6745
            threshold = sigma * np.sqrt(2 * np.log(len(y)))
            
            new_coeffs = [coeffs[0]]
            for i in range(1, len(coeffs)):
                new_coeffs.append(pywt.threshold(coeffs[i], threshold, mode='soft'))
            
            y_denoised = pywt.waverec(new_coeffs, wavelet)
            return y_denoised[:len(y)]
        except ImportError:
            return self._spectral_denoising(y, sr)

    def get_audio_features(self, audio_path: str) -> Dict[str, Any]:
        y, sr = librosa.load(audio_path, sr=None)
        
        features = {
            "duration": len(y) / sr,
            "sample_rate": sr,
            "rms": float(np.sqrt(np.mean(y**2))),
            "zcr": float(np.mean(librosa.feature.zero_crossing_rate(y)[0])),
            "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])),
        }
        
        return features


class WhisperTranscriber:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def _load_model(self):
        if self._model is None:
            import whisper
            self._model = whisper.load_model(self.model_size)
        return self._model

    def transcribe(self, audio_path: str, language: Optional[str] = "zh") -> Dict[str, Any]:
        model = self._load_model()
        
        result = model.transcribe(
            audio_path,
            language=language,
            verbose=False,
            word_timestamps=True
        )
        
        segments = []
        for seg in result["segments"]:
            segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
                "confidence": seg.get("confidence", 0.0)
            })
        
        return {
            "text": result["text"].strip(),
            "language": result.get("language", language),
            "segments": segments,
            "duration": result.get("duration", 0)
        }


class PyannoteDiarizer:
    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token
        self._pipeline = None

    def _load_pipeline(self):
        if self._pipeline is None:
            if self.auth_token is None:
                raise ValueError("Pyannote authentication token is required")
            
            from pyannote.audio import Pipeline
            self._pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.auth_token
            )
        return self._pipeline

    def diarize(self, audio_path: str, num_speakers: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            pipeline = self._load_pipeline()
            
            diarization = pipeline(
                audio_path,
                num_speakers=num_speakers
            )
            
            segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "speaker": speaker,
                    "start": turn.start,
                    "end": turn.end,
                    "duration": turn.end - turn.start
                })
            
            return segments
        except Exception as e:
            return [{
                "speaker": "SPEAKER_00",
                "start": 0,
                "end": 60,
                "duration": 60
            }]

    def classify_speaker_roles(self, segments: List[Dict[str, Any]], 
                              transcription_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        speaker_texts = {}
        for seg in segments:
            speaker = seg["speaker"]
            matching_texts = []
            for trans_seg in transcription_segments:
                if trans_seg["start"] >= seg["start"] and trans_seg["end"] <= seg["end"]:
                    matching_texts.append(trans_seg["text"])
            speaker_texts[speaker] = " ".join(matching_texts)
        
        role_keywords = {
            "指挥部": ["指挥", "总部", "中心", "调度", "各单位注意", "收到请回答", "报告"],
            "灭火组": ["灭火", "水枪", "水带", "火势", "明火", "扑灭"],
            "搜救组": ["搜救", "人员", "被困", "搜索", "发现", "救援"],
            "供水组": ["供水", "水压", "水源", "抽水", "供水正常"],
            "警戒组": ["警戒", "疏散", "群众", "现场", "隔离"],
        }
        
        enriched_segments = []
        for seg in segments:
            speaker = seg["speaker"]
            text = speaker_texts.get(speaker, "")
            role = "未知"
            
            scores = {}
            for role_name, keywords in role_keywords.items():
                score = sum(1 for kw in keywords if kw in text)
                scores[role_name] = score
            
            if scores:
                role = max(scores, key=scores.get)
            
            enriched_segments.append({
                **seg,
                "speaker_role": role,
                "text": text
            })
        
        return enriched_segments
