from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional


VALID_ACTIVITY_SCOPES = {"personal", "business"}
VALID_ACTIVITY_RECURRENCES = {"once", "daily", "weekdays", "weekly", "custom"}


def normalize_activity_scope(value: Optional[str]) -> str:
    normalized = (value or "personal").strip().lower()
    if normalized in {"empresa", "business"}:
        return "business"
    return "personal"


def normalize_activity_recurrence(value: Optional[str]) -> str:
    normalized = (value or "once").strip().lower()
    if normalized in VALID_ACTIVITY_RECURRENCES:
        return normalized
    if normalized in {"dias_uteis", "weekday", "weekdays"}:
        return "weekdays"
    if normalized in {"diario", "todos_os_dias"}:
        return "daily"
    if normalized in {"semanal"}:
        return "weekly"
    return "once"


def normalize_weekdays(weekdays: Optional[list[int]], recurrence: str) -> list[int]:
    if recurrence == "weekdays" and not weekdays:
        return [0, 1, 2, 3, 4]
    cleaned = sorted({day for day in (weekdays or []) if 0 <= int(day) <= 6})
    return [int(day) for day in cleaned]


def normalize_reminder_minutes(value: Optional[int]) -> int:
    minutes = int(value or 60)
    if minutes <= 0:
        return 30
    return min(minutes, 24 * 60)


def compute_next_activity_occurrence(activity: dict, now: Optional[datetime] = None) -> Optional[datetime]:
    reference = now or datetime.utcnow()
    start_at = activity.get("start_at")
    if not isinstance(start_at, datetime):
        return None

    recurrence = normalize_activity_recurrence(activity.get("recurrence"))
    weekdays = normalize_weekdays(activity.get("weekdays"), recurrence)

    if recurrence == "once":
        return start_at if start_at >= reference else None

    base = start_at
    for offset in range(0, 366):
        candidate_day = (base + timedelta(days=offset)).replace(
            hour=start_at.hour,
            minute=start_at.minute,
            second=0,
            microsecond=0,
        )
        if candidate_day < reference:
            continue
        if recurrence == "daily":
            return candidate_day
        if recurrence == "weekly":
            if candidate_day.weekday() == start_at.weekday():
                return candidate_day
            continue
        if recurrence in {"weekdays", "custom"}:
            if candidate_day.weekday() in weekdays:
                return candidate_day
            continue
    return None


def compute_activity_reminder_at(activity: dict, now: Optional[datetime] = None) -> Optional[datetime]:
    next_occurrence = compute_next_activity_occurrence(activity, now=now)
    if not next_occurrence:
        return None
    minutes = normalize_reminder_minutes(activity.get("reminder_minutes_before"))
    return next_occurrence - timedelta(minutes=minutes)
