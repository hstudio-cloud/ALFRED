from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional


IntentLabel = Literal[
    "system_action",
    "system_query",
    "financial_analysis",
    "general_chat",
    "web_research",
    "memory_recall",
    "followup_missing_data",
    "unknown",
]


@dataclass
class IntentClassification:
    label: IntentLabel
    confidence: float
    entities: Dict[str, Any] = field(default_factory=dict)
    needs_context: bool = True
    requires_tool: bool = False
    missing_fields: List[str] = field(default_factory=list)


@dataclass
class PlanStep:
    name: str
    tool: Optional[str] = None
    tool_input: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionPlan:
    intent: IntentClassification
    steps: List[PlanStep] = field(default_factory=list)
    followup_needed: bool = False
    missing_fields: List[str] = field(default_factory=list)


@dataclass
class AgentResult:
    message: str
    intent: str
    tool_results: Dict[str, Any] = field(default_factory=dict)
    actions: List[Dict[str, Any]] = field(default_factory=list)
    executed_actions: List[Dict[str, Any]] = field(default_factory=list)
    followup_needed: bool = False
    missing_fields: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

