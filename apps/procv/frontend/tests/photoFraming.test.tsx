import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { WithCustomStyles } from "../src/modules/procv/components/withCustomStyles";

const data = (personal: Record<string, unknown>) => ({
  personal: { name: "Ana Pérez", profileImage: "data:image/png;base64,iVBORw0KGgo=", showProfileImage: true, ...personal },
});

describe("photo framing and border", () => {
  it("passes the chosen framing to the templates and keeps it within 0-100 %", () => {
    const { container } = render(<WithCustomStyles template="corporate" data={data({ profileImagePositionX: 30, profileImagePositionY: 140 })} />);
    const wrapper = container.querySelector(".cv-custom-wrapper") as HTMLElement;
    expect(wrapper.style.getPropertyValue("--cv-photo-x")).toBe("30%");
    expect(wrapper.style.getPropertyValue("--cv-photo-y")).toBe("100%");
    expect(container.querySelector("img.cv-photo")).toBeTruthy();
  });

  it("keeps the template border by default and removes it on request", () => {
    const withBorder = render(<WithCustomStyles template="corporate" data={data({})} />);
    expect(withBorder.container.querySelector("img.cv-photo")!.className).not.toContain("!border-0");
    withBorder.unmount();
    const noBorder = render(<WithCustomStyles template="corporate" data={data({ profileImageBorder: false })} />);
    expect(noBorder.container.querySelector("img.cv-photo")!.className).toContain("!border-0");
  });
});
