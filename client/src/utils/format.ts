/**
 * Format a number as currency in VND
 * @param amount - Number to format
 * @returns Formatted string with VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' VND';
}

/**
 * Format a phone number with spaces for better readability
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // Basic formatting for Vietnamese phone numbers
  if (!phone) return '';
  
  // Remove any non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    // Mobile numbers: 0xxx yyy zzz
    return digits.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  } else if (digits.length === 11) {
    // Mobile numbers starting with 84: 84 xxx yyy zzz
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }
  
  // Default: just return with spaces every 3 digits
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/**
 * Convert a payment cycle code to a human-readable string
 * @param cycle - Payment cycle code
 * @returns Human-readable payment cycle
 */
export function formatPaymentCycle(cycle: string): string {
  switch (cycle) {
    case '1-thang':
      return '1 tháng';
    case '8-buoi':
      return '8 buổi';
    case '10-buoi':
      return '10 buổi';
    case 'theo-ngay':
      return 'Theo ngày';
    default:
      return cycle;
  }
}

/**
 * Format a student status
 * @param status - Student status code
 * @returns Human-readable status
 */
export function formatStudentStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Đang học';
    case 'inactive':
      return 'Nghỉ học';
    default:
      return status;
  }
}

/**
 * Format an attendance status
 * @param status - Attendance status code
 * @returns Human-readable attendance status
 */
export function formatAttendanceStatus(status: string): string {
  switch (status) {
    case 'present':
      return 'Có mặt';
    case 'absent':
      return 'Vắng mặt';
    case 'teacher_absent':
      return 'GV nghỉ';
    case 'makeup':
      return 'Học bù';
    default:
      return status;
  }
}

/**
 * Format a payment status
 * @param status - Payment status code
 * @returns Human-readable payment status
 */
export function formatPaymentStatus(status: string): string {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán';
    case 'pending':
      return 'Chờ thanh toán';
    case 'overdue':
      return 'Quá hạn';
    default:
      return status;
  }
}

import { FeeCalculationMethod } from "@/hooks/use-settings";

/**
 * Tính toán học phí dựa trên chu kỳ thanh toán và phương pháp tính học phí 
 * @param baseFee - Học phí cơ bản từ cơ sở dữ liệu
 * @param paymentCycle - Chu kỳ thanh toán (1-thang, 8-buoi, 10-buoi, theo-ngay)
 * @param feeMethod - Phương pháp tính học phí (PER_SESSION hoặc PER_CYCLE)
 * @returns Học phí đã tính dựa trên chu kỳ và phương pháp
 */
export function calculateFeeByPaymentCycle(
  baseFee: number, 
  paymentCycle: string, 
  feeMethod: FeeCalculationMethod = FeeCalculationMethod.PER_SESSION
): number {
  // Đảm bảo baseFee là số
  let fee = typeof baseFee === 'number' ? baseFee : parseInt(String(baseFee), 10) || 0;
  
  // Nếu phương pháp là tính theo buổi học (PER_SESSION)
  if (feeMethod === FeeCalculationMethod.PER_SESSION) {
    // Giá trong cơ sở dữ liệu là giá mỗi buổi, tính toán theo chu kỳ
    switch (paymentCycle) {
      case '8-buoi':
        return fee * 8;
      case '10-buoi':
        return fee * 10;
      case 'theo-ngay':
        return fee;
      default: // 1-thang
        return fee * 4; // Giả sử 1 tháng có 4 buổi học
    }
  } 
  // Nếu phương pháp là tính theo chu kỳ (PER_CYCLE)
  else {
    // Giá trong cơ sở dữ liệu là tổng chi phí cho chu kỳ, không cần tính toán thêm
    return fee;
  }
}

/**
 * Format hiển thị học phí dựa trên phương pháp tính
 * @param fee - Học phí cơ bản 
 * @param paymentCycle - Chu kỳ thanh toán
 * @param feeMethod - Phương pháp tính học phí
 * @returns Chuỗi hiển thị học phí với định dạng phù hợp
 */
export function formatFeeDisplay(
  fee: number, 
  paymentCycle: string, 
  feeMethod: FeeCalculationMethod = FeeCalculationMethod.PER_SESSION
): string {
  // Đảm bảo fee là số
  const baseFee = typeof fee === 'number' ? fee : parseInt(String(fee), 10) || 0;
  
  // Tính toán học phí dựa trên phương pháp và chu kỳ
  if (feeMethod === FeeCalculationMethod.PER_SESSION) {
    // Hiển thị giá mỗi buổi và tổng chi phí
    const totalFee = calculateFeeByPaymentCycle(baseFee, paymentCycle, feeMethod);
    
    // Xác định số buổi dựa trên chu kỳ
    let sessions = 1;
    switch (paymentCycle) {
      case '8-buoi': sessions = 8; break;
      case '10-buoi': sessions = 10; break;
      case '1-thang': sessions = 4; break; // Giả sử 1 tháng có 4 buổi học
      default: sessions = 1;
    }
    
    // Trường hợp theo ngày, chỉ hiển thị giá mỗi ngày
    if (paymentCycle === 'theo-ngay') {
      return formatCurrency(baseFee) + ' / ngày';
    }
    
    // Các trường hợp khác, hiển thị cả giá mỗi buổi và tổng
    return formatCurrency(baseFee) + ' / buổi' + 
           (sessions > 1 ? ` (Tổng: ${formatCurrency(totalFee)})` : '');
  } 
  else {
    // Hiển thị tổng chi phí cho chu kỳ
    switch (paymentCycle) {
      case '8-buoi':
        return formatCurrency(baseFee) + ' / 8 buổi';
      case '10-buoi':
        return formatCurrency(baseFee) + ' / 10 buổi';
      case '1-thang':
        return formatCurrency(baseFee) + ' / tháng';
      case 'theo-ngay':
        return formatCurrency(baseFee) + ' / ngày';
      default:
        return formatCurrency(baseFee);
    }
  }
}

/**
 * Viết hoa chữ cái đầu tiên của chuỗi
 * @param text - Chuỗi cần viết hoa
 * @returns Chuỗi đã viết hoa chữ cái đầu
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Tính tổng số lượng mỗi loại trạng thái điểm danh
 * @param attendanceData - Dữ liệu điểm danh
 * @returns Object chứa số lượng mỗi loại trạng thái
 */
export function summarizeAttendance(attendanceData: any[]): { 
  present: number, 
  absent: number, 
  teacherAbsent: number, 
  makeup: number,
  total: number 
} {
  if (!attendanceData || !Array.isArray(attendanceData)) {
    return { present: 0, absent: 0, teacherAbsent: 0, makeup: 0, total: 0 };
  }
  
  const summary = {
    present: 0,
    absent: 0,
    teacherAbsent: 0,
    makeup: 0,
    get total() { return this.present + this.absent + this.teacherAbsent + this.makeup; }
  };
  
  // Đếm số lượng mỗi loại
  attendanceData.forEach(record => {
    if (record.status === 'present') summary.present++;
    else if (record.status === 'absent') summary.absent++;
    else if (record.status === 'teacher_absent') summary.teacherAbsent++;
    else if (record.status === 'makeup') summary.makeup++;
  });
  
  // Đảm bảo trả về đúng định dạng với tổng đã tính
  return {
    present: summary.present,
    absent: summary.absent,
    teacherAbsent: summary.teacherAbsent,
    makeup: summary.makeup,
    total: summary.total
  };
}
