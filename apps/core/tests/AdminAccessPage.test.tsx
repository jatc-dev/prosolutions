import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  AdminAccessDeniedView,
  AdminAccessErrorView,
  AdminAccessModuleControl,
} from "../src/pages/adminAccessViews";

describe("AdminAccessPage views", () => {
  it("renders access denied without the administrative shell or user data", () => {
    render(<MemoryRouter><AdminAccessDeniedView /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado");
    expect(screen.getByRole("link", { name: "Volver al portal" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders a recoverable error separately from access denial", () => {
    const onRetry = vi.fn();
    render(<AdminAccessErrorView message="Error de red. Comprueba tu conexión." onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "No se pudo cargar la consola" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Error de red");
    expect(screen.queryByText("Acceso denegado")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows authorized read-only module state without an enabled mutation control", () => {
    render(
      <AdminAccessModuleControl
        label="ProCV"
        description="CV y análisis ATS"
        checked
        isActive
        canManage={false}
        busy={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("ProCV")).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura/)).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it("enables the module control for an authorized manager", () => {
    const onChange = vi.fn();
    render(
      <AdminAccessModuleControl
        label="ProCV"
        description="CV y análisis ATS"
        checked
        isActive
        canManage
        busy={false}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
