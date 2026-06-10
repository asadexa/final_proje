"use client";

import { type ReactElement, useEffect } from "react";
import { getToken } from "@/lib/admin";
import { FormDefEditor } from "../form-def-editor";

export default function NewFormPage(): ReactElement {
  useEffect(() => {
    if (!getToken()) window.location.href = "/admin/login";
  }, []);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Yeni Form</h1>
      <FormDefEditor mode="create" />
    </div>
  );
}
