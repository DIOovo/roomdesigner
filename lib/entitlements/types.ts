export type RoomorphicPlan = "free" | "starter" | "pro";
export type CreditSource = "free" | "subscription" | "credit_pack" | "manual";

export type UserEntitlements = {
  authenticated: boolean;
  freeCreditsRemaining: number;
  subscriptionCreditsRemaining: number;
  creditPackCreditsRemaining: number;
  paidCreditsRemaining: number;
  totalCreditsRemaining: number;
  plan: RoomorphicPlan;
  subscriptionStatus: string | null;
  commercialLicense: boolean;
  priorityQueue: boolean;
  watermarkRequired: boolean;
  resolution: "480p" | "768p";
};

export type CreditReservation = {
  success: boolean;
  errorCode: "requires_auth" | "no_credits" | "invalid_owner" | "job_not_found" | null;
  usageId: string | null;
  creditSource: CreditSource | null;
  plan: RoomorphicPlan;
  resolution: "480p" | "768p";
  isWatermarked: boolean;
  commercialLicense: boolean;
  priorityQueue: boolean;
};
