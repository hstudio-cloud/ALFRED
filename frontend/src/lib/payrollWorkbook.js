import ExcelJS from "exceljs";

const BRL_FORMAT = '"R$"#,##0.00;[Red]-"R$"#,##0.00';
const HEADER_FILL = "A61B1B";
const SUBHEADER_FILL = "E9D5D5";
const BORDER_COLOR = "D1D5DB";

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const periodLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const weekdayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

const toNumber = (value) => Number(value || 0);

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthRange = (month) => {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  const start = new Date(year, (monthNumber || 1) - 1, 1);
  const end = new Date(year, monthNumber || 1, 0);
  return { start, end };
};

const getBusinessDays = (month) => {
  const { start, end } = getMonthRange(month);
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const getMonthLabel = (month) => {
  const { start } = getMonthRange(month);
  return titleCase(monthLabelFormatter.format(start));
};

const getPeriodLabel = (month) => {
  const { start, end } = getMonthRange(month);
  return `${periodLabelFormatter.format(start)} a ${periodLabelFormatter.format(end)}`;
};

const getWeekdayLabel = (date) =>
  weekdayLabelFormatter
    .format(date)
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();

const setAllBorders = (row, from = 1, to = row.cellCount) => {
  for (let index = from; index <= to; index += 1) {
    row.getCell(index).border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
    };
  }
};

const styleTitleRow = (sheet, rowNumber, fromCol, toCol) => {
  sheet.mergeCells(rowNumber, fromCol, rowNumber, toCol);
  const cell = sheet.getRow(rowNumber).getCell(fromCol);
  cell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(rowNumber).height = 24;
};

const styleMetaRow = (row, from = 1, to = row.cellCount) => {
  for (let index = from; index <= to; index += 1) {
    const cell = row.getCell(index);
    cell.font = { bold: index % 2 === 1, size: 11, color: { argb: "1F2937" } };
    if (index % 2 === 1) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F3F4F6" },
      };
    }
    cell.alignment = { vertical: "middle" };
  }
};

const styleHeaderRow = (row) => {
  row.font = { bold: true, size: 11, color: { argb: "1F2937" } };
  row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  row.height = 20;
  for (let index = 1; index <= row.cellCount; index += 1) {
    row.getCell(index).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SUBHEADER_FILL },
    };
  }
  setAllBorders(row);
};

const styleCurrencyColumns = (sheet, columnKeys = []) => {
  columnKeys.forEach((key) => {
    sheet.getColumn(key).numFmt = BRL_FORMAT;
  });
};

const styleNumberCell = (cell, format = BRL_FORMAT) => {
  cell.numFmt = format;
  cell.alignment = { horizontal: "right", vertical: "middle" };
};

const buildAttendanceLookup = (attendanceRecords = []) => {
  const byEmployee = new Map();
  attendanceRecords.forEach((record) => {
    const employeeId = record?.employee_id;
    const dateKey = normalizeDateKey(record?.date);
    if (!employeeId || !dateKey) return;
    if (!byEmployee.has(employeeId)) {
      byEmployee.set(employeeId, new Map());
    }
    const code =
      record?.status === "absent"
        ? "F"
        : record?.status === "medical_leave"
          ? "A"
          : "P";
    byEmployee.get(employeeId).set(dateKey, code);
  });
  return byEmployee;
};

