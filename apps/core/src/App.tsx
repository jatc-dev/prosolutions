import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { EmailVerificationPage } from "./pages/EmailVerificationPage";
import { PortalPage } from "./pages/PortalPage";
import { UsersAdminPage } from "./admin/UsersAdminPage";
import { AuditAdminPage } from "./admin/AuditAdminPage";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { ProAdminPage } from "./pages/ProAdminPage";
import { LandingPage } from "./pages/LandingPage";
import { SecuritySessionsPage } from "./pages/SecuritySessionsPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { AcademyIndexPage, ArticlePage } from "./public/pages/AcademyPages";
import { CvCheckToolPage, NetSalaryToolPage, OpsToolPage, PrimaToolPage, SettlementToolPage, SeveranceToolPage, ToolsIndexPage, VacationToolPage } from "./public/pages/ToolsPages";
import { DafpFormatPage, Format1003Page, TemplatesGalleryPage, TemplateLandingPage } from "./public/pages/FormatPages";
import { ExampleDetailPage, ExamplesIndexPage, MinimumWagePage } from "./public/pages/ExamplePages";
import { CreateCvPage } from "./public/pages/CreateCvPage";
import { AboutPage, ContactPage, LegalPage, NotFoundPage } from "./public/pages/InfoPages";

/** Route table shared by the browser app and the build-time prerender. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<HomePage />} />
      <Route path="/auth/callback" element={<HomePage />} />
      <Route path="/dashboard" element={<PortalPage />} />
      <Route path="/security/sessions" element={<SecuritySessionsPage />} />
      <Route path="/settings" element={<PreferencesPage />} />
      <Route path="/modules" element={<PortalPage />} />
      <Route path="/admin" element={<AdminConsolePage />} />
      <Route path="/admin/usuarios" element={<UsersAdminPage />} />
      <Route path="/admin/auditoria" element={<AuditAdminPage />} />
      <Route path="/admin/access" element={<Navigate to="/admin/usuarios" replace />} />
      <Route path="/admin/empresas" element={<ProAdminPage section="empresas" />} />
      <Route path="/admin/vacantes" element={<ProAdminPage section="vacantes" />} />
      <Route path="/admin/publicidad" element={<ProAdminPage section="publicidad" />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />

      {/* Public, prerendered pages */}
      <Route path="/crear-hoja-de-vida" element={<CreateCvPage />} />
      <Route path="/plantillas-hoja-de-vida" element={<TemplatesGalleryPage />} />
      <Route path="/plantillas-hoja-de-vida/:slug" element={<TemplateLandingPage />} />
      <Route path="/formato-unico-hoja-de-vida" element={<DafpFormatPage />} />
      <Route path="/hoja-de-vida-formato-1003" element={<Format1003Page />} />
      <Route path="/ejemplos-hoja-de-vida" element={<ExamplesIndexPage />} />
      <Route path="/ejemplos-hoja-de-vida/:slug" element={<ExampleDetailPage />} />
      <Route path="/salario-minimo-colombia" element={<MinimumWagePage />} />
      <Route path="/academy" element={<AcademyIndexPage />} />
      <Route path="/academy/:slug" element={<ArticlePage />} />
      <Route path="/tools" element={<ToolsIndexPage />} />
      <Route path="/tools/prima" element={<PrimaToolPage />} />
      <Route path="/tools/cesantias" element={<SeveranceToolPage />} />
      <Route path="/tools/vacaciones" element={<VacationToolPage />} />
      <Route path="/tools/salario-neto" element={<NetSalaryToolPage />} />
      <Route path="/tools/liquidacion" element={<SettlementToolPage />} />
      <Route path="/tools/contrato-vs-prestacion" element={<OpsToolPage />} />
      <Route path="/tools/evaluador-cv" element={<CvCheckToolPage />} />
      <Route path="/legal/privacidad" element={<LegalPage slug="privacidad" />} />
      <Route path="/legal/terminos" element={<LegalPage slug="terminos" />} />
      <Route path="/legal/cookies" element={<LegalPage slug="cookies" />} />
      <Route path="/legal/uso-ia" element={<LegalPage slug="uso-ia" />} />
      <Route path="/nosotros" element={<AboutPage />} />
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
