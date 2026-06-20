import { z } from "zod";

export const PersonalContextSchema = z.object({
  occupation: z.string().optional(),
  industry: z.string().optional(),
  careerStage: z.enum(["student", "early", "mid", "senior", "founder", "freelance", "retired"]).optional(),
  financialGoal: z.string().optional(),
  financialConcern: z.string().optional(),
  relationshipStatus: z.enum(["single", "dating", "married", "divorced", "complicated"]).optional(),
  relationshipFocus: z.string().optional(),
  healthConcern: z.string().optional(),
  exerciseHabit: z.string().optional(),
  learningGoal: z.string().optional(),
  currentProject: z.string().optional(),
  brandingGoal: z.string().optional(),
  lifePhilosophy: z.string().optional(),
  biggestChallenge: z.string().optional(),
});

export type PersonalContext = z.infer<typeof PersonalContextSchema>;
