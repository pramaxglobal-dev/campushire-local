"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Award, Briefcase, Clock } from "lucide-react";
import type { VendorProfile, ServiceRequest } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getVendorDetail } from "@/lib/api/vendors.api";
import { ROUTES } from "@/lib/utils/routes";

type VendorDetailResponse = VendorProfile & {
  recentReviews: ServiceRequest[];
  avgRating?: number;
  totalRequests?: number;
  completedRequests?: number;
};

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;

  const [vendor, setVendor] = useState<VendorDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVendor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorDetail(vendorId);
      setVendor(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load vendor details.");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !vendor) {
    return <ErrorState message={error ?? "Unable to load vendor."} onRetry={() => void loadVendor()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.businessName}
        subtitle="Vendor Profile"
        breadcrumb={<Link href={ROUTES.vendors}>Back to Vendors</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{vendor.vendorType.replaceAll("_", " ")}</Badge>
                {vendor.isVerified ? (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    <Award className="mr-1 h-3 w-3" />Verified
                  </Badge>
                ) : null}
              </div>

              <p className="whitespace-pre-wrap text-slate-700">{vendor.about || "No description available."}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                    <Briefcase className="h-4 w-4" />
                    Pricing: {vendor.pricingModel.replaceAll("_", " ")}
                  </p>
                </div>

                {vendor.turnaroundHours ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      Turnaround: {vendor.turnaroundHours}h
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
              {!vendor.recentReviews || vendor.recentReviews.length === 0 ? (
                <p className="text-sm text-slate-600">No recent service requests available yet.</p>
              ) : (
                <div className="space-y-3">
                  {vendor.recentReviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <Badge className="text-xs">{review.status.replaceAll("_", " ")}</Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(new Date(review.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-slate-900">{review.title}</p>
                      {review.description ? (
                        <p className="mt-1 text-sm text-slate-600">{review.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Vendor Stats</h2>
              <div className="space-y-3">
                {vendor.avgRating ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Average Rating</span>
                    <span className="font-semibold text-slate-900">{vendor.avgRating.toFixed(1)} ⭐</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Projects</span>
                  <span className="font-semibold text-slate-900">{vendor.totalRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Completed</span>
                  <span className="font-semibold text-slate-900">{vendor.completedRequests ?? 0}</span>
                </div>
              </div>
              <Link href={`${ROUTES.vendors}?requestVendor=${vendor.userId}`}>
                <Button className="w-full">Request Service</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
