from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from database import (
    attendance_collection,
    bills_collection,
    categories_collection,
    employees_collection,
    nano_activities_collection,
    reminders_collection,
    tasks_collection,
    transactions_collection,
)
from models import Transaction
from models_extended import (
    AttendanceRecord,
    Bill,
    Employee,
    FinancialCategory,
    NanoActivity,
    ReminderFinancial,
)
from payroll_service import (
    build_payroll_report,
    month_window,
    normalize_attendance_status,
    normalize_employee_type,
    normalize_payment_cycle,
    truncate_day,
)
from services.nano_activity_service import (
    normalize_activity_recurrence,
    normalize_activity_scope,
    normalize_reminder_minutes,
    normalize_weekdays,
)


class NanoActionRunner:
    """Executes validated Nano actions against the current backend data model."""

    @staticmethod
    def _missing_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
        missing = []
        for field in required_fields:
            value = data.get(field)
            if value is None:
                missing.append(field)
                continue
            if isinstance(value, str) and not value.strip():
                missing.append(field)
        return missing

    @staticmethod
    def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _format_brl(value: float) -> str:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    @staticmethod
    def _format_datetime_label(value: Optional[datetime]) -> str:
        if not value:
            return "-"
        return value.strftime("%d/%m/%Y %H:%M")

    @staticmethod
    def _normalize_cpf(value: Optional[str]) -> str:
        if not value:
            return ""
        return "".join(ch for ch in str(value) if ch.isdigit())

    @staticmethod
    def _day_bounds(period: str = "today") -> tuple[datetime, datetime, str]:
        now = datetime.utcnow()
        if period == "upcoming":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
            return start, end, "proximos 7 dias"
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        return start, end, "hoje"

    async def _ensure_category_exists(
        self,
        workspace_id: str,
        user_id: str,
        category_name: str,
        kind: str,
        account_scope: str,
    ) -> None:
        existing = await categories_collection.find_one(
            {"workspace_id": workspace_id, "name": category_name}
        )
        if existing:
            return

        category = FinancialCategory(
            workspace_id=workspace_id,
            user_id=user_id,
            name=category_name,
            kind=kind,
            account_scope=account_scope if account_scope in {"personal", "business"} else "both",
        )
        await categories_collection.insert_one(category.dict())

    async def _execute_transaction_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = list(data.get("missing_fields", []))
        missing_fields.extend(self._missing_required_fields(data, ["category", "type", "amount"]))
        missing_fields = list(dict.fromkeys(missing_fields))
        if missing_fields:
            return {
                "type": "create_transaction",
                "status": "needs_input",
                "message": f"Faltaram dados para registrar a movimentacao: {', '.join(missing_fields)}.",
                "data": data,
            }

        await self._ensure_category_exists(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            category_name=data["category"],
            kind=data["type"],
            account_scope=data.get("account_scope", "personal"),
        )

        transaction = Transaction(
            user_id=current_user["id"],
            type=data["type"],
            category=data["category"],
            amount=float(data["amount"]),
            description=data.get("description"),
            payment_method=data.get("payment_method", "other"),
            account_scope=data.get("account_scope", "personal"),
            date=self._parse_iso_datetime(data.get("date")) or datetime.utcnow(),
        )
        payload = transaction.dict()
        payload["workspace_id"] = workspace_id
        await transactions_collection.insert_one(payload)

        label = "receita" if transaction.type == "income" else "despesa"
        scope_label = "empresa" if transaction.account_scope == "business" else "pessoal"
        payment_label = {
            "pix": "via Pix",
            "card": "no cartao",
            "boleto": "por boleto",
            "transfer": "por transferencia",
            "cash": "em dinheiro",
            "other": "sem metodo informado",
        }.get(transaction.payment_method, "sem metodo informado")
        return {
            "type": "create_transaction",
            "status": "executed",
            "message": (
                f"Registrei uma {label} de {self._format_brl(transaction.amount)} em "
                f"{transaction.category}, {payment_label}, no financeiro {scope_label}."
            ),
            "data": transaction.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_bill_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = data.get("missing_fields", [])
        if missing_fields:
            return {
                "type": "create_bill",
                "status": "needs_input",
                "message": f"Faltaram dados para criar a conta: {', '.join(missing_fields)}.",
                "data": data,
            }

        await self._ensure_category_exists(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            category_name=data["category"],
            kind="both" if data["type"] == "receivable" else "expense",
            account_scope=data.get("account_scope", "business"),
        )

        bill = Bill(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            title=data["title"],
            amount=float(data["amount"]),
            type=data["type"],
            due_date=self._parse_iso_datetime(data.get("due_date")) or datetime.utcnow(),
            category=data["category"],
            payment_method=data.get("payment_method", "other"),
            account_scope=data.get("account_scope", "business"),
            description=data.get("description"),
            recurring=bool(data.get("recurring")),
        )
        await bills_collection.insert_one(bill.dict())

        label = "Conta a receber" if bill.type == "receivable" else "Conta a pagar"
        return {
            "type": "create_bill",
            "status": "executed",
            "message": (
                f"Criei a {label.lower()} {bill.title} no valor de {self._format_brl(bill.amount)} "
                f"com vencimento em {self._format_datetime_label(bill.due_date)}."
            ),
            "data": bill.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_reminder_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        remind_at = self._parse_iso_datetime(data.get("remind_at")) or datetime.utcnow()

        reminder = ReminderFinancial(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            title=data.get("title") or "Lembrete financeiro",
            remind_at=remind_at,
            description=data.get("description"),
        )
        await reminders_collection.insert_one(reminder.dict())

        return {
            "type": "create_reminder",
            "status": "executed",
            "message": f"Deixei o lembrete {reminder.title} agendado para {self._format_datetime_label(reminder.remind_at)}.",
            "data": reminder.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_activity_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = list(data.get("missing_fields", []))
        missing_fields.extend(self._missing_required_fields(data, ["title", "start_at"]))
        missing_fields = list(dict.fromkeys(missing_fields))
        if missing_fields:
            return {
                "type": "create_activity",
                "status": "needs_input",
                "message": f"Faltaram dados para registrar a atividade: {', '.join(missing_fields)}.",
                "data": data,
            }

        activity = NanoActivity(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            title=data.get("title") or "Atividade",
            description=data.get("description"),
            account_scope=normalize_activity_scope(data.get("account_scope")),
            start_at=self._parse_iso_datetime(data.get("start_at")) or datetime.utcnow(),
            recurrence=normalize_activity_recurrence(data.get("recurrence")),
            weekdays=normalize_weekdays(
                data.get("weekdays"),
                normalize_activity_recurrence(data.get("recurrence")),
            ),
            reminder_minutes_before=normalize_reminder_minutes(
                data.get("reminder_minutes_before")
            ),
            notify_web=bool(data.get("notify_web", True)),
            notify_whatsapp=bool(data.get("notify_whatsapp", True)),
            is_active=bool(data.get("is_active", True)),
        )
        await nano_activities_collection.insert_one(activity.dict())

        recurrence_label_map = {
            "once": "uma vez",
            "daily": "todos os dias",
            "weekdays": "dias uteis",
            "weekly": "semanal",
            "custom": "dias selecionados",
        }
        recurrence_label = recurrence_label_map.get(activity.recurrence, activity.recurrence)
        scope_label = "empresa" if activity.account_scope == "business" else "pessoal"
        return {
            "type": "create_activity",
            "status": "executed",
            "message": (
                f"Registrei a atividade {activity.title} para {self._format_datetime_label(activity.start_at)}, "
                f"no escopo {scope_label}, com recorrencia {recurrence_label} e aviso {activity.reminder_minutes_before} minuto(s) antes."
            ),
            "data": activity.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_analysis_action(
        self,
        workspace_id: str,
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        period = action.get("data", {}).get("period", "30d")
        day_map = {"7d": 7, "30d": 30, "90d": 90, "year": 365}
        days = day_map.get(period, 30)
        start_date = datetime.utcnow() - timedelta(days=days)

        transactions = await transactions_collection.find(
            {"workspace_id": workspace_id, "date": {"$gte": start_date}}
        ).to_list(1000)

        income = sum(item["amount"] for item in transactions if item["type"] == "income")
        expenses = sum(item["amount"] for item in transactions if item["type"] == "expense")
        balance = income - expenses

        category_totals: Dict[str, float] = {}
        for item in transactions:
            if item["type"] != "expense":
                continue
            category = item.get("category", "Geral")
            category_totals[category] = category_totals.get(category, 0.0) + item["amount"]

        top_categories = sorted(
            category_totals.items(),
            key=lambda entry: entry[1],
            reverse=True,
        )[:3]

        highlights = []
        if top_categories:
            highlights.append(
                "Maiores categorias: " + ", ".join(
                    f"{name} ({self._format_brl(amount)})" for name, amount in top_categories
                ) + "."
            )
        if expenses > income and expenses > 0:
            highlights.append("Seu periodo terminou com mais saidas do que entradas.")
        elif expenses > 0:
            highlights.append("As entradas ainda cobrem as saidas no periodo analisado.")
        else:
            highlights.append("Ainda nao encontrei despesas suficientes para uma analise mais profunda.")

        return {
            "type": "analyze_spending",
            "status": "executed",
            "message": (
                f"Analisei os ultimos {days} dias: entradas de {self._format_brl(income)}, "
                f"saidas de {self._format_brl(expenses)} e saldo de {self._format_brl(balance)}. "
                + " ".join(highlights)
            ),
            "data": {
                "period": period,
                "days": days,
                "income": income,
                "expenses": expenses,
                "balance": balance,
                "top_categories": top_categories,
            },
        }

    async def _execute_navigation_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        data = action.get("data", {})
        section = data.get("section")
        label = data.get("label") or section or "area solicitada"
        if not section:
            return {
                "type": "navigate",
                "status": "needs_input",
                "message": "Nao identifiquei qual area do Nano voce quer abrir.",
                "data": data,
            }

        return {
            "type": "navigate",
            "status": "executed",
            "message": f"Abri a area {label} para voce.",
            "data": {"section": section, "label": label},
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_agenda_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        start, end, period_label = self._day_bounds(data.get("period", "today"))

        reminders = await reminders_collection.find(
            {
                "workspace_id": workspace_id,
                "user_id": current_user["id"],
                "is_active": True,
                "remind_at": {"$gte": start, "$lt": end},
            }
        ).sort("remind_at", 1).to_list(20)

        bills = await bills_collection.find(
            {
                "workspace_id": workspace_id,
                "status": {"$in": ["pending", "overdue"]},
                "due_date": {"$gte": start, "$lt": end},
            }
        ).sort("due_date", 1).to_list(20)

        tasks = await tasks_collection.find(
            {
                "$or": [
                    {"workspace_id": workspace_id},
                    {"user_id": current_user["id"]},
                ],
                "status": {"$nin": ["completed", "cancelled"]},
                "due_date": {"$gte": start, "$lt": end},
            }
        ).sort("due_date", 1).to_list(20)

        raw_activities = await nano_activities_collection.find(
            {
                "workspace_id": workspace_id,
                "user_id": current_user["id"],
                "is_active": True,
            }
        ).sort("start_at", 1).to_list(100)
        activities = []
        for item in raw_activities:
            next_occurrence = compute_next_activity_occurrence(item, now=start)
            if next_occurrence and start <= next_occurrence < end:
                activities.append({**item, "next_occurrence_at": next_occurrence})

        lines: List[str] = []
        if reminders:
            lines.append(
                "Lembretes: "
                + "; ".join(
                    f"{item.get('title', 'Lembrete')} as {self._format_datetime_label(item.get('remind_at'))[-5:]}"
                    for item in reminders[:3]
                )
                + "."
            )
        if bills:
            lines.append(
                "Contas: "
                + "; ".join(
                    f"{item.get('title', 'Conta')} ({self._format_brl(float(item.get('amount', 0)))})"
                    for item in bills[:3]
                )
                + "."
            )
        if tasks:
            lines.append(
                "Tarefas: "
                + "; ".join(item.get("title", "Tarefa") for item in tasks[:3])
                + "."
            )
        if activities:
            lines.append(
                "Atividades: "
                + "; ".join(
                    f"{item.get('title', 'Atividade')} as {self._format_datetime_label(item.get('next_occurrence_at') or item.get('start_at'))[-5:]}"
                    for item in activities[:3]
                )
                + "."
            )

        total_items = len(reminders) + len(bills) + len(tasks) + len(activities)
        if not total_items:
            message = (
                f"Por enquanto, nao encontrei compromissos, contas, lembretes ou atividades para {period_label}. "
                "Se quiser, posso criar uma atividade, um lembrete ou revisar suas proximas contas."
            )
        else:
            message = (
                f"Encontrei {total_items} item(ns) na sua agenda para {period_label}. "
                + " ".join(lines)
            )

        return {
            "type": "check_agenda",
            "status": "executed",
            "message": message,
            "data": {
                "period": data.get("period", "today"),
                "period_label": period_label,
                "reminders": reminders,
                "bills": bills,
                "tasks": tasks,
                "activities": activities,
                "total_items": total_items,
            },
        }

    async def _resolve_employee_by_reference(self, workspace_id: str, reference: Optional[str]) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        if not reference:
            return None, "Informe qual funcionario devo usar (nome ou CPF)."

        normalized_reference = reference.strip()
        cpf_reference = self._normalize_cpf(normalized_reference)

        if cpf_reference:
            employees = await employees_collection.find(
                {"workspace_id": workspace_id, "active": True}
            ).to_list(2000)
            for employee in employees:
                if self._normalize_cpf(employee.get("cpf")) == cpf_reference:
                    return employee, None

        by_name = await employees_collection.find(
            {
                "workspace_id": workspace_id,
                "active": True,
                "name": {"$regex": normalized_reference, "$options": "i"},
            }
        ).to_list(20)
        if not by_name:
            return None, "Nao encontrei funcionario com esse nome/CPF."
        if len(by_name) > 1:
            options = ", ".join(item.get("name", "Sem nome") for item in by_name[:3])
            return None, f"Encontrei mais de um funcionario. Seja mais especifico: {options}."
        return by_name[0], None

    async def _execute_create_employee_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = data.get("missing_fields", [])
        if missing_fields:
            labels = {
                "name": "nome",
                "cpf": "CPF",
                "role": "funcao",
                "salary": "salario",
            }
            readable = ", ".join(labels.get(item, item) for item in missing_fields)
            return {
                "type": "create_employee",
                "status": "needs_input",
                "message": f"Para cadastrar o funcionario, preciso de: {readable}.",
                "data": data,
            }

        cpf = str(data.get("cpf") or "").strip()
        existing = await employees_collection.find_one(
            {"workspace_id": workspace_id, "cpf": cpf, "active": True}
        )
        if existing:
            return {
                "type": "create_employee",
                "status": "needs_input",
                "message": "Ja existe funcionario ativo com esse CPF.",
                "data": data,
            }

        employee_type = normalize_employee_type(data.get("employee_type"))
        payment_cycle = normalize_payment_cycle(data.get("payment_cycle"))
        inss_percent = float(data.get("inss_percent") or 0.0) if employee_type == "clt" else 0.0

        employee = Employee(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            name=str(data.get("name")).strip(),
            cpf=cpf,
            role=str(data.get("role")).strip(),
            salary=float(data.get("salary") or 0.0),
            employee_type=employee_type,
            payment_cycle=payment_cycle,
            inss_percent=inss_percent,
            notes=data.get("notes"),
        )
        await employees_collection.insert_one(employee.dict())

        employee_label = "CLT" if employee_type == "clt" else "Contrato"
        inss_label = f" com INSS de {inss_percent:.2f}%" if employee_type == "clt" else ""
        cycle_label = "quinzenal" if payment_cycle == "biweekly" else "mensal"
        return {
            "type": "create_employee",
            "status": "executed",
            "message": (
                f"Funcionario {employee.name} cadastrado como {employee_label}, salario {self._format_brl(employee.salary)}, "
                f"pagamento {cycle_label}{inss_label}."
            ),
            "data": employee.dict(),
        }

    async def _execute_register_attendance_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        if data.get("missing_fields"):
            return {
                "type": "register_attendance",
                "status": "needs_input",
                "message": "Me diga o nome ou CPF do funcionario para registrar o ponto.",
                "data": data,
            }

        employee, resolve_error = await self._resolve_employee_by_reference(
            workspace_id=workspace_id,
            reference=data.get("employee_reference"),
        )
        if resolve_error:
            return {
                "type": "register_attendance",
                "status": "needs_input",
                "message": resolve_error,
                "data": data,
            }

        attendance_date = self._parse_iso_datetime(data.get("date")) or datetime.utcnow()
        day = truncate_day(attendance_date)
        status = normalize_attendance_status(data.get("status"))

        existing = await attendance_collection.find_one(
            {"workspace_id": workspace_id, "employee_id": employee["id"], "date": day}
        )
        if existing:
            await attendance_collection.update_one(
                {"workspace_id": workspace_id, "id": existing["id"]},
                {
                    "$set": {
                        "status": status,
                        "notes": data.get("notes"),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            payload = await attendance_collection.find_one({"workspace_id": workspace_id, "id": existing["id"]})
        else:
            record = AttendanceRecord(
                workspace_id=workspace_id,
                user_id=current_user["id"],
                employee_id=employee["id"],
                date=day,
                status=status,
                notes=data.get("notes"),
            )
            await attendance_collection.insert_one(record.dict())
            payload = record.dict()

        status_label = "presenca" if status == "present" else "falta"
        return {
            "type": "register_attendance",
            "status": "executed",
            "message": f"Registrei {status_label} de {employee.get('name')} em {day.strftime('%d/%m/%Y')}.",
            "data": payload,
        }

    async def _execute_generate_payroll_report_action(
        self,
        workspace_id: str,
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        try:
            month_label, month_start, month_end = month_window(data.get("month"))
        except ValueError as exc:
            return {
                "type": "generate_payroll_report",
                "status": "needs_input",
                "message": str(exc),
                "data": data,
            }

        employee_query: Dict[str, Any] = {"workspace_id": workspace_id, "active": True}
        if data.get("employee_type"):
            employee_query["employee_type"] = normalize_employee_type(data.get("employee_type"))
        employees = await employees_collection.find(employee_query).to_list(5000)
        if not employees:
            return {
                "type": "generate_payroll_report",
                "status": "needs_input",
                "message": "Ainda nao ha funcionarios ativos cadastrados para gerar esse relatorio.",
                "data": data,
            }

        attendance = await attendance_collection.find(
            {
                "workspace_id": workspace_id,
                "employee_id": {"$in": [item["id"] for item in employees]},
                "date": {"$gte": month_start, "$lt": month_end},
            }
        ).to_list(50000)

        report = build_payroll_report(
            employees=employees,
            attendance_records=attendance,
            month_start=month_start,
            month_end=month_end,
            company_payment_cycle=data.get("payment_cycle"),
        )

        summary = report["summary"]
        cycle = normalize_payment_cycle(data.get("payment_cycle")) if data.get("payment_cycle") else "padrao por funcionario"
        message = (
            f"Fechamento de {month_label}: {summary['employees']} funcionario(s), "
            f"faltas {summary['absent_days']}, bruto {self._format_brl(summary['gross_salary'])}, "
            f"descontos por falta {self._format_brl(summary['absence_discount'])}, "
            f"INSS {self._format_brl(summary['inss_discount'])} e liquido estimado {self._format_brl(summary['net_payable'])}. "
            f"Ciclo de pagamento considerado: {cycle}."
        )

        return {
            "type": "generate_payroll_report",
            "status": "executed",
            "message": message,
            "data": {
                "month": month_label,
                **report,
            },
        }

    async def execute_actions(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        results = []
        for action in actions:
            action_type = action.get("type")
            try:
                if action_type == "create_transaction":
                    results.append(await self._execute_transaction_action(workspace_id, current_user, action))
                elif action_type == "create_bill":
                    results.append(await self._execute_bill_action(workspace_id, current_user, action))
                elif action_type == "create_reminder":
                    results.append(await self._execute_reminder_action(workspace_id, current_user, action))
                elif action_type == "create_activity":
                    results.append(await self._execute_activity_action(workspace_id, current_user, action))
                elif action_type == "analyze_spending":
                    results.append(await self._execute_analysis_action(workspace_id, action))
                elif action_type == "navigate":
                    results.append(await self._execute_navigation_action(action))
                elif action_type == "check_agenda":
                    results.append(await self._execute_agenda_action(workspace_id, current_user, action))
                elif action_type == "create_employee":
                    results.append(await self._execute_create_employee_action(workspace_id, current_user, action))
                elif action_type == "register_attendance":
                    results.append(await self._execute_register_attendance_action(workspace_id, current_user, action))
                elif action_type == "generate_payroll_report":
                    results.append(await self._execute_generate_payroll_report_action(workspace_id, action))
                else:
                    results.append(
                        {
                            "type": action_type or "unknown_action",
                            "status": "failed",
                            "message": "Ainda nao sei executar essa acao automaticamente.",
                            "data": action.get("data") or {},
                        }
                    )
            except Exception as exc:
                results.append(
                    {
                        "type": action_type or "unknown_action",
                        "status": "failed",
                        "message": "Encontrei uma falha ao executar essa etapa. Posso tentar de novo com mais detalhes.",
                        "data": action.get("data") or {},
                        "error": str(exc),
                    }
                )
        return results

    def compose_assistant_reply(
        self,
        workspace_name: str,
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        if not executed_actions:
            return fallback_response

        lines = [fallback_response.strip()]
        assumptions: List[str] = []
        executed_messages: List[str] = []
        follow_up = None

        for item in executed_actions:
            status = item.get("status")
            if status == "executed":
                executed_messages.append(item["message"])
            elif status == "needs_input":
                follow_up = f"Para eu concluir, preciso de mais um detalhe: {item['message']}"

            for assumption in item.get("assumptions", []):
                assumptions.append(assumption)

        if executed_messages:
            lines.append("")
            lines.extend(f"- {message}" for message in executed_messages)

        if assumptions:
            unique_assumptions = list(dict.fromkeys(assumptions))
            lines.append("")
            lines.append("Assumi o seguinte para agilizar:")
            lines.extend(f"- {assumption}" for assumption in unique_assumptions)

        if follow_up:
            lines.append("")
            lines.append(follow_up)
        elif executed_messages:
            lines.append("")
            lines.append(f"Se quiser, eu continuo organizando o financeiro de {workspace_name} por voz ou texto.")

        return "\n".join(lines)
