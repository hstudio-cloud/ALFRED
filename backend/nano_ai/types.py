from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class NanoAction:
    type: str
    data: Dict[str, Any] = field(default_factory=dict)
    assumptions: List[str] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class NanoActionResult:
    type: str
    ok: bool
    message: str
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NanoConversationTurn:
    role: str
    content: str


@dataclass
class NanoReply:
    message: str
    actions: List[NanoAction] = field(default_factory=list)
    execution_results: List[NanoActionResult] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NanoVoiceRequest:
    text: str
    voice_mode: str = "default"
    locale: str = "pt-BR"
    speed: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
