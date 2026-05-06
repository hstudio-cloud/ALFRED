import { useCallback, useState } from "react";

import payrollService from "../../services/payrollService";

export default function usePayrollData({
  payrollEmployeeTypeFilter,
  payrollMonth,
  payrollPaymentCycleFilter,
  toast,
}) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollReport, setPayrollReport] = useState(null);

  const loadPayrollData = useCallback(async (workspaceId) => {
    if (!workspaceId) return;
    setPayrollLoading(true);
    try {
      const employeeParams = {};
      if (payrollEmployeeTypeFilter !== "all") {
        employeeParams.employee_type = payrollEmployeeTypeFilter;
      }
      const attendanceParams = { month: payrollMonth };
      if (payrollEmployeeTypeFilter !== "all") {
        attendanceParams.employee_type = payrollEmployeeTypeFilter;
      }
      const reportParams = { month: payrollMonth };
      if (payrollEmployeeTypeFilter !== "all") {
        reportParams.employee_type = payrollEmployeeTypeFilter;
      }
      if (payrollPaymentCycleFilter !== "all") {
        reportParams.payment_cycle = payrollPaymentCycleFilter;
      }

      const [employeesResponse, attendanceResponse, reportResponse] =
        await Promise.all([
          payrollService.getEmployees(workspaceId, employeeParams),
          payrollService.getAttendance(workspaceId, attendanceParams),
          payrollService.getPayrollReport(workspaceId, reportParams),
        ]);

      setEmployees(employeesResponse || []);
      setAttendanceRecords(attendanceResponse?.items || []);
      setPayrollReport(reportResponse || null);
    } catch (error) {
      toast({
        title: "Erro ao carregar funcionários",
        description: "Não consegui carregar os dados de ponto e folha agora.",
        variant: "destructive",
      });
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollEmployeeTypeFilter, payrollMonth, payrollPaymentCycleFilter, toast]);

  return {
    attendanceRecords,
    employees,
    loadPayrollData,
    payrollLoading,
    payrollReport,
    setAttendanceRecords,
    setEmployees,
    setPayrollReport,
  };
}
