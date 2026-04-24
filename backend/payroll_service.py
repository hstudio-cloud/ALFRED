import calendar
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


def month_window(month: Optional[str] = None) -> Tuple[str, datetime, datetime]:
    now = datetime.utcnow()
    if not month:
        year, month_number = now.year, now.month
    else:
        match = re.match(r"^(\d{4})-(\d{2})$", month.strip())
        if not match:
            raise ValueError("Mes invalido. Use o formato YYYY-MM.")
        year = int(match.group(1))
        month_number = int(match.group(2))
        if month_number < 1 or month_number > 12:
            raise ValueError("Mes invalido. Use o formato YYYY-MM.")

    start = datetime(year, month_number, 1)
    if month_number == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month_number + 1, 1)
    return f"{year:04d}-{month_number:02d}", start, end


def normalize_employee_type(employee_type: Optional[str]) -> str:
    value = (employee_type or "clt").strip().lower()
    if value in {"contrato", "terceirizado", "contract"}:
        return "contract"
    return "clt"


def normalize_payment_cycle(payment_cycle: Optional[str]) -> str:
    value = (payment_cycle or "monthly").strip().lower()
    if value in {"quinzenal", "biweekly", "half_month"}:
        return "biweekly"
    return "monthly"


def normalize_attendance_status(status: Optional[str]) -> str:
    value = (status or "present").strip().lower()
    if value in {"falta", "ausente", "absent"}:
        return "absent"
    return "present"


def truncate_day(value: datetime) -> datetime:
    return datetime(value.year, value.month, value.day)


def business_days_count(start: datetime, end: datetime) -> int:
    current = start
    total = 0
    while current < end:
        if current.weekday() < 5:
            total += 1
        current += timedelta(days=1)
    return max(total, 1)


def contract_business_days_base(month_business_days: int) -> int:
    return max(int(month_business_days or 0), 22)


def _split_half_bounds(start: datetime, end: datetime) -> Tuple[datetime, datetime, datetime, datetime]:
    half_break = datetime(start.year, start.month, 16)
    half_break = min(max(half_break, start), end)
    return start, half_break, half_break, end


def _serialize_date_list(items: List[datetime]) -> List[str]:
    return [item.strftime("%d/%m/%Y") for item in sorted(items)]


def _get_month_days(start: datetime) -> int:
    return calendar.monthrange(start.year, start.month)[1]


def compute_employee_payroll(
    employee: Dict,
    attendance_records: List[Dict],
    month_start: datetime,
    month_end: datetime,
    company_payment_cycle: Optional[str] = None,
) -> Dict:
    employee_type = normalize_employee_type(employee.get("employee_type"))
    payment_cycle = normalize_payment_cycle(company_payment_cycle or employee.get("payment_cycle"))
    salary = float(employee.get("salary") or 0.0)
    salary_family_amount = float(employee.get("salary_family_amount") or 0.0) if employee_type == "clt" else 0.0
    dependents_count = int(employee.get("dependents_count") or 0) if employee_type == "clt" else 0
    inss_percent = float(employee.get("inss_percent") or 0.0) if employee_type == "clt" else 0.0

    month_business_days = business_days_count(month_start, month_end)
    contract_days_base = contract_business_days_base(month_business_days)
    month_days = _get_month_days(month_start)
    # CLT costuma usar base de 30 dias para desconto de faltas.
    daily_rate = (salary / 30.0) if employee_type == "clt" else (salary / contract_days_base)
    expected_days = 30 if employee_type == "clt" else contract_days_base

    present_dates: List[datetime] = []
    absent_dates: List[datetime] = []
    for record in attendance_records:
        record_date = record.get("date")
        if not isinstance(record_date, datetime):
            continue
        day_date = truncate_day(record_date)
        status = normalize_attendance_status(record.get("status"))
        if status == "absent":
            absent_dates.append(day_date)
        else:
            present_dates.append(day_date)

    present_days = len(present_dates)
    absent_days = len(absent_dates)

    absence_discount = absent_days * daily_rate
    gross_month = salary + salary_family_amount
    inss_discount = salary * (inss_percent / 100.0) if employee_type == "clt" else 0.0
    net_month = max(0.0, gross_month - absence_discount - inss_discount)

    half_1_start, half_1_end, half_2_start, half_2_end = _split_half_bounds(month_start, month_end)
    absent_half_1 = len([d for d in absent_dates if half_1_start <= d < half_1_end])
    absent_half_2 = len([d for d in absent_dates if half_2_start <= d < half_2_end])

    if payment_cycle == "biweekly":
        if employee_type == "clt":
            first_half_payment = gross_month / 2.0
            second_half_payment = max(0.0, net_month - first_half_payment)
        else:
            base_half = gross_month / 2.0
            first_half_payment = max(0.0, base_half - (absent_half_1 * daily_rate))
            second_half_payment = max(0.0, base_half - (absent_half_2 * daily_rate))
            net_month = first_half_payment + second_half_payment
    else:
        first_half_payment = 0.0
        second_half_payment = net_month

    return {
        "employee_id": employee.get("id"),
        "name": employee.get("name"),
        "cpf": employee.get("cpf"),
        "role": employee.get("role"),
        "employee_type": employee_type,
        "payment_cycle": payment_cycle,
        "salary": round(gross_month, 2),
        "base_salary": round(salary, 2),
        "salary_family_amount": round(salary_family_amount, 2),
        "dependents_count": dependents_count,
        "daily_rate": round(daily_rate, 2),
        "expected_days": expected_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "present_dates": _serialize_date_list(present_dates),
        "absent_dates": _serialize_date_list(absent_dates),
        "absence_discount": round(absence_discount, 2),
        "inss_percent": round(inss_percent, 2),
        "inss_discount": round(inss_discount, 2),
        "net_month_estimated": round(net_month, 2),
        "biweekly": {
            "enabled": payment_cycle == "biweekly",
            "first_half_payment": round(first_half_payment, 2),
            "second_half_payment": round(second_half_payment, 2),
            "absent_days_first_half": absent_half_1,
            "absent_days_second_half": absent_half_2,
        },
        "month_business_days": month_business_days,
        "contract_days_base": contract_days_base if employee_type == "contract" else None,
        "month_days": month_days,
    }


