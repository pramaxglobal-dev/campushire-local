import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { JobFilter } from "@/components/jobs/JobFilter";
import { JobCard } from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { useJobs } from "@/lib/hooks/useJobs";
import { saveJob, unsaveJob } from "@/lib/api/jobs.api";

export default function HomeTab() {
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
                onApply={(jobId) => void jobsState.apply(jobId)}
                onToggleSave={(jobId) => void toggleSave(jobId, item.hasSaved)}
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
  }
});
