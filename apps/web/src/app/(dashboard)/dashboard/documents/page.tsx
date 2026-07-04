"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentType, UserRole, VerificationStatus, type UserDocument } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select
} from "@/components/ui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FileUpload } from "@/components/common/FileUpload";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  deleteDocument,
  getMyDocuments,
  getSharedCandidateDocuments,
  requestVerification,
  toggleShareWithRecruiters,
  uploadDocument
} from "@/lib/api/documents.api";
import { listVendors } from "@/lib/api/vendors.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { asRecord } from "@/lib/utils/dashboard";
import { Download, FileBadge2, FileImage, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type DocumentsTab = "my-documents" | "shared";

const documentTypeOptions = Object.values(DocumentType).map((documentType) => ({
  label: documentType.replaceAll("_", " "),
  value: documentType
}));

const documentIcon = (fileName: string, mimeType: string | null): typeof FileText => {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType ?? "").toLowerCase();
  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) return FileBadge2;
  if (lowerMime.startsWith("image/") || lowerName.endsWith(".jpg") || lowerName.endsWith(".png")) return FileImage;
  return FileText;
};

const getDocumentFileName = (document: UserDocument): string => {
  const meta = asRecord(document.meta);
  if (typeof meta.originalFileName === "string" && meta.originalFileName.trim().length > 0) {
    return meta.originalFileName;
  }
  const parts = document.fileKey.split("/");
  return parts[parts.length - 1] ?? "Document";
};

const getMimeType = (document: UserDocument): string | null => {
  const meta = asRecord(document.meta);
  return typeof meta.mimeType === "string" ? meta.mimeType : null;
};

const isShared = (document: UserDocument): boolean => {
  const meta = asRecord(document.meta);
  return meta.isSharedWithRecruiters === true;
};

