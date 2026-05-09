import { useNavigate } from "react-router";
import { ContactModal } from "./ContactModal";

export function ContactPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#f5f3f0", minHeight: "100vh" }}>
      <ContactModal
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate("/");
        }}
      />
    </div>
  );
}
