import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <LoadingSkeleton variant="profile" count={1} />
      </div>
      <LoadingSkeleton variant="feed" count={6} />
    </div>
  );
}
