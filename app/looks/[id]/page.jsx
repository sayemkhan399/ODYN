import { Suspense } from "react";
import LookDetails from "@/pages/components/LookDetails";

export default function LookDetailsPage({ params }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fbfaf7]" />}>
      <ResolvedLookDetails params={params} />
    </Suspense>
  );
}

async function ResolvedLookDetails({ params }) {
  const { id } = await params;
  return <LookDetails lookId={id} />;
}
