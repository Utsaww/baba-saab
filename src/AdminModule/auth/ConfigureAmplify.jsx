"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

// ssr: true keeps the sign-in tokens in cookies, so the middleware and server components can read them.
Amplify.configure(outputs, { ssr: true });

export default function ConfigureAmplify() {
  return null;
}
