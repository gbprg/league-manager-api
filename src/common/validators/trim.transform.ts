import { Transform } from 'class-transformer';

/** Remove espaços nas pontas de strings (use antes de @IsNotEmpty). */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
