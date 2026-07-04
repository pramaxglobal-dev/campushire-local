import { useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ApplicationStatus } from "@campushire/types";
import { Header } from "@/components/layout/Header";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { getMyApplications, type ApplicationCard as AppCard } from "@/lib/api/applications.api";

const statusTabs: Array<{ label: string; value?: ApplicationStatus }> = [
  { label: "All" },
  { label: "Applied", value: ApplicationStatus.APPLIED },
  { label: "Screening", value: ApplicationStatus.SCREENING },
  { label: "Shortlisted", value: ApplicationStatus.SHORTLISTED },
  { label: "Interview", value: ApplicationStatus.INTERVIEW_R1 },
  { label: "Offered", value: ApplicationStatus.OFFERED },
  { label: "Rejected", value: ApplicationStatus.REJECTED }
];

export default function ApplicationsTab() {
  const [status, setStatus] = useState<ApplicationStatus | undefined>(undefined);
  const [items, setItems] = useState<AppCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await getMyApplications(1, 50, status);
      setItems(response.data);
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [status]);

  const refresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="My Applications" subtitle="Track your pipeline" />
      <ScrollView horizontal style={styles.tabsRow} showsHorizontalScrollIndicator={false}>
        {statusTabs.map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, status === tab.value ? styles.activeTab : null]}
            onPress={() => setStatus(tab.value)}
          >
            <Text style={[styles.tabLabel, status === tab.value ? styles.activeTabLabel : null]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={90} />
          <Skeleton height={90} />
          <Skeleton height={90} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ApplicationCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={styles.empty}>No applications for this filter.</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  tabsRow: {
    maxHeight: 50,
    paddingHorizontal: 12
  },
  tab: {
    marginTop: 8,
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border
  },
  activeTab: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent
  },
  tabLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600"
  },
  activeTabLabel: {
    color: "#FFFFFF"
  },
  skeletonWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  empty: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.textSecondary
  }
});
