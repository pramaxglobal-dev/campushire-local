import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { getApplication } from "@/lib/api/applications.api";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback = "—") => typeof value === "string" && value ? value : fallback;
export default function MobileApplicationDetail() {
  const { id } = useLocalSearchParams() as { id: string };
  const [application, setApplication] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!id) return; getApplication(id).then(setApplication).catch((error) => Toast.error(error instanceof Error ? error.message : "Unable to load application.")).finally(() => setLoading(false)); }, [id]);
  if (loading) return <View style={styles.loading}><Stack.Screen options={{ title: "Application" }} /><Skeleton height={180} /><Skeleton height={220} /></View>;
  if (!application) return <View style={styles.loading}><Text>Application not found.</Text></View>;
  const job = record(application.job); const recruiter = record(job.recruiterProfile); const history = Array.isArray(application.statusHistory) ? application.statusHistory : [];
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Stack.Screen options={{ title: "Application Details" }} /><View style={styles.hero}><Text style={styles.eyebrow}>{text(application.status).replaceAll("_", " ")}</Text><Text style={styles.title}>{text(job.title, "Job application")}</Text><Text style={styles.company}>{text(recruiter.companyName, "CampusHire employer")}</Text></View><Text style={styles.section}>Timeline</Text>{history.length ? history.map((entry, index) => { const item = record(entry); return <View key={text(item.id, String(index))} style={styles.timeline}><View style={styles.dot} /><View style={styles.timelineBody}><Text style={styles.status}>{text(item.toStatus).replaceAll("_", " ")}</Text><Text style={styles.note}>{text(item.note, "Status updated")}</Text><Text style={styles.date}>{new Date(text(item.createdAt)).toLocaleString()}</Text></View></View>; }) : <Text style={styles.note}>No status history has been recorded yet.</Text>}</ScrollView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, content: { padding: 18, paddingBottom: 40 }, loading: { flex: 1, backgroundColor: Colors.background, padding: 18, gap: 12 }, hero: { backgroundColor: Colors.primary, borderRadius: 18, padding: 20 }, eyebrow: { color: "#7DD3FC", fontSize: 12, fontWeight: "800" }, title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 8 }, company: { color: "#CBD5E1", marginTop: 5 }, section: { color: Colors.textPrimary, fontSize: 19, fontWeight: "800", marginTop: 24, marginBottom: 14 }, timeline: { flexDirection: "row", gap: 12, marginBottom: 18 }, dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent, marginTop: 4 }, timelineBody: { flex: 1, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 14 }, status: { color: Colors.textPrimary, fontWeight: "800" }, note: { color: Colors.textSecondary, marginTop: 4, lineHeight: 20 }, date: { color: Colors.textTertiary, fontSize: 12, marginTop: 5 } });