const addSummarySheet = (workbook, context) => {
  const sheet = workbook.addWorksheet("Resumo");
  sheet.columns = [
    { width: 24 },
    { width: 22 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  styleTitleRow(sheet, 1, 1, 6);
  sheet.getCell("A1").value = "RELATORIO DE PRESENCA E PAGAMENTO";

  sheet.addRow([]);
  const monthLabel = getMonthLabel(context.month);
  const metaRow1 = sheet.addRow([
    "Empresa",
    context.workspaceName || "Workspace",
    "Competencia",
    monthLabel,
    "Periodo",
    getPeriodLabel(context.month),
  ]);
  styleMetaRow(metaRow1);

  const metaRow2 = sheet.addRow([
    "Filtro tipo",
    context.employeeTypeLabel,
    "Filtro ciclo",
    context.paymentCycleLabel,
    "Gerado em",
    periodLabelFormatter.format(new Date()),
  ]);
  styleMetaRow(metaRow2);

  sheet.addRow([]);
  const header = sheet.addRow(["Indicador", "Valor"]);
  styleHeaderRow(header);

  const summaryRows = [
    ["Funcionarios", toNumber(context.summary.employees)],
    ["Funcionarios CLT", toNumber(context.summary.clt_employees)],
    ["Funcionarios Contrato", toNumber(context.summary.contract_employees)],
    ["Faltas", toNumber(context.summary.absent_days)],
    ["Atestados", toNumber(context.summary.medical_leave_days)],
    ["Dias normais", toNumber(context.summary.present_days)],
    ["Bruto", toNumber(context.summary.gross_salary)],
    ["Salario familia", toNumber(context.summary.salary_family_amount)],
    ["Desconto faltas", toNumber(context.summary.absence_discount)],
    ["Desconto INSS", toNumber(context.summary.inss_discount)],
    ["Liquido estimado", toNumber(context.summary.net_payable)],
  ];

  summaryRows.forEach(([label, value], index) => {
    const row = sheet.addRow([label, value]);
    setAllBorders(row, 1, 2);
    if (index >= 5) {
      styleNumberCell(row.getCell(2));
    }
  });
};

const addPayrollSheet = (workbook, title, items, employeeTypeLabel, context) => {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { key: "item", width: 8 },
    { key: "name", width: 34 },
    { key: "role", width: 20 },
    { key: "type", width: 12 },
    { key: "fouls", width: 10 },
    { key: "medicalLeave", width: 12 },
    { key: "worked", width: 12 },
    { key: "daily", width: 14 },
    { key: "salary", width: 15 },
    { key: "family", width: 15 },
    { key: "inss", width: 15 },
    { key: "absence", width: 17 },
    { key: "net", width: 15 },
    { key: "half1", width: 15 },
    { key: "half2", width: 15 },
    { key: "absenceDates", width: 26 },
    { key: "medicalDates", width: 26 },
  ];

  styleTitleRow(sheet, 1, 1, 16);
  sheet.getCell("A1").value = `${(context.workspaceName || "Workspace").toUpperCase()} - ${title.toUpperCase()}`;

  const metaRow1 = sheet.addRow([
    "Competencia",
    getMonthLabel(context.month),
    "Periodo",
    getPeriodLabel(context.month),
    "Tipo",
    employeeTypeLabel,
  ]);
  styleMetaRow(metaRow1, 1, 6);

  const metaRow2 = sheet.addRow([
    "Dias uteis do mes",
    context.businessDays.length,
    "Ciclo aplicado",
    context.paymentCycleLabel,
    "Exportado em",
    periodLabelFormatter.format(new Date()),
  ]);
  styleMetaRow(metaRow2, 1, 6);

  sheet.addRow([]);
  const header = sheet.addRow([
    "ITEM",
    "NOME",
    "FUNCAO",
    "CART/CONT",
    "FALTAS",
    "ATESTADOS",
    "DIAS NORMAIS",
    "DIARIA",
    "SALARIO BASE",
    "SAL. FAMILIA",
    "DESC. INSS",
    "DESC. P/FALTA",
    "TOTAL",
    "1a QUINZENA",
    "2a QUINZENA",
    "DATAS DE FALTA",
    "DATAS DE ATESTADO",
  ]);
  styleHeaderRow(header);

  items.forEach((item, index) => {
    const row = sheet.addRow([
      index + 1,
      item.name || "",
      item.role || "",
      item.employee_type === "clt" ? "CART" : "CONT",
      toNumber(item.absent_days),
      toNumber(item.medical_leave_days),
      toNumber(item.present_days),
      toNumber(item.daily_rate),
      toNumber(item.base_salary),
      toNumber(item.salary_family_amount),
      toNumber(item.inss_discount),
      toNumber(item.absence_discount),
      toNumber(item.net_month_estimated),
      toNumber(item.biweekly?.first_half_payment),
      toNumber(item.biweekly?.second_half_payment),
      (item.absent_dates || []).join(", "),
      (item.medical_leave_dates || []).join(", "),
    ]);
    setAllBorders(row);
    [8, 9, 10, 11, 12, 13, 14, 15].forEach((cellIndex) => {
      styleNumberCell(row.getCell(cellIndex));
    });
  });

  if (items.length) {
    const totalRow = sheet.addRow([
      "",
      "",
      "",
      "TOTAL",
      items.reduce((sum, item) => sum + toNumber(item.absent_days), 0),
      items.reduce((sum, item) => sum + toNumber(item.medical_leave_days), 0),
      items.reduce((sum, item) => sum + toNumber(item.present_days), 0),
      "",
      items.reduce((sum, item) => sum + toNumber(item.base_salary), 0),
      items.reduce((sum, item) => sum + toNumber(item.salary_family_amount), 0),
      items.reduce((sum, item) => sum + toNumber(item.inss_discount), 0),
      items.reduce((sum, item) => sum + toNumber(item.absence_discount), 0),
      items.reduce((sum, item) => sum + toNumber(item.net_month_estimated), 0),
      items.reduce((sum, item) => sum + toNumber(item.biweekly?.first_half_payment), 0),
      items.reduce((sum, item) => sum + toNumber(item.biweekly?.second_half_payment), 0),
      "",
      "",
    ]);
    totalRow.font = { bold: true };
    setAllBorders(totalRow);
    [9, 10, 11, 12, 13, 14, 15].forEach((cellIndex) => {
      styleNumberCell(totalRow.getCell(cellIndex));
    });
  }
};

const addAttendanceSheet = (workbook, context, reportRows, attendanceRecords) => {
  const sheet = workbook.addWorksheet("Folha de Ponto");
  const businessDays = context.businessDays;
  const columns = [
    { key: "item", width: 8 },
    { key: "name", width: 32 },
    { key: "role", width: 20 },
    { key: "type", width: 12 },
  ];

  businessDays.forEach(() => {
    columns.push({ width: 6 });
  });
  columns.push({ key: "medicalLeave", width: 10 });
  columns.push({ key: "absent", width: 10 });
  columns.push({ key: "normal", width: 10 });
  sheet.columns = columns;

  const lastCol = 4 + businessDays.length + 3;
  styleTitleRow(sheet, 1, 1, lastCol);
  sheet.getCell("A1").value = "FOLHA DE PONTO";

  sheet.mergeCells(2, 1, 2, lastCol);
  sheet.getCell("A2").value = `EMPRESA: ${context.workspaceName || "Workspace"}`;
  sheet.getCell("A2").font = { bold: true, size: 11 };

  sheet.mergeCells(3, 1, 3, lastCol);
  sheet.getCell("A3").value = `PERIODO: ${getPeriodLabel(context.month)}`;
  sheet.getCell("A3").font = { bold: true, size: 11 };

  const weekdaysRow = sheet.addRow([
    "ITEM",
    "NOME",
    "FUNCAO",
    "TIPO",
    ...businessDays.map(getWeekdayLabel),
    "ATEST.",
    "FALT.",
    "NORMAIS",
  ]);
  styleHeaderRow(weekdaysRow);

  const daysRow = sheet.addRow([
    "",
    "",
    "",
    "",
    ...businessDays.map((date) => date.getDate()),
    "",
    "",
  ]);
  styleHeaderRow(daysRow);

  const attendanceLookup = buildAttendanceLookup(attendanceRecords);
  reportRows.forEach((item, index) => {
    const employeeAttendance = attendanceLookup.get(item.employee_id) || new Map();
    const row = sheet.addRow([
      index + 1,
      item.name || "",
      item.role || "",
      item.employee_type === "clt" ? "CLT" : "CONT",
      ...businessDays.map(
        (date) => employeeAttendance.get(normalizeDateKey(date)) || "",
      ),
      toNumber(item.medical_leave_days),
      toNumber(item.absent_days),
      toNumber(item.present_days),
    ]);
    setAllBorders(row);
    businessDays.forEach((_, businessIndex) => {
      const cell = row.getCell(5 + businessIndex);
      const value = cell.value;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (value === "P") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "DCFCE7" },
        };
        cell.font = { bold: true, color: { argb: "166534" } };
      }
      if (value === "F") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FEE2E2" },
        };
        cell.font = { bold: true, color: { argb: "991B1B" } };
      }
      if (value === "A") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FEF3C7" },
        };
        cell.font = { bold: true, color: { argb: "92400E" } };
      }
    });
  });

  const legendRow = sheet.addRow([]);
  legendRow.commit();
  const noteRow = sheet.addRow([
    "Legenda:",
    "Em branco = Presenca implicita",
    "F = Falta",
    "A = Atestado",
  ]);
  noteRow.font = { italic: true, size: 10 };
};

