import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnrolStudentStudentsSkeleton } from "./enrol-student-students-skeleton.component";

describe("EnrolStudentStudentsSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<EnrolStudentStudentsSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando os alunos" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(12);
  });
});
