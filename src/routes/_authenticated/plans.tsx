import { createFileRoute, redirect } from "@tanstack/react-router";

type PlansSearchParams = {
  tab?: string;
  service?: string;
};

export const Route = createFileRoute("/_authenticated/plans")({
  validateSearch: (search: Record<string, unknown>): PlansSearchParams => {
    const params: PlansSearchParams = {};
    if (typeof search["tab"] === "string") params.tab = search["tab"];
    if (typeof search["service"] === "string") params.service = search["service"];
    return params;
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/checkout",
      search: {
        ...(search.tab ? { tab: search.tab } : {}),
        ...(search.service ? { service: search.service } : {}),
      },
    });
  },
  component: () => null,
});