def build_payroll_report(
    employees: List[Dict],
    attendance_records: List[Dict],
    month_start: datetime,
    month_end: datetime,
    company_payment_cycle: Optional[str] = None,
) -> Dict:
    attendance_by_employee: Dict[str, List[Dict]] = {}
    for record in attendance_records:
        employee_id = record.get("employee_id")
        if not employee_id:
            continue
        attendance_by_employee.setdefault(employee_id, []).append(record)

    clt_rows: List[Dict] = []
    contract_rows: List[Dict] = []
    totals = {
        "employees": 0,
        "clt_employees": 0,
        "contract_employees": 0,
        "present_days": 0,
        "absent_days": 0,
        "gross_salary": 0.0,
        "salary_family_amount": 0.0,
        "absence_discount": 0.0,
        "inss_discount": 0.0,
        "net_payable": 0.0,
    }

    for employee in employees:
        row = compute_employee_payroll(
            employee=employee,
            attendance_records=attendance_by_employee.get(employee.get("id"), []),
            month_start=month_start,
            month_end=month_end,
            company_payment_cycle=company_payment_cycle,
        )

        totals["employees"] += 1
        totals["present_days"] += row["present_days"]
        totals["absent_days"] += row["absent_days"]
        totals["gross_salary"] += row["salary"]
        totals["salary_family_amount"] += row["salary_family_amount"]
        totals["absence_discount"] += row["absence_discount"]
        totals["inss_discount"] += row["inss_discount"]
        totals["net_payable"] += row["net_month_estimated"]

        if row["employee_type"] == "clt":
            totals["clt_employees"] += 1
            clt_rows.append(row)
        else:
            totals["contract_employees"] += 1
            contract_rows.append(row)

    clt_rows.sort(key=lambda item: item["name"] or "")
    contract_rows.sort(key=lambda item: item["name"] or "")

    return {
        "summary": {
            "employees": totals["employees"],
            "clt_employees": totals["clt_employees"],
            "contract_employees": totals["contract_employees"],
            "present_days": totals["present_days"],
            "absent_days": totals["absent_days"],
            "gross_salary": round(totals["gross_salary"], 2),
            "salary_family_amount": round(totals["salary_family_amount"], 2),
            "absence_discount": round(totals["absence_discount"], 2),
            "inss_discount": round(totals["inss_discount"], 2),
            "net_payable": round(totals["net_payable"], 2),
        },
        "groups": {
            "clt": clt_rows,
            "contract": contract_rows,
        },
    }
