import { registerDecorator, type ValidationOptions } from 'class-validator';

/** 'YYYY-MM-DD' que existe no calendário (rejeita 2026-02-31). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function IsCalendarDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName,
      options: { message: 'Data inválida. Use o formato AAAA-MM-DD com uma data existente.', ...options },
      validator: { validate: (v: unknown) => isCalendarDate(v) },
    });
}

/** Data de nascimento: existe no calendário, não está no futuro e é posterior a 1900. */
export function IsBirthDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isBirthDate',
      target: object.constructor,
      propertyName,
      options: { message: 'Data de nascimento inválida (não pode ser futura).', ...options },
      validator: {
        validate: (v: unknown) => {
          if (!isCalendarDate(v)) return false;
          const today = new Date().toISOString().slice(0, 10);
          return v <= today && v >= '1900-01-01';
        },
      },
    });
}
