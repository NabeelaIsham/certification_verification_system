import { render, screen, fireEvent } from "@testing-library/react";
import VerificationPortal from "../src/pages/VerificationPortal.jsx";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("VerificationPortal", () => {
  it.each([
    ["issued", "Certificate Verified Successfully", ""],
    ["revoked", "Certificate revoked", "cvx-result-error"],
  ])(
    "shows the correct result state for a %s credential",
    async (status, heading, iconClass) => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            certificateCode: "INS-261008-TESTCODE",
            status,
            studentName: "Example Student",
            credential: { signatureValid: true, issuerKeyTrusted: true },
          },
        },
      });
      const { container } = render(
        <MemoryRouter>
          <VerificationPortal />
        </MemoryRouter>,
      );
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "INS-261008-TESTCODE" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Verify Certificate" }),
      );
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      if (iconClass)
        expect(container.querySelector(".cvx-result-icon")).toHaveClass(
          iconClass,
        );
      expect(
        screen.getByRole("button", { name: "Download Certificate" }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Verify Another" }));
      expect(screen.getByRole("textbox")).toHaveValue("");
    },
  );
  it("renders verification input and button", () => {
    render(
      <MemoryRouter>
        <VerificationPortal />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /verify certificate/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows error when verify clicked with empty code", () => {
    render(
      <MemoryRouter>
        <VerificationPortal />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /verify certificate/i }),
    );
    expect(
      screen.getByText(/please enter a certificate code/i),
    ).toBeInTheDocument();
  });
});
