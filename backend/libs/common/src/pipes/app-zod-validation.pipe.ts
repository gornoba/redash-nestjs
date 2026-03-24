import { createZodValidationPipe } from 'nestjs-zod';

export const AppZodValidationPipe = createZodValidationPipe({
  strictSchemaDeclaration: false,
});
