import { Navigate } from 'react-router'

// The Campaigns nav item points here for now; logo-sketch campaigns still live
// in the existing AdminSketchUpload page. We only redirect (the sketches file
// is not moved yet).
export function CampaignsRedirect() {
  return <Navigate to="/portal/admin/sketches" replace />
}
