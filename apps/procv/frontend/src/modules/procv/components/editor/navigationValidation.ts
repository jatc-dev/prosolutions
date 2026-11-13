import type { SectionType } from "../../../../shared/types";

export function canLeaveEditorSection(section: SectionType, validateSection: (section: SectionType) => boolean): boolean {
  try {
    return validateSection(section);
  } catch {
    return true;
  }
}

export function changeEditorSection(
  current: SectionType,
  next: SectionType,
  validateSection: (section: SectionType) => boolean,
  setActiveSection: (section: SectionType) => void,
): boolean {
  if (!canLeaveEditorSection(current, validateSection)) return false;
  setActiveSection(next);
  return true;
}
