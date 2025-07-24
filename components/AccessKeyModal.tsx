// components/AccessKeyModal.tsx
import React, { useState } from 'react';
import { Modal, View, TextInput, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type Props = {
  visible: boolean;
  initialValue: string | null;
  onClose: () => void;
  onSave: (val: string) => Promise<void> | void;
};

export default function AccessKeyModal({ visible, initialValue, onClose, onSave }: Props) {
  const [val, setVal] = useState(initialValue ?? '');

  const handleSave = async () => {
    await onSave(val.trim());
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.card}>
          <ThemedText type="title" style={{ marginBottom: 16 }}>
            Enter Access Key
          </ThemedText>

          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder="sk_live_..."
            placeholderTextColor="#64748b"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={onClose}>
              <ThemedText style={styles.btnText}>Cancel</ThemedText>
            </Pressable>
            <Pressable style={[styles.btn, styles.save]} onPress={handleSave}>
              <ThemedText style={styles.btnText}>Save</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#1e293b',
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  cancel: { backgroundColor: '#475569' },
  save: { backgroundColor: '#4f46e5' },
  btnText: { color: '#fff', fontWeight: '600' },
});
