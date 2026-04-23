import io
import json
import os
import re
from typing import Any, Dict, List

import pdfplumber
from openai import AsyncOpenAI


class PayrollDocumentService:
    """Le planilhas e folhas de pagamento para importar funcionarios automaticamente."""

    def __init__(self):
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        base_url = (os.getenv("OPENAI_BASE_URL") or "").strip() or None
        self.model = (
            os.getenv("OPENAI_DOCUMENT_MODEL")
            or os.getenv("OPENAI_TEXT_MODEL")
            or "gpt-4.1-mini"
        ).strip()

        default_headers: Dict[str, str] = {}
        if base_url and "openrouter.ai" in base_url:
            site_url = (os.getenv("OPENROUTER_SITE_URL") or "").strip()
            app_name = (os.getenv("OPENROUTER_APP_NAME") or "Nano IA").strip()
            if site_url:
                default_headers["HTTP-Referer"] = site_url
            if app_name:
                default_headers["X-Title"] = app_name

        self.client = AsyncOpenAI(
            api_key=api_key or "ollama",
            base_url=base_url,
            default_headers=default_headers or None,
        )

    async def extract_payroll_sheet(
        self,
        *,
        file_bytes: bytes,
        mime_type: str,
        filename: str = "",
    ) -> Dict[str, Any]:
        text = self._extract_text(file_bytes=file_bytes, mime_type=mime_type, filename=filename)
        parsed = self._parse_payroll_text(text)
        if parsed.get("employees"):
            return parsed
        return await self._extract_with_llm(text)

    def _extract_text(self, *, file_bytes: bytes, mime_type: str, filename: str) -> str:
        lower_name = (filename or "").lower()
        if "pdf" in mime_type or lower_name.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages = [(page.extract_text() or "").strip() for page in pdf.pages]
            text = "\n".join(page for page in pages if page)
            if not text.strip():
                raise ValueError("Nao consegui ler o texto do PDF da folha.")
            return text
        raise ValueError("Envie a folha em PDF para importar os funcionarios automaticamente.")

    def _parse_payroll_text(self, text: str) -> Dict[str, Any]:
        company_name = self._extract_match(
            text,
            r"Empresa:\s*\d+\s*-\s*(.*?)\s+P[aá]gina:",
        )
        cnpj = self._extract_match(text, r"CNPJ:\s*([\d./-]+)")
        competence = self._extract_match(text, r"Compet[êe]ncia:\s*([0-9]{2}/[0-9]{4})")
        calculation_type = self._extract_match(text, r"C[aá]lculo:\s*([^\n]+)")

        employees: List[Dict[str, Any]] = []
        blocks = re.split(r"(?=Empr\.:)", text)
        for raw_block in blocks:
            block = " ".join(raw_block.split())
            if not block.startswith("Empr.:"):
                continue

            name = self._extract_match(block, r"Empr\.:\s*\d+\s*([A-ZÀ-Ý][A-ZÀ-Ý\s]+?)\s+Situa")
            cpf = self._extract_match(block, r"CPF:\s*([\d.\-]+)")
            role = self._extract_match(block, r"Cargo:\s*\d+\s*([A-ZÀ-Ý0-9.\-/\s]+?)\s+C\.B\.O")
            salary = self._parse_brl(self._extract_match(block, r"Sal[áa]rio:\s*([\d.,]+)"))
            admission_date = self._extract_match(block, r"Adm:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})")
            vinculo = self._extract_match(block, r"V[ií]nculo:\s*([A-Za-zÀ-Ý\s]+?)\s+CC:")
            dependents_count = self._parse_int(self._extract_match(block, r"NF:\s*(\d+)"))
            salary_family_amount = self._parse_brl(
                self._extract_match(
                    block,
                    r"SAL[ÁA]RIO\s+FAM[ÍI]LIA(?:\s+\d+(?:[.,]\d+)?)?\s+([\d.,]+)",
                )
            )
            inss_percent = self._parse_inss_percent(block)
            status = self._extract_match(block, r"Situa[çc][ãa]o:\s*([A-Za-zÀ-Ý\s]+?)\s+CPF:")

            if not name or not cpf or not role or salary <= 0:
                continue

            employee_type = "clt" if "celet" in (vinculo or "").lower() else "contract"
            notes_parts = []
            if status:
                notes_parts.append(f"Situacao na folha: {status.strip()}")
            if calculation_type:
                notes_parts.append(f"Calculo origem: {calculation_type.strip()}")

            employees.append(
                {
                    "name": name.strip(),
                    "cpf": cpf.strip(),
                    "role": role.strip(),
                    "salary": salary,
                    "employee_type": employee_type,
                    "payment_cycle": "monthly",
                    "inss_percent": inss_percent if employee_type == "clt" else 0.0,
                    "admission_date": admission_date.strip() if admission_date else "",
                    "dependents_count": dependents_count,
                    "salary_family_amount": salary_family_amount,
                    "notes": " | ".join(notes_parts).strip() or None,
                }
            )

        return {
            "company_name": (company_name or "").strip(),
            "cnpj": (cnpj or "").strip(),
            "competence": (competence or "").strip(),
            "calculation_type": (calculation_type or "").strip(),
            "employees": employees,
            "source_text_length": len(text or ""),
        }

    async def _extract_with_llm(self, text: str) -> Dict[str, Any]:
        prompt = (
            "Leia o texto bruto de uma folha de pagamento brasileira. "
            "Responda apenas JSON valido, sem markdown. "
            "Formato esperado: "
            "{\"company_name\":\"\",\"cnpj\":\"\",\"competence\":\"\",\"calculation_type\":\"\","
            "\"employees\":[{\"name\":\"\",\"cpf\":\"\",\"role\":\"\",\"salary\":0,"
            "\"employee_type\":\"clt\",\"payment_cycle\":\"monthly\",\"inss_percent\":0,"
            "\"admission_date\":\"\",\"dependents_count\":0,\"salary_family_amount\":0,\"notes\":\"\"}]}. "
            "Nao invente funcionario. Se um campo nao estiver presente, use valor vazio ou zero."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Voce extrai dados de folha de pagamento brasileira. "
                        "Responda somente JSON valido e nao invente campos."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{prompt}\n\nTEXTO DA FOLHA:\n{text[:120000]}",
                },
            ],
            temperature=0,
            max_tokens=3000,
        )
        content = response.choices[0].message.content
        text_content = str(content or "")
        payload = self._extract_json_object(text_content)
        employees = payload.get("employees") if isinstance(payload, dict) else None
        if not isinstance(employees, list) or not employees:
            raise ValueError("Nao consegui extrair funcionarios da folha enviada.")

        normalized = {
            "company_name": str(payload.get("company_name") or "").strip(),
            "cnpj": str(payload.get("cnpj") or "").strip(),
            "competence": str(payload.get("competence") or "").strip(),
            "calculation_type": str(payload.get("calculation_type") or "").strip(),
            "employees": [],
            "source_text_length": len(text or ""),
        }
        for employee in employees:
            if not isinstance(employee, dict):
                continue
            salary = self._parse_float(employee.get("salary"))
            if salary <= 0:
                continue
            normalized["employees"].append(
                {
                    "name": str(employee.get("name") or "").strip(),
                    "cpf": str(employee.get("cpf") or "").strip(),
                    "role": str(employee.get("role") or "").strip(),
                    "salary": salary,
                    "employee_type": "contract"
                    if str(employee.get("employee_type") or "").strip().lower() == "contract"
                    else "clt",
                    "payment_cycle": "biweekly"
                    if str(employee.get("payment_cycle") or "").strip().lower() == "biweekly"
                    else "monthly",
                    "inss_percent": self._parse_float(employee.get("inss_percent")),
                    "admission_date": str(employee.get("admission_date") or "").strip(),
                    "dependents_count": self._parse_int(employee.get("dependents_count")),
                    "salary_family_amount": self._parse_float(employee.get("salary_family_amount")),
                    "notes": str(employee.get("notes") or "").strip() or None,
                }
            )
        if not normalized["employees"]:
            raise ValueError("Nao consegui extrair funcionarios validos da folha enviada.")
        return normalized

    @staticmethod
    def _extract_json_object(text: str) -> Dict[str, Any]:
        raw = (text or "").strip()
        if not raw:
            return {}
        candidates = [raw]
        fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.DOTALL)
        candidates.extend(fenced)
        brace_match = re.search(r"(\{.*\})", raw, flags=re.DOTALL)
        if brace_match:
            candidates.append(brace_match.group(1))
        for candidate in candidates:
            try:
                payload = json.loads(candidate)
                if isinstance(payload, dict):
                    return payload
            except Exception:
                continue
        return {}

    @staticmethod
    def _extract_match(text: str, pattern: str) -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _parse_brl(value: Any) -> float:
        text = str(value or "").strip()
        if not text:
            return 0.0
        text = text.replace(".", "").replace(",", ".")
        try:
            return float(text)
        except ValueError:
            return 0.0

    @staticmethod
    def _parse_float(value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _parse_int(value: Any) -> int:
        try:
            return int(float(value or 0))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _parse_inss_percent(text: str) -> float:
        direct = re.search(r"INSS(?:\s+de)?\s*(\d+(?:[.,]\d+)?)\s*%", text, flags=re.IGNORECASE)
        if direct:
            return PayrollDocumentService._parse_brl(direct.group(1))
        return 0.0
