from typing import Any, Dict, Optional

from database import attendance_collection, employees_collection
from payroll_service import build_payroll_report, month_window, normalize_employee_type, normalize_payment_cycle


async def get_payroll_summary(
    workspace_id: str,
    month: Optional[str] = None,
    employee_type: Optional[str] = None,
    payment_cycle: Optional[str] = None,
) -> Dict[str, Any]:
    month_label, month_start, month_end = month_window(month)
    employee_query = {"workspace_id": workspace_id, "active": True}
    if employee_type:
        employee_query["employee_type"] = normalize_employee_type(employee_type)
    employees = await employees_collection.find(employee_query).to_list(5000)
    attendance = await attendance_collection.find(
        {
            "workspace_id": workspace_id,
            "date": {"$gte": month_start, "$lt": month_end},
            "employee_id": {"$in": [e["id"] for e in employees]} if employees else [],
        }
    ).to_list(50000)

    report = build_payroll_report(
        employees=employees,
        attendance_records=attendance,
        month_start=month_start,
        month_end=month_end,
        company_payment_cycle=payment_cycle,
    )
    return {
        "month": month_label,
        "company_payment_cycle": normalize_payment_cycle(payment_cycle) if payment_cycle else None,
        "summary": report.get("summary", {}),
    }

