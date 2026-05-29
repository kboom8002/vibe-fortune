import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const RunReceiptSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastOutputId: IdSchema,
  whatIDid: z.string().min(1),
  whyIChoseIt: z.string().min(1),
  whatAIHelped: z.string().min(1),
  myJudgment: z.string().min(1),
  whatIDeferred: z.string().min(1),
  whatILearned: z.string().min(1),
  nextAction: z.string().min(1),
  createdAt: IsoDateTimeSchema,
});

export type RunReceipt = z.infer<typeof RunReceiptSchema>;
