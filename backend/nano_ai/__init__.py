"""Nano AI package.

This package is the first internal boundary for evolving Nano from
provider-coupled assistant logic into a product-owned intelligence layer.
"""

from .brain import NanoBrain
from .coordinator import NanoCoordinator
from .finance_engine import NanoFinanceEngine
from .gateway import NanoGateway
from .memory import NanoMemoryManager
from .model_provider import (
    ModelProviderBase,
    OpenAIModelProvider,
    SelfHostedModelProvider,
    resolve_model_provider,
)
from .action_runner import NanoActionRunner
from .specialists import (
    FinanceOperationsSpecialist,
    InsightSpecialist,
    ProductivitySpecialist,
    ReminderSpecialist,
)
from .types import (
    NanoAction,
    NanoActionResult,
    NanoConversationTurn,
    NanoReply,
    NanoVoiceRequest,
)
from .voice import NanoVoiceManager

__all__ = [
    "NanoAction",
    "NanoActionResult",
    "NanoActionRunner",
    "NanoBrain",
    "NanoCoordinator",
    "NanoConversationTurn",
    "NanoFinanceEngine",
    "NanoGateway",
    "NanoMemoryManager",
    "ModelProviderBase",
    "NanoReply",
    "OpenAIModelProvider",
    "FinanceOperationsSpecialist",
    "InsightSpecialist",
    "ProductivitySpecialist",
    "ReminderSpecialist",
    "SelfHostedModelProvider",
    "NanoVoiceManager",
    "NanoVoiceRequest",
    "resolve_model_provider",
]
