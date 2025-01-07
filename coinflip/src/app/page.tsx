"use client";
import { ThirdwebProvider } from "thirdweb/react";
import Home from "./components/Home";
export default function Page() {
  return (
    <ThirdwebProvider>
      <Home />
    </ThirdwebProvider>
  );
}
