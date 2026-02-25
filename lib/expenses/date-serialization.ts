import { format } from "date-fns";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatBusinessDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseExpenseDateInput(value: string): Date {
  if (BUSINESS_DATE_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}
