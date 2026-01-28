import { mutation } from "../_generated/server"
import { v } from "convex/values"

// Appeal letter templates by denial category
const APPEAL_TEMPLATES: Record<string, string> = {
  coding: `Dear Claims Review Department,

We are writing to formally appeal the denial of Claim {{claimNumber}} for patient {{patientName}} with denial code {{denialCode}}.

DENIAL REASON: {{denialReason}}

Upon thorough review of our medical records and coding documentation, we respectfully disagree with this denial. The procedure codes and modifiers assigned accurately reflect the services rendered.

SUPPORTING DOCUMENTATION ENCLOSED:
1. Operative report/procedure notes
2. Medical records supporting the coded services
3. Published coding guidelines supporting our position

We request a full reconsideration of this claim based on the attached documentation. The total amount in question is {{totalCharges}}.

Sincerely,
{{organizationName}}
Billing Department`,

  medical_necessity: `Dear Medical Review Committee,

We are submitting this appeal for the denial of Claim {{claimNumber}} for patient {{patientName}}, denied under code {{denialCode}} for medical necessity.

DENIAL REASON: {{denialReason}}

The services rendered were medically necessary based on the patient's presenting condition and established treatment protocols.

DOCUMENTATION ENCLOSED:
1. Complete medical records for dates of service
2. Physician's letter of medical necessity
3. Relevant clinical guidelines/studies

We respectfully request approval of this claim totaling {{totalCharges}}.

Sincerely,
{{organizationName}}`,

  eligibility: `Dear Claims Department,

We are appealing the denial of Claim {{claimNumber}} for patient {{patientName}} denied under {{denialCode}}.

DENIAL REASON: {{denialReason}}

We have verified that the patient had active coverage on the date of service.

DOCUMENTATION ENCLOSED:
1. Copy of insurance card effective on DOS
2. Eligibility verification documentation

We request this claim be reprocessed with the correct eligibility information. Amount: {{totalCharges}}.

Sincerely,
{{organizationName}}`,

  default: `Dear Claims Review Department,

We are formally appealing the denial of Claim {{claimNumber}} for patient {{patientName}}.

DENIAL CODE: {{denialCode}}
DENIAL REASON: {{denialReason}}

After reviewing our documentation, we believe this claim was denied in error.

SUPPORTING DOCUMENTATION ENCLOSED:
1. Complete medical records for dates of service
2. Relevant supporting documentation

We respectfully request this claim be reviewed and reconsidered. Total amount: {{totalCharges}}.

Sincerely,
{{organizationName}}`,
}

// Generate an appeal letter
export const generateAppealLetter = mutation({
  args: {
    denialId: v.id("denials"),
  },
  handler: async (ctx, args): Promise<{ denialId: string; appealLetter: string; generatedAt: number }> => {
    const denial = await ctx.db.get(args.denialId)
    if (!denial) throw new Error("Denial not found")

    const claim = await ctx.db.get(denial.claimId)
    if (!claim) throw new Error("Claim not found")

    const patient = await ctx.db.get(claim.patientId)
    const organization = await ctx.db.get(claim.organizationId)

    // Select template based on denial category
    const templateKey = denial.denialCategory in APPEAL_TEMPLATES 
      ? denial.denialCategory 
      : "default"
    const template = APPEAL_TEMPLATES[templateKey]

    // Generate letter using template
    const appealLetter = template
      .replace(/{{claimNumber}}/g, claim.claimNumber)
      .replace(/{{patientName}}/g, patient ? `${patient.firstName} ${patient.lastName}` : "Patient")
      .replace(/{{denialCode}}/g, denial.denialCode)
      .replace(/{{denialReason}}/g, denial.denialReason)
      .replace(/{{totalCharges}}/g, `$${claim.totalCharges.toFixed(2)}`)
      .replace(/{{organizationName}}/g, organization?.name || "Medical Practice")

    return {
      denialId: args.denialId,
      appealLetter,
      generatedAt: Date.now(),
    }
  },
})

// Save generated appeal letter to an appeal record
export const saveAppealLetter = mutation({
  args: {
    appealId: v.id("appeals"),
    appealLetter: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appealId, {
      generatedAppealLetter: args.appealLetter,
    })
    return { success: true }
  },
})
