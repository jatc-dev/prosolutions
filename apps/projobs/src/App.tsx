import { SearchX } from "lucide-react";
import { Suspense, lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { RequireCapability } from "./components/Guards";
import { Layout } from "./components/Layout";
import { EmptyState, Spinner } from "./components/primitives";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { CompanyPage } from "./pages/CompanyPage";
import { JobPage } from "./pages/JobPage";
import { JobsPage } from "./pages/JobsPage";
import { SavedJobsPage } from "./pages/SavedJobsPage";

// Employer (ATS) screens are only used by recruiters: load them on demand.
const EmployerPage = lazy(() => import("./pages/employer/EmployerPage").then((m) => ({ default: m.EmployerPage })));
const JobEditorPage = lazy(() => import("./pages/employer/JobEditorPage").then((m) => ({ default: m.JobEditorPage })));
const PipelinePage = lazy(() => import("./pages/employer/PipelinePage").then((m) => ({ default: m.PipelinePage })));

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState icon={<SearchX className="h-10 w-10" />} title="Página no encontrada" action={<Link to="/" className="font-semibold text-brand-800 hover:underline">Ir a empleos</Link>} />
    </div>
  );
}

const candidate = (page: JSX.Element) => <RequireCapability capability="candidate">{page}</RequireCapability>;
const recruiter = (page: JSX.Element) => (
  <RequireCapability capability="recruiter">
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Spinner /></div>}>{page}</Suspense>
  </RequireCapability>
);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<JobsPage />} />
        <Route path="empleos/:slug" element={<JobPage />} />
        <Route path="empresas/:slug" element={<CompanyPage />} />
        <Route path="postulaciones" element={candidate(<ApplicationsPage />)} />
        <Route path="guardados" element={candidate(<SavedJobsPage />)} />
        <Route path="empresa" element={recruiter(<EmployerPage />)} />
        <Route path="empresa/vacantes/nueva" element={recruiter(<JobEditorPage />)} />
        <Route path="empresa/vacantes/:jobId/editar" element={recruiter(<JobEditorPage />)} />
        <Route path="empresa/vacantes/:jobId/candidatos" element={recruiter(<PipelinePage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
