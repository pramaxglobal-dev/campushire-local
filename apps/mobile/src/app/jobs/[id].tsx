import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { applyToJob } from "@/lib/api/applications.api";
import { getJob, type JobDetail } from "@/lib/api/jobs.api";

export default function MobileJobDetail() {
  const { id } = useLocalSearchParams() as { id: string };
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!id) return; getJob(id).then(setJob).catch((error) => Toast.error(error instanceof Error ? error.message : "Unable to load job.")).finally(() => setLoading(false)); }, [id]);
  const submit = async (): Promise<void> => {
    if (!job) return;
    const missing = job.screeningQuestions.find((question) => question.isRequired && !answers[question.question]?.trim());
    if (missing) { Toast.error(`Answer required: ${missing.question}`); return; }
    setSubmitting(true);
    try { await applyToJob(job.id, { coverNote: coverNote.trim() || undefined, answers }); Toast.success("Application submitted."); router.back(); }
    catch (error) { Toast.error(error instanceof Error ? error.message : "Unable to apply."); }
    finally { setSubmitting(false); }
  };
  if (loading) return <View style={styles.loading}><Stack.Screen options={{ title: "Job Details" }} /><Skeleton height={180} /><Skeleton height={260} /></View>;
  if (!job) return <View style={styles.loading}><Text>Job not found.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Stack.Screen options={{ title: job.title }} /><Text style={styles.company}>{job.company}</Text><Text style={styles.title}>{job.title}</Text><View style={styles.badges}><Badge label={job.workMode} variant="info" /><Badge label={job.jobType} /></View><Text style={styles.meta}>{job.location ?? "Location not specified"} · {job.salaryRange ?? "Compensation disclosed during process"}</Text><Text style={styles.section}>About the role</Text><Text style={styles.body}>{job.description}</Text><Text style={styles.section}>Application</Text><TextInput style={[styles.input, styles.multiline]} multiline placeholder="Cover note (optional)" value={coverNote} onChangeText={setCoverNote} />{job.screeningQuestions.map((question) => <View key={question.question}><Text style={styles.label}>{question.question}{question.isRequired ? " *" : ""}</Text><TextInput style={styles.input} value={answers[question.question] ?? ""} onChangeText={(value) => setAnswers((current) => ({ ...current, [question.question]: value }))} /></View>)}<Button label={job.hasApplied ? "Already Applied" : "Submit Application"} onPress={() => void submit()} loading={submitting} disabled={job.hasApplied} /></ScrollView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, content: { padding: 18, gap: 12, paddingBottom: 40 }, loading: { flex: 1, backgroundColor: Colors.background, padding: 18, gap: 12 }, company: { color: Colors.accent, fontWeight: "800", fontSize: 14 }, title: { color: Colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: "800" }, badges: { flexDirection: "row", gap: 8 }, meta: { color: Colors.textSecondary, lineHeight: 21 }, section: { color: Colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 10 }, body: { color: Colors.textSecondary, lineHeight: 23 }, label: { color: Colors.textPrimary, fontWeight: "700", marginBottom: 6 }, input: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 11, padding: 12, color: Colors.textPrimary }, multiline: { minHeight: 100, textAlignVertical: "top" } });
