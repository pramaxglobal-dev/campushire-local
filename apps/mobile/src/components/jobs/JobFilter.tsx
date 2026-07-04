import { StyleSheet, Text, View } from "react-native";
import { Input } from "@/components/ui/Input";

interface JobFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function JobFilter({ search, onSearchChange }: JobFilterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Jobs</Text>
      <Input
        label="Role or company"
        value={search}
        onChangeText={onSearchChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: "700"
  }
});
