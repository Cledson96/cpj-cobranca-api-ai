import { z } from "zod";

const nonEmptyString = () => z.string().trim().min(1);

export const modelIdParamsSchema = z.object({
  id: nonEmptyString(),
});
export type ModelIdParams = z.infer<typeof modelIdParamsSchema>;

export const modelDetailSchema = z.object({
  id: nonEmptyString(),
  name: nonEmptyString(),
  is_active: z.boolean(),
  is_default: z.boolean(),
});
export type ModelDetail = z.infer<typeof modelDetailSchema>;

export const modelListResponseSchema = z.object({
  items: z.array(modelDetailSchema),
});
export type ModelListResponse = z.infer<typeof modelListResponseSchema>;

export const modelCreateRequestSchema = z.object({
  name: nonEmptyString(),
});
export type ModelCreateRequest = z.infer<typeof modelCreateRequestSchema>;

export const modelUpdateRequestSchema = z.object({
  name: nonEmptyString().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Pelo menos um campo deve ser informado.",
});
export type ModelUpdateRequest = z.infer<typeof modelUpdateRequestSchema>;
