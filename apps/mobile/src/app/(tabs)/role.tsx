import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserRole } from "@campushire/types";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { apiClient, unwrapResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";

interface WorkspaceItem { id: string; title: string; subtitle: string; status?: string; action?: "approve" | "accept"; }

const roleTitle: Partial<Record<UserRole, string>> = {
  [UserRole.SUPER_ADMIN]: "Platform Control",
  [UserRole.COLLEGE_ADMIN]: "Campus Operations",
  [UserRole.CORPORATE_RECRUITER]: "Recruiting Workspace",
  [UserRole.FREELANCE_RECRUITER]: "Referral Workspace",
  [UserRole.VENDOR]: "Service Delivery",
  [UserRole.TRAINING_PARTNER]: "Learning Operations"
};

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const asText = (value: unknown, fallback = "—"): string => typeof value === "string" && value ? value : fallback;

export default function RoleWorkspaceTab() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let rows: unknown[] = [];
      if (user.role === UserRole.SUPER_ADMIN) {
        rows = await unwrapResponse<unknown[]>(await apiClient.get("/api/admin/pending-approvals"));
        setItems(rows.map((row) => { const record = asRecord(row); const person = asRecord(record.user); return { id: asText(person.id), title: `${asText(person.firstName, "New")} ${asText(person.lastName, "user")}`, subtitle: `${asText(person.email)} · ${asText(record.role)}`, status: "PENDING APPROVAL", action: "approve" }; }));
      } else if (user.role === UserRole.COLLEGE_ADMIN) {
        rows = await unwrapResponse<unknown[]>(await apiClient.get("/api/events/my"));
        setItems(rows.map((row) => { const record = asRecord(row); return { id: asText(record.id), title: asText(record.title), subtitle: `${asText(record.eventType).replaceAll("_", " ")} · ${new Date(asText(record.startAt)).toLocaleDateString()}`, status: asText(record.status) }; }));
      } else if (user.role === UserRole.CORPORATE_RECRUITER) {
        const response = await apiClient.get("/api/jobs", { params: { myJobsOnly: true, page: 1, limit: 100 } });
        rows = (response.data?.data ?? []) as unknown[];
        setItems(rows.map((row) => { const record = asRecord(row); return { id: asText(record.id), title: asText(record.title), subtitle: asText(record.company), status: "RECRUITING" }; }));
      } else if (user.role === UserRole.FREELANCE_RECRUITER) {
        const response = await apiClient.get("/api/freelance/referrals", { params: { page: 1, limit: 100 } });
        rows = (response.data?.data ?? []) as unknown[];
        setItems(rows.map((row) => { const record = asRecord(row); return { id: asText(record.id), title: asText(record.candidateName, "Candidate referral"), subtitle: asText(record.candidateEmail), status: asText(record.status) }; }));
      } else if (user.role === UserRole.VENDOR) {
        const response = await apiClient.get("/api/service-requests", { params: { page: 1, limit: 100 } });
        rows = (response.data?.data ?? []) as unknown[];
        setItems(rows.map((row) => { const record = asRecord(row); const status = asText(record.status); return { id: asText(record.id), title: asText(record.title), subtitle: asText(record.description), status, action: status === "PENDING" ? "accept" : undefined }; }));
      } else if (user.role === UserRole.TRAINING_PARTNER) {
        rows = await unwrapResponse<unknown[]>(await apiClient.get("/api/training/courses"));
        setItems(rows.map((row) => { const record = asRecord(row); return { id: asText(record.id), title: asText(record.title), subtitle: `${asText(record.level)} · ${asText(record.mode)}`, status: record.isActive === true ? "PUBLISHED" : "DRAFT" }; }));
      }
    } catch (error) { Toast.error(error instanceof Error ? error.message : "Unable to load workspace."); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (item: WorkspaceItem): Promise<void> => {
    try {
      if (item.action === "approve") await apiClient.post(`/api/admin/users/${item.id}/approve`);
      if (item.action === "accept") await apiClient.patch(`/api/service-requests/${item.id}/respond`, { action: "accept" });
      Toast.success(item.action === "approve" ? "User approved." : "Request accepted.");
      await load();
    } catch (error) { Toast.error(error instanceof Error ? error.message : "Action failed."); }
  };

  if (!user) return null;
  return <View style={styles.container}><Header title={roleTitle[user.role] ?? "Workspace"} subtitle="Live role-authorized records" />{loading ? <View style={styles.loading}><Skeleton height={110} /><Skeleton height={110} /><Skeleton height={110} /></View> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} renderItem={({ item }) => <View style={styles.card}><View style={styles.cardHeader}><Text style={styles.title}>{item.title}</Text>{item.status ? <Text style={styles.status}>{item.status.replaceAll("_", " ")}</Text> : null}</View><Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>{item.action ? <TouchableOpacity style={styles.action} onPress={() => void runAction(item)}><Text style={styles.actionLabel}>{item.action === "approve" ? "Approve Account" : "Accept Request"}</Text></TouchableOpacity> : null}</View>} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Text style={styles.empty}>No active records require your attention.</Text>} />}</View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, loading: { padding: 14, gap: 10 }, list: { padding: 14, paddingBottom: 30 }, card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16 }, cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, title: { color: Colors.textPrimary, fontSize: 16, fontWeight: "800", flex: 1 }, subtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 7 }, status: { color: Colors.primary, backgroundColor: Colors.navy50, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, fontWeight: "800", overflow: "hidden" }, action: { alignSelf: "flex-start", backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 14 }, actionLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 }, empty: { color: Colors.textSecondary, textAlign: "center", marginTop: 40 } });
