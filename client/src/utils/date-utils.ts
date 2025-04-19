import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Format a date string or Date object to a localized date string
 * @param date - Date to format (string, Date, or undefined)
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | undefined, includeTime = false): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (includeTime) {
      return format(dateObj, "dd/MM/yyyy HH:mm", { locale: vi });
    }
    
    return format(dateObj, "dd/MM/yyyy", { locale: vi });
  } catch (error) {
    console.error("Error formatting date:", error);
    return typeof date === "string" ? date : String(date);
  }
}

/**
 * Get a relative time string for a date (e.g., "3 days ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function getRelativeTime(date: string | Date): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return "Hôm nay";
    } else if (diffInDays === 1) {
      return "Hôm qua";
    } else if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} tuần trước`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} tháng trước`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} năm trước`;
    }
  } catch (error) {
    console.error("Error calculating relative time:", error);
    return "";
  }
}

/**
 * Calculate the end date based on a start date and payment cycle
 * @param startDate - Start date
 * @param paymentCycle - Payment cycle type
 * @param buoiCount - Number of sessions completed for session-based cycles
 * @returns End date
 */
export function calculateEndDate(
  startDate: Date | string,
  paymentCycle: string,
  buoiCount = 0
): Date {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = new Date(start);
  
  if (paymentCycle === "1-thang") {
    // Add 30 days for monthly payment
    end.setDate(end.getDate() + 30);
  } else if (paymentCycle === "8-buoi" || paymentCycle === "10-buoi") {
    // For session-based payments, this would typically be calculated
    // based on the class schedule and student attendance
    // For simplicity, we'll just add an estimated time
    const cycleDays = paymentCycle === "8-buoi" ? 8 * 7 / 3 : 10 * 7 / 3;
    end.setDate(end.getDate() + Math.ceil(cycleDays));
  }
  
  return end;
}

/**
 * Get the current day of week in Vietnamese
 * @returns Day of week in Vietnamese
 */
export function getCurrentDayOfWeek(): string {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7"
  ];
  
  const now = new Date();
  return days[now.getDay()];
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Kiểm tra xem một lớp học có lịch học vào ngày hôm nay không
 * @param schedule - Chuỗi lịch học (ví dụ: "2, 4, 6 (18:00 - 20:00)")
 * @returns True nếu lớp học có lịch học hôm nay
 */
export function isClassScheduledToday(schedule: string): boolean {
  try {
    if (!schedule) return false;
    
    // Lấy ngày hiện tại trong tuần (0 = Chủ nhật, 1 = Thứ 2, ...)
    const today = new Date().getDay();
    
    // Chuyển đổi ngày trong tuần sang định dạng tiếng Việt để tìm kiếm
    const vietnameseDays = [
      "chủ nhật", "thứ 2", "thứ 3", "thứ 4", "thứ 5", "thứ 6", "thứ 7"
    ];
    
    const currentDay = vietnameseDays[today];
    const scheduleLower = schedule.toLowerCase();
    
    // Tìm kiếm ngày hiện tại trong chuỗi lịch học
    return scheduleLower.includes(currentDay) ||
           // Kiểm tra theo số ngày trong tuần (2, 3, 4, 5, 6, 7, CN)
           (today === 0 && (scheduleLower.includes("cn") || scheduleLower.includes("chủ nhật"))) ||
           (today > 0 && (scheduleLower.includes(`${today + 1}`) || scheduleLower.includes(`${today + 1},`)));
  } catch (error) {
    console.error("Error checking class schedule:", error);
    return false;
  }
}
