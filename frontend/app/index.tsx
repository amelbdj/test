import { View, StyleSheet, Image } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/app-image.png")}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0c0c",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
