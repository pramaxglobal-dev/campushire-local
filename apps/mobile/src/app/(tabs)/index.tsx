import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserRole } from "@campushire/types";
import { useRouter } from "expo-router";
import { Header } from "@/components/layout/Header";
import { JobFilter } from "@/components/jobs/JobFilter";
import { JobCard } from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { useJobs } from "@/lib/hooks/useJobs";
import { saveJob, unsaveJob } from "@/lib/api/jobs.api";
import { useAuthStore } from "@/lib/store/auth.store";

export default function HomeTab() {
  const user = useAuthStore((state) => state.user);
  if (user && user.role !== UserRole.STUDENT && user.role !== UserRole.JOB_SEEKER) {
    return <RoleLanding firstName={user.firstName} role={user.role} />;
  }
  return <CandidateHome />;
}

function CandidateHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const jobsState = useJobs({ personalized: true, search: debouncedSearch });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const filteredJobs = useMemo(() => {
    if (!debouncedSearch) {
      return jobsState.jobs;
    }
    const needle = debouncedSearch.toLowerCase();
    return jobsState.jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(needle) ||
        job.company.toLowerCase().includes(needle)
    );
  }, [debouncedSearch, jobsState.jobs]);

  const toggleSave = async (jobId: string, hasSaved: boolean) => {
    try {
      if (hasSaved) {
        await unsaveJob(jobId);
        Toast.info("Removed from saved jobs.");
      } else {
        await saveJob(jobId);
        Toast.success("Saved job.");
      }
      await jobsState.refresh();
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to update saved state.");
    }
  };

  const apply = async (jobId: string) => {
    try {
      await jobsState.apply(jobId);
      Toast.success("Application submitted.");
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to apply for this job.");
    }
  };

  return (
    <View style={styles.container}>
      <Header title="CampusHire" subtitle="Personalized opportunities" />
      <View style={styles.content}>
        <JobFilter search={search} onSearchChange={setSearch} />
        {jobsState.loading && jobsState.jobs.length === 0 ? (
          <View style={styles.skeletonList}>
            <Skeleton height={120} />
            <Skeleton height={120} />
            <Skeleton height={120} />
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onApply={(jobId) => void apply(jobId)}
                onToggleSave={(jobId) => void toggleSave(jobId, item.hasSaved)}
                onView={(jobId) => router.push({ pathname: "/jobs/[id]", params: { id: jobId } })}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshControl={
              <RefreshControl
                refreshing={jobsState.refreshing}
                onRefresh={() => void jobsState.refresh()}
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => void jobsState.loadMore()}
            ListEmptyComponent={
              <Text style={styles.empty}>No jobs available right now.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

function RoleLanding({ firstName, role }: { firstName: string; role: UserRole }) {
  const router = useRouter();
  return <View style={styles.container}><Header title={`Welcome, ${firstName}`} subtitle={role.replaceAll("_", " ")} /><View style={styles.roleContent}><View style={styles.heroCard}><Text style={styles.eyebrow}>ROLE WORKSPACE</Text><Text style={styles.heroTitle}>Your operational command center is ready.</Text><Text style={styles.heroBody}>Review live records and take role-authorized actions from the Workspace tab.</Text><TouchableOpacity style={styles.workspaceButton} onPress={() => router.push("/(tabs)/role")}><Text style={styles.workspaceButtonLabel}>Open Workspace</Text></TouchableOpacity></View></View></View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8
  },
  skeletonList: {
    gap: 10
  },
  empty: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: 24
  },
  roleContent: { padding: 16 },
  heroCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 24 },
  eyebrow: { color: "#7DD3FC", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", marginTop: 10 },
  heroBody: { color: "#CBD5E1", fontSize: 15, lineHeight: 22, marginTop: 10 },
  workspaceButton: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 22 },
  workspaceButtonLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 }
});
