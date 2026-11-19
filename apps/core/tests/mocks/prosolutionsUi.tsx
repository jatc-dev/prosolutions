import React from "react";

// Real shared UI (ads policy, consent, links, primitives) for page tests;
// only the heavy chrome below is replaced. Local exports take precedence
// over the star re-export.
export * from "../../../../packages/ui/src/index";

export function ProHeader() {
  return <header data-testid="core-admin-header">Core header</header>;
}

export function ProFooter() {
  return <footer data-testid="core-admin-footer">Core footer</footer>;
}
