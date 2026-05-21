import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

function App() {
  const translateY = useRef(new Animated.Value(0)).current;
  const [clearTransform, setClearTransform] = useState(false);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Fabric transform override repro</Text>
      <Text style={styles.description}>
        Press Start native transform, then Clear transform. This sends a props
        update that removes transform after a native-driver transform has been
        applied to the same tag.
      </Text>

      <Animated.View
        style={
          clearTransform
            ? styles.box
            : [styles.box, { transform: [{ translateY }] }]
        }
      />

      <View style={styles.actions}>
        <ReproButton
          label="Start native transform"
          onPress={() => {
            setClearTransform(false);
            translateY.setValue(0);
            Animated.spring(translateY, {
              toValue: 120,
              useNativeDriver: true,
            }).start();
          }}
        />
        <ReproButton
          label="Clear transform"
          onPress={() => setClearTransform(true)}
        />
      </View>
    </View>
  );
}

function ReproButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  title: {
    color: '#191f28',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#4e5968',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  box: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#3182f6',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#191f28',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default App;
