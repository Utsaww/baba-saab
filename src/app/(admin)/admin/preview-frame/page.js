import { requireStaff } from "@/AdminModule/auth/server";
import PreviewFrameClient from "@/AdminModule/editor/PreviewFrameClient";

export const metadata = { title: "Preview" };

// Staff-only and outside the (staff) group on purpose: no admin shell, so template styles render in isolation.
export default async function PreviewFramePage() {
  await requireStaff();
  return <PreviewFrameClient />;
}
