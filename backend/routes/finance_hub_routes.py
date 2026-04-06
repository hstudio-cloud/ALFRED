from typing import Optional

from fastapi import APIRouter, Depends, Query

from routes.auth_routes import get_current_user
from routes.finance_routes import (
    get_automation_insights,
    get_forecast,
    get_report_summary,
    get_summary,
)

router = APIRouter(prefix="/api/finance", tags=["finance"])


@router.get("/overview")
async def finance_overview(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    period: str = Query("30d"),
    current_user: dict = Depends(get_current_user),
):
    summary = await get_summary(
        workspace_id=workspace_id,
        account_scope=account_scope,
        current_user=current_user,
    )
    report = await get_report_summary(
        workspace_id=workspace_id,
        account_scope=account_scope,
        period=period,
        current_user=current_user,
    )
    forecast = await get_forecast(
        workspace_id=workspace_id,
        account_scope=account_scope,
        current_user=current_user,
    )
    alerts = await get_automation_insights(
        workspace_id=workspace_id,
        account_scope=account_scope,
        current_user=current_user,
    )
    return {
        "summary": summary,
        "report": report,
        "forecast": forecast,
        "alerts": alerts,
    }
