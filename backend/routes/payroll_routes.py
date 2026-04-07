from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from database import attendance_collection, employees_collection
from models_extended import (
    AttendanceRecord,
    AttendanceRecordCreate,
    AttendanceRecordUpdate,
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
)
from payroll_service import (
    build_payroll_report,
    month_window,
    normalize_attendance_status,
    normalize_employee_type,
    normalize_payment_cycle,
    truncate_day,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


def _serialize(document: dict) -> dict:
    payload = dict(document)
    payload.pop("_id", None)
    return payload


def _normalize_employee_payload(payload: dict) -> dict:
    payload["employee_type"] = normalize_employee_type(payload.get("employee_type"))
    payload["payment_cycle"] = normalize_payment_cycle(payload.get("payment_cycle"))
    if payload["employee_type"] == "contract":
        payload["inss_percent"] = 0.0
    else:
        payload["inss_percent"] = float(payload.get("inss_percent") or 0.0)
    payload["salary"] = float(payload.get("salary") or 0.0)
    payload["cpf"] = (payload.get("cpf") or "").strip()
    payload["name"] = (payload.get("name") or "").strip()
    payload["role"] = (payload.get("role") or "").strip()
    return payload


@router.get("/employees")
async def list_employees(
    workspace_id: str = Query(...),
    employee_type: Optional[str] = Query(None),
    active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    query = {"workspace_id": workspace_id}
    if employee_type:
        query["employee_type"] = normalize_employee_type(employee_type)
    if active is not None:
        query["active"] = active
    items = await employees_collection.find(query).sort("name", 1).to_list(1000)
    return [_serialize(item) for item in items]


@router.post("/employees")
async def create_employee(
    payload: EmployeeCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    employee_data = _normalize_employee_payload(payload.dict())
    if not employee_data["name"] or not employee_data["cpf"] or not employee_data["role"]:
        raise HTTPException(status_code=400, detail="Nome, CPF e funcao sao obrigatorios.")

    existing = await employees_collection.find_one(
        {
            "workspace_id": workspace_id,
            "cpf": employee_data["cpf"],
            "active": True,
        }
    )
    if existing:
        raise HTTPException(status_code=409, detail="Ja existe funcionario ativo com este CPF.")

    employee = Employee(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        **employee_data,
    )
    await employees_collection.insert_one(employee.dict())
    return employee.dict()


@router.put("/employees/{employee_id}")
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    existing = await employees_collection.find_one({"workspace_id": workspace_id, "id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Funcionario nao encontrado.")

    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada.")

    merged = dict(existing)
    merged.update(update_data)
    merged["updated_at"] = datetime.utcnow()
    merged = _normalize_employee_payload(merged)
    await employees_collection.update_one(
        {"workspace_id": workspace_id, "id": employee_id},
        {"$set": merged},
    )
    updated = await employees_collection.find_one({"workspace_id": workspace_id, "id": employee_id})
    return _serialize(updated)


@router.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    workspace_id: str = Query(...),
    hard_delete: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    if hard_delete:
        result = await employees_collection.delete_one({"workspace_id": workspace_id, "id": employee_id})
        if not result.deleted_count:
            raise HTTPException(status_code=404, detail="Funcionario nao encontrado.")
    else:
        result = await employees_collection.update_one(
            {"workspace_id": workspace_id, "id": employee_id},
            {"$set": {"active": False, "updated_at": datetime.utcnow()}},
        )
        if not result.matched_count:
            raise HTTPException(status_code=404, detail="Funcionario nao encontrado.")
    return {"deleted": True, "hard_delete": hard_delete}


@router.post("/attendance")
async def create_or_update_attendance(
    payload: AttendanceRecordCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    employee = await employees_collection.find_one({"workspace_id": workspace_id, "id": payload.employee_id, "active": True})
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionario nao encontrado para registrar ponto.")

    day = truncate_day(payload.date)
    status = normalize_attendance_status(payload.status)

    existing = await attendance_collection.find_one(
        {"workspace_id": workspace_id, "employee_id": payload.employee_id, "date": day}
    )
    if existing:
        await attendance_collection.update_one(
            {"workspace_id": workspace_id, "id": existing["id"]},
            {
                "$set": {
                    "status": status,
                    "notes": payload.notes,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        updated = await attendance_collection.find_one({"workspace_id": workspace_id, "id": existing["id"]})
        return _serialize(updated)

    record = AttendanceRecord(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        employee_id=payload.employee_id,
        date=day,
        status=status,
        notes=payload.notes,
    )
    await attendance_collection.insert_one(record.dict())
    return record.dict()


@router.put("/attendance/{attendance_id}")
async def update_attendance(
    attendance_id: str,
    payload: AttendanceRecordUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada.")
    if "status" in update_data:
        update_data["status"] = normalize_attendance_status(update_data["status"])
    if "date" in update_data:
        update_data["date"] = truncate_day(update_data["date"])
    update_data["updated_at"] = datetime.utcnow()

    result = await attendance_collection.update_one(
        {"workspace_id": workspace_id, "id": attendance_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Registro de ponto nao encontrado.")
    item = await attendance_collection.find_one({"workspace_id": workspace_id, "id": attendance_id})
    return _serialize(item)


@router.get("/attendance")
async def list_attendance(
    workspace_id: str = Query(...),
    month: Optional[str] = Query(None, description="Formato YYYY-MM"),
    employee_id: Optional[str] = Query(None),
    employee_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    _, month_start, month_end = month_window(month)

    employee_query = {"workspace_id": workspace_id}
    if employee_id:
        employee_query["id"] = employee_id
    if employee_type:
        employee_query["employee_type"] = normalize_employee_type(employee_type)
    employees = await employees_collection.find(employee_query).to_list(2000)
    employee_lookup = {item["id"]: item for item in employees}
    if not employee_lookup:
        return {"items": [], "month": month or month_start.strftime("%Y-%m")}

    attendance_query = {
        "workspace_id": workspace_id,
        "employee_id": {"$in": list(employee_lookup.keys())},
        "date": {"$gte": month_start, "$lt": month_end},
    }
    records = await attendance_collection.find(attendance_query).sort("date", 1).to_list(10000)

    items = []
    for record in records:
        employee = employee_lookup.get(record.get("employee_id"))
        payload = _serialize(record)
        payload["employee_name"] = employee.get("name") if employee else None
        payload["employee_type"] = employee.get("employee_type") if employee else None
        items.append(payload)

    return {
        "month": month or month_start.strftime("%Y-%m"),
        "items": items,
    }


@router.get("/report")
async def payroll_report(
    workspace_id: str = Query(...),
    month: Optional[str] = Query(None, description="Formato YYYY-MM"),
    employee_type: Optional[str] = Query(None),
    payment_cycle: Optional[str] = Query(None, description="monthly ou biweekly"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    month_label, month_start, month_end = month_window(month)

    employee_query = {"workspace_id": workspace_id, "active": True}
    if employee_type:
        employee_query["employee_type"] = normalize_employee_type(employee_type)
    employees = await employees_collection.find(employee_query).to_list(5000)

    attendance = await attendance_collection.find(
        {
            "workspace_id": workspace_id,
            "date": {"$gte": month_start, "$lt": month_end},
            "employee_id": {"$in": [item["id"] for item in employees]} if employees else [],
        }
    ).to_list(50000)

    report = build_payroll_report(
        employees=employees,
        attendance_records=attendance,
        month_start=month_start,
        month_end=month_end,
        company_payment_cycle=payment_cycle,
    )
    report["month"] = month_label
    report["company_payment_cycle"] = normalize_payment_cycle(payment_cycle) if payment_cycle else None
    return report


@router.get("/estimate")
async def payroll_estimate(
    workspace_id: str = Query(...),
    month: Optional[str] = Query(None, description="Formato YYYY-MM"),
    payment_cycle: Optional[str] = Query(None, description="monthly ou biweekly"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    report = await payroll_report(
        workspace_id=workspace_id,
        month=month,
        employee_type=None,
        payment_cycle=payment_cycle,
        current_user=current_user,
    )
    return {
        "month": report["month"],
        "summary": report["summary"],
        "company_payment_cycle": report.get("company_payment_cycle"),
    }