export default function DocumentsVaultPage() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<DocumentsTab>("my-documents");
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<UserDocument[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; businessName: string }>>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.RESUME);
  const [verificationVendor, setVerificationVendor] = useState<string>("");
  const [candidateUserId, setCandidateUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDocument | null>(null);

  const isRecruiter = user?.role === UserRole.CORPORATE_RECRUITER;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, vendorResponse] = await Promise.all([
        getMyDocuments(),
        listVendors({ vendorType: undefined, isVerified: true, page: 1, limit: 50 })
      ]);
      setDocuments(docs);
      setVendors(
        (vendorResponse.data ?? []).map((vendor) => ({
          id: vendor.id,
          businessName: vendor.businessName
        }))
      );
      if (!verificationVendor && vendorResponse.data && vendorResponse.data.length > 0) {
        setVerificationVendor(vendorResponse.data[0]?.id ?? "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [verificationVendor]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sharedByUser = useMemo(
    () => documents.filter((document) => isShared(document)),
    [documents]
  );

  const handleUpload = async (file: File): Promise<void> => {
    try {
      await uploadDocument(file, {
        documentType: selectedType,
        isSharedWithRecruiters: false
      });
      toast.success("Document uploaded.");
      await loadData();
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      throw uploadError;
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      toast.success("Document deleted.");
      setDeleteTarget(null);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete document.");
    }
  };

  const handleShareToggle = async (document: UserDocument, share: boolean): Promise<void> => {
    const previous = documents;
    setDocuments((prev) =>
      prev.map((item) =>
        item.id === document.id
          ? { ...item, meta: { ...asRecord(item.meta), isSharedWithRecruiters: share } }
          : item
      )
    );

    try {
      await toggleShareWithRecruiters(document.id, share);
      toast.success(share ? "Shared with recruiters." : "Removed from recruiter sharing.");
      await loadData();
    } catch (toggleError) {
      setDocuments(previous);
      toast.error(toggleError instanceof Error ? toggleError.message : "Unable to update sharing.");
    }
  };

  const handleRequestVerification = async (documentId: string): Promise<void> => {
    if (!verificationVendor) {
      toast.error("Select a verification vendor first.");
      return;
    }
    try {
      await requestVerification(documentId, verificationVendor);
      toast.success("Verification requested.");
      await loadData();
    } catch (verifyError) {
      toast.error(verifyError instanceof Error ? verifyError.message : "Unable to request verification.");
    }
  };

  const handleFetchShared = async (): Promise<void> => {
    if (!candidateUserId.trim()) {
      toast.error("Enter candidate user ID.");
      return;
    }
    try {
      const shared = await getSharedCandidateDocuments(candidateUserId.trim());
      setSharedDocuments(shared);
    } catch (sharedError) {
      toast.error(sharedError instanceof Error ? sharedError.message : "Unable to fetch shared documents.");
    }
  };

  if (loading) return <LoadingSkeleton variant="card" count={6} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents Vault"
        subtitle="Upload, verify, and securely share your hiring documents."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Document Type"
              value={selectedType}
              options={documentTypeOptions}
              onChange={(event) => setSelectedType(event.target.value as DocumentType)}
            />
            <Select
              label="Verification Vendor"
              value={verificationVendor}
              options={[
                { label: "Select vendor", value: "" },
                ...vendors.map((vendor) => ({ label: vendor.businessName, value: vendor.id }))
              ]}
              onChange={(event) => setVerificationVendor(event.target.value)}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Allowed: PDF, JPG, PNG, DOCX (max 10MB)
            </div>
          </div>
          <FileUpload
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            maxSizeMB={10}
            onUpload={handleUpload}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={tab === "my-documents" ? "default" : "outline"}
          onClick={() => setTab("my-documents")}
        >
          My Documents
        </Button>
        <Button
          variant={tab === "shared" ? "default" : "outline"}
          onClick={() => setTab("shared")}
        >
          Shared with Recruiters
        </Button>
      </div>

      {tab === "my-documents" ? (
        documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents uploaded"
            description="Upload your resume, degree, and identity documents to get started."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => {
              const fileName = getDocumentFileName(document);
              const mimeType = getMimeType(document);
              const Icon = documentIcon(fileName, mimeType);
              return (
                <Card key={document.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="line-clamp-1 font-medium text-slate-900">{fileName}</p>
                          <p className="text-xs text-slate-500">{document.documentType.replaceAll("_", " ")}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(document.verificationStatus)}>
                        {document.verificationStatus === VerificationStatus.VERIFIED ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        ) : (
                          document.verificationStatus.replaceAll("_", " ")
                        )}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500">
                      Uploaded {formatDate(new Date(document.createdAt), "dd MMM yyyy")}
                    </p>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                      <span className="text-sm text-slate-700">Share with recruiters</span>
                      <input
                        type="checkbox"
                        checked={isShared(document)}
                        onChange={(event) => void handleShareToggle(document, event.target.checked)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                      <Button variant="destructive" onClick={() => setDeleteTarget(document)}>
                        Delete
                      </Button>
                    </div>

                    {document.verificationStatus === VerificationStatus.UNVERIFIED ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleRequestVerification(document.id)}
                      >
                        Request Verification
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            {isRecruiter ? (
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  label="Candidate User ID"
                  value={candidateUserId}
                  onChange={(event) => setCandidateUserId(event.target.value)}
                />
                <Button onClick={() => void handleFetchShared()}>Fetch Shared Documents</Button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                These are the documents you have shared with recruiters.
              </p>
            )}

            {(isRecruiter ? sharedDocuments : sharedByUser).length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No shared documents"
                description={
                  isRecruiter
                    ? "No shared documents found for this candidate."
                    : "You have not shared any documents yet."
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(isRecruiter ? sharedDocuments : sharedByUser).map((document) => (
                  <div key={document.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{getDocumentFileName(document)}</p>
                    <p className="text-sm text-slate-600">{document.documentType.replaceAll("_", " ")}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge className={getStatusColor(document.verificationStatus)}>
                        {document.verificationStatus.replaceAll("_", " ")}
                      </Badge>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Open</Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Document"
        description="This action will permanently remove the document from your vault."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