export const buildPayrollWorkbook = async ({
  workspaceName,
  month,
  payrollReport,
  attendanceRecords,
  employeeTypeFilter,
  paymentCycleFilter,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALFRED";
  workbook.created = new Date();
  workbook.modified = new Date();

  const cltRows = payrollReport?.groups?.clt || [];
  const contractRows = payrollReport?.groups?.contract || [];
  const reportRows = [...cltRows, ...contractRows].sort((left, right) =>
    (left?.name || "").localeCompare(right?.name || ""),
  );

  const employeeIds = new Set(reportRows.map((item) => item.employee_id));
  const filteredAttendance = (attendanceRecords || []).filter((record) =>
    employeeIds.has(record.employee_id),
  );

  const context = {
    workspaceName,
    month: payrollReport?.month || month,
    summary: payrollReport?.summary || {},
    businessDays: getBusinessDays(payrollReport?.month || month),
    employeeTypeLabel:
      employeeTypeFilter === "clt"
        ? "CLT"
        : employeeTypeFilter === "contract"
          ? "Contrato"
          : "Todos",
    paymentCycleLabel:
      paymentCycleFilter === "monthly"
        ? "Mensal"
        : paymentCycleFilter === "biweekly"
          ? "Quinzenal"
          : "Padrao",
  };

  addSummarySheet(workbook, context);
  addPayrollSheet(workbook, "Pagamento CLT", cltRows, "CLT", context);
  addPayrollSheet(workbook, "Pagamento Contrato", contractRows, "Contrato", context);
  addAttendanceSheet(workbook, context, reportRows, filteredAttendance);

  workbook.eachSheet((sheet) => {
    sheet.views = [{ state: "frozen", ySplit: 4 }];
  });

  return workbook.xlsx.writeBuffer();
};
