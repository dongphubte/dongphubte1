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
