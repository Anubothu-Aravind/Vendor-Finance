/**
 * Profile Completion Rules
 *
 * Defines which fields contribute to the completion score and how much
 * each category is worth. Centralise this here so the scoring logic
 * never needs to change when field lists or weights evolve.
 *
 * Required fields contribute `requiredWeight`% of the total score.
 * Optional fields contribute `optionalWeight`% of the total score.
 * requiredWeight + optionalWeight must equal 100.
 */

const PROFILE_COMPLETION_RULES = {
  /** Percentage weight given to required fields (0–100). */
  requiredWeight: 70,

  /** Percentage weight given to optional fields (0–100). */
  optionalWeight: 30,

  /**
   * Fields that must be present for the profile to be considered usable.
   * A missing required field is listed in `completion.missing`.
   */
  requiredFields: [
    'businessName',
    'ownerName',
    'email',
    'phone',
    'address',
    'gstin',
  ],

  /**
   * Fields that improve completeness but are not strictly required.
   * Missing optional fields are NOT listed in `completion.missing`.
   */
  optionalFields: [
    'logo',
    'website',
  ],
}

if (PROFILE_COMPLETION_RULES.requiredWeight + PROFILE_COMPLETION_RULES.optionalWeight !== 100) {
  throw new Error('[profileCompletionRules] requiredWeight + optionalWeight must equal 100')
}

module.exports = PROFILE_COMPLETION_RULES
