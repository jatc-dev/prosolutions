import {
  CURATED_CV_TEMPLATES as BASE_TEMPLATES,
  CV_TEMPLATE_GROUPS,
  type CVTemplateOption as BaseTemplateOption,
  type CVTemplateGroup,
} from "../../utils/templateCatalog";

export { CV_TEMPLATE_GROUPS };
export type { CVTemplateGroup };

/** Template option used by the modules layer. */
export type CVTemplateOption = BaseTemplateOption;

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = BASE_TEMPLATES;
