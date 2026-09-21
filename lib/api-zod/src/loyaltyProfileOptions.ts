/**
 * Loyalty member profile options, shared by the loyalty app's
 * complete/edit-profile screens and the web deal composer's audience
 * targeting. Keep this as the single source of truth — do not duplicate
 * these lists elsewhere, or deal targeting silently stops matching members.
 */
export const LOYALTY_GENDERS = [
  "Female",
  "Male",
  "Non-binary",
  "Prefer not to say",
] as const;

export const LOYALTY_INTERESTS = [
  "Cafés & Restaurants",
  "Salons & Beauty",
  "Gyms & Fitness",
  "Academies & Studios",
  "Retail & Shops",
  "Insurance & Services",
] as const;
