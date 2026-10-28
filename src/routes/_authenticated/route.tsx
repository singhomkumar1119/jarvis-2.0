import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthStatus } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const status = await getAuthStatus();
    if (status.required && !status.authenticated) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    return { user: { id: "owner", role: "owner" } };
  },
  component: () => <Outlet />,
});