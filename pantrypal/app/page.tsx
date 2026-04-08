import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ClientHome from "./ClientHome";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <ClientHome />;
}
