"use client";

import type { ReactElement } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { FormDefEditor } from "../form-def-editor";

export default function NewFormPage(): ReactElement {
  useAdminGuard();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Yeni Form</h1>
      <FormDefEditor mode="create" />
    </div>
  );
}
