import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontFamily: "var(--font-family-primary)",
            fontSize: "var(--typo-caption-m-size)",
            lineHeight: "var(--typo-caption-m-line-height)",
          },
        }}
      />
    </>
  );
}