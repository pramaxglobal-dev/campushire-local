"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ServiceRequestStatus,
  ServiceRequestType,
  UserRole,
  VendorType,
  type ServiceRequest,
  type VendorProfile
} from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  createServiceRequest,
  getMyServiceRequests,
  listVendors,
  rateVendor,
  updateServiceRequest,
  type CreateServiceRequestDto,
  type VendorFilters
} from "@/lib/api/vendors.api";
import { asArray } from "@/lib/utils/dashboard";
import { asRecord } from "@/lib/utils/dashboard";
import { useAuthStore } from "@/lib/store/auth.store";
import { Building2, ClipboardPlus, MapPin, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";

interface RequestFormState {
  vendorId: string;
  requestType: ServiceRequestType;
  title: string;
  description: string;
  deadline: string;
  candidateUserIds: string;
  documentsRequired: string;
}

const initialRequestForm: RequestFormState = {
  vendorId: "",
  requestType: ServiceRequestType.DOCUMENT_VERIFICATION,
  title: "",
  description: "",
  deadline: "",
  candidateUserIds: "",
  documentsRequired: ""
};

const vendorTypeOptions = Object.values(VendorType).map((type) => ({
  label: type.replaceAll("_", " "),
  value: type
}));

const serviceTypeOptions = Object.values(ServiceRequestType).map((type) => ({
  label: type.replaceAll("_", " "),
  value: type
}));

const parseStringList = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const getServiceAreas = (profile: VendorProfile): string[] => {
  return asArray(profile.serviceAreas).filter((item): item is string => typeof item === "string");
};

export default function VendorMarketplacePage() {
  const user = useAuthStore((state) => state.user);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VendorFilters>({ page: 1, limit: 24 });
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(initialRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);
  const [ratingRequest, setRatingRequest] = useState<ServiceRequest | null>(null);
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");

  const debouncedCity = useDebounce(searchCity, 300);
  const debouncedState = useDebounce(searchState, 300);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorResponse, requestResponse] = await Promise.all([
        listVendors({
          ...filters,
          city: debouncedCity || undefined,
          state: debouncedState || undefined
        }),
        getMyServiceRequests(1, 100)
      ]);
      setVendors(vendorResponse.data ?? []);
      setRequests(requestResponse.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load vendors.");
    } finally {
      setLoading(false);
    }
  }, [debouncedCity, debouncedState, filters]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === requestForm.vendorId) ?? null,
    [requestForm.vendorId, vendors]
  );

  const openRequestModal = (vendorId: string): void => {
    setRequestForm((prev) => ({ ...prev, vendorId }));
    setModalOpen(true);
  };

  const handleCreateRequest = async (): Promise<void> => {
    if (!requestForm.vendorId || !requestForm.title.trim() || !requestForm.description.trim()) {
      toast.error("Please fill required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateServiceRequestDto = {
        vendorId: requestForm.vendorId,
        requestType: requestForm.requestType,
        title: requestForm.title.trim(),
        description: requestForm.description.trim(),
        deadline: requestForm.deadline || undefined,
        candidateUserIds: parseStringList(requestForm.candidateUserIds),
        documentsRequired: parseStringList(requestForm.documentsRequired)
      };
      await createServiceRequest(payload);
      toast.success("Service request sent to vendor.");
      setModalOpen(false);
      setRequestForm(initialRequestForm);
      await loadVendors();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create service request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRequest = async (): Promise<void> => {
    if (!editingRequest?.title.trim() || !editingRequest.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      await updateServiceRequest(editingRequest.id, {
        title: editingRequest.title.trim(),
        description: editingRequest.description.trim(),
        dueDate: editingRequest.dueDate ? new Date(editingRequest.dueDate).toISOString() : undefined
      });
      toast.success("Service request updated.");
      setEditingRequest(null);
      await loadVendors();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Unable to update request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateVendor = async (): Promise<void> => {
    if (!ratingRequest || !review.trim()) {
      toast.error("Add a short review before submitting your rating.");
      return;
    }
    setSubmitting(true);
    try {
      await rateVendor(ratingRequest.id, Number(rating), review.trim());
      toast.success("Rating submitted. Thank you for the feedback.");
      setRatingRequest(null);
      setRating("5");
      setReview("");
      await loadVendors();
    } catch (ratingError) {
      toast.error(ratingError instanceof Error ? ratingError.message : "Unable to submit rating.");
    } finally {
      setSubmitting(false);
    }
  };

  const canRequestServices = user?.role !== UserRole.VENDOR;

  if (loading) return <LoadingSkeleton variant="feed" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadVendors()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Marketplace"
        subtitle="Browse verified vendors for document checks, manpower, and hiring services."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Select
            label="Vendor Type"
            value={filters.vendorType ?? ""}
            options={[{ label: "All Types", value: "" }, ...vendorTypeOptions]}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                vendorType: (event.target.value as VendorType) || undefined
              }))
            }
          />
          <Input
            label="City"
            value={searchCity}
            onChange={(event) => setSearchCity(event.target.value)}
          />
          <Input
            label="State"
            value={searchState}
            onChange={(event) => setSearchState(event.target.value)}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearchCity("");
                setSearchState("");
                setFilters({ page: 1, limit: 24 });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No vendors found"
          description="Try changing your filters to discover service providers."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((vendor) => {
            const serviceAreas = getServiceAreas(vendor);
            return (
              <Card key={vendor.id} className="transition hover:shadow-card-hover">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{vendor.businessName}</p>
                      <p className="text-sm text-slate-600">{vendor.vendorType.replaceAll("_", " ")}</p>
                    </div>
                    {vendor.isVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {serviceAreas.slice(0, 2).join(", ") || "Pan India"}
                    </p>
                    <p>Pricing: {vendor.pricingModel.replaceAll("_", " ")}</p>
                    <p>
                      Base Price: {typeof vendor.basePrice === "number" ? `₹${vendor.basePrice}` : "Custom"}
                    </p>
                    <p className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      Turnaround: {vendor.turnaroundHours ?? "--"} hrs
                    </p>
                  </div>

                  {canRequestServices ? (
                    <Button className="w-full" onClick={() => openRequestModal(vendor.id)}>
                      <ClipboardPlus className="mr-2 h-4 w-4" />
                      Request Service
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canRequestServices ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Service Requests</h2>
              <p className="text-sm text-slate-600">Track delivery, correct pending requests, and rate completed work.</p>
            </div>
            {requests.length === 0 ? (
              <p className="text-sm text-slate-600">You have not requested a vendor service yet.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {requests.map((request) => {
                  const payload = asRecord(request.payload);
                  const hasRating = typeof payload.vendorRating === "number";
                  return (
                    <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{request.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{request.description}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>{request.status.replaceAll("_", " ")}</Badge>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {request.dueDate ? `Due ${formatDate(new Date(request.dueDate), "dd MMM yyyy")}` : "No deadline"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.status === ServiceRequestStatus.PENDING ? (
                          <Button size="sm" variant="outline" onClick={() => setEditingRequest(request)}>
                            Edit Request
                          </Button>
                        ) : null}
                        {request.status === ServiceRequestStatus.COMPLETED && !hasRating ? (
                          <Button size="sm" onClick={() => setRatingRequest(request)}>
                            <Star className="mr-1 h-4 w-4" /> Rate Vendor
                          </Button>
                        ) : null}
                        {hasRating ? <span className="text-sm font-medium text-amber-600">Rated {String(payload.vendorRating)}/5</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={`Request Service${selectedVendor ? ` - ${selectedVendor.businessName}` : ""}`}
      >
        <div className="space-y-3">
          <Select
            label="Service Type"
            value={requestForm.requestType}
            options={serviceTypeOptions}
            onChange={(event) =>
              setRequestForm((prev) => ({
                ...prev,
                requestType: event.target.value as ServiceRequestType
              }))
            }
          />
          <Input
            label="Title"
            value={requestForm.title}
            onChange={(event) =>
              setRequestForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
          <Textarea
            label="Description"
            value={requestForm.description}
            onChange={(event) =>
              setRequestForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <Input
            label="Deadline"
            type="date"
            value={requestForm.deadline}
            onChange={(event) =>
              setRequestForm((prev) => ({ ...prev, deadline: event.target.value }))
            }
          />
          <Input
            label="Candidate User IDs (comma separated)"
            helperText="Optional for manpower/document workflows."
            value={requestForm.candidateUserIds}
            onChange={(event) =>
              setRequestForm((prev) => ({ ...prev, candidateUserIds: event.target.value }))
            }
          />
          <Input
            label="Documents Required (comma separated)"
            helperText="Example: Aadhaar, PAN, Resume"
            value={requestForm.documentsRequired}
            onChange={(event) =>
              setRequestForm((prev) => ({ ...prev, documentsRequired: event.target.value }))
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateRequest()} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editingRequest !== null} onOpenChange={(open) => !open && setEditingRequest(null)} title="Edit Service Request">
        {editingRequest ? (
          <div className="space-y-3">
            <Input label="Title" value={editingRequest.title} onChange={(event) => setEditingRequest({ ...editingRequest, title: event.target.value })} />
            <Textarea label="Description" value={editingRequest.description} onChange={(event) => setEditingRequest({ ...editingRequest, description: event.target.value })} />
            <Input label="Deadline" type="date" value={editingRequest.dueDate ? new Date(editingRequest.dueDate).toISOString().slice(0, 10) : ""} onChange={(event) => setEditingRequest({ ...editingRequest, dueDate: event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`) : null })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
              <Button onClick={() => void handleUpdateRequest()} disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={ratingRequest !== null} onOpenChange={(open) => !open && setRatingRequest(null)} title="Rate Vendor Service">
        <div className="space-y-3">
          <Select label="Rating" value={rating} options={[1, 2, 3, 4, 5].map((value) => ({ label: `${value} star${value === 1 ? "" : "s"}`, value: String(value) }))} onChange={(event) => setRating(event.target.value)} />
          <Textarea label="Review" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Describe service quality, turnaround, and communication." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRatingRequest(null)}>Cancel</Button>
            <Button onClick={() => void handleRateVendor()} disabled={submitting}>{submitting ? "Submitting..." : "Submit Rating"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
