import { auth } from "@/lib/auth";

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export const requireSession = async (request: Request): Promise<Session | Response> => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
};
