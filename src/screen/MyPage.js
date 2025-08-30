import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function MyPage() {
  return (
    <View style={styles.container}>
        <Text style={styles.title}>MyPage</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
