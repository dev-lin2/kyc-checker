import { Route as RootRoute } from "./routes/__root";
import { Route as DocumentsRoute } from "./routes/documents";
import { Route as IndexRoute } from "./routes/index";
import { Route as KycRoute } from "./routes/kyc";
import { Route as StatusRoute } from "./routes/status";

export const routeTree = RootRoute.addChildren([
  IndexRoute,
  DocumentsRoute,
  KycRoute,
  StatusRoute,
]);
