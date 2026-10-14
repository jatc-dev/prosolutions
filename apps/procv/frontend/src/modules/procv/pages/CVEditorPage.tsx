import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteCVEditor } from "../components/editor/CompleteCVEditor";
import { PlatformLayout } from "../../../shared/components/PlatformLayout";
import { useSeo } from "../../../shared/seo";

/**
 * ProCV editor route (/procv/editor/:cvId?).
 *
 * Kept inside the shared platform shell so the module switcher, account area
 * and theme controls stay reachable from the editor.
 */
export function CVEditorPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const { t } = useTranslation();

  const seo = useMemo(
    () => ({
      title: t("procv.editorSeoTitle", "Editor de CV — ProCV"),
      description: t("procv.editorSeoDescription", "Edita tu currículum en tiempo real y expórtalo a PDF, JSON o XML."),
      path: cvId ? `/procv/editor/${cvId}` : "/procv/editor",
      // The editor is a private, per-user workspace: keep it out of the index.
      noindex: true,
    }),
    [cvId, t],
  );

  useSeo(seo);

  return (
    <PlatformLayout width="wide" hideFooter mainClassName="p-0">
      <CompleteCVEditor cvId={cvId} className="ui-page" />
    </PlatformLayout>
  );
}
