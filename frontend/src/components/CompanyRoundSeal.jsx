import React from "react";
import { COMPANY_ROUND_SEAL_SRC } from "../utils/pdfCompanyRoundSeal";

export { COMPANY_ROUND_SEAL_SRC };
export const COMPANY_ROUND_SEAL_ALT = "Sivendhi Industries Chennai round seal";

/**
 * Reusable company round seal (Sivendhi Industries / Chennai).
 * Asset: frontend/public/seals/company-round-seal.png
 */
const CompanyRoundSeal = ({
  size = 120,
  className = "",
  alt = COMPANY_ROUND_SEAL_ALT,
  ...imgProps
}) => (
  <img
    src={COMPANY_ROUND_SEAL_SRC}
    alt={alt}
    width={size}
    height={size}
    className={className}
    draggable={false}
    {...imgProps}
  />
);

export default CompanyRoundSeal;
