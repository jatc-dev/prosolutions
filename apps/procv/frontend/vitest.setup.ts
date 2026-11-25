import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "./src/i18n";

// Tests assert the Spanish UI (the product default), whatever the machine locale is.
void i18n.changeLanguage("es");

afterEach(cleanup);
