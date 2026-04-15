import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAccessibility } from '../../components/AccessibilityContext';
import { auth, db } from '../../firebaseConfig';

// Import accessibility icons
// Remove the import lines and use require inside the component
const gestureIcon = require('../../assets/images/gesture.png');
const voiceIcon = require('../../assets/images/voice.png');
const largeTextIcon = require('../../assets/images/large-text.png');
const locationIcon = require('../../assets/images/location.png');

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface InputMode {
  id: string;
  label: string;
  icon: string;
  image: any;
  enabled: boolean;
}

// Generate initials from full name (e.g. "Turner Undo" → "TU")
const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Deterministic pastel color per name
const AVATAR_COLORS = [
  { bg: '#E8EAFF', text: '#4A5CF5' },
  { bg: '#FFE8E8', text: '#D62828' },
  { bg: '#E8F8EE', text: '#1A8A3E' },
  { bg: '#FFF3E0', text: '#E07B00' },
  { bg: '#F3E8FF', text: '#7B2FBE' },
  { bg: '#E0F7FA', text: '#00838F' },
];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [displayMode, setDisplayMode] = useState('Light');
  const [largeTextEnabled, setLargeTextEnabled] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  // Use global accessibility context
  const { inputModes, setInputModes, textSizeMultiplier, setTextSizeMultiplier } = useAccessibility();

  // Attach correct image icons to each input mode
  const inputModesWithIcons = inputModes.map(mode => {
    let image;
    switch (mode.id) {
      case 'gesture':
        image = gestureIcon;
        break;
      case 'voice':
        image = voiceIcon;
        break;
      case 'largeText':
        image = largeTextIcon;
        break;
      case 'location':
        image = locationIcon;
        break;
      default:
        image = null;
    }
    return { ...mode, image };
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Austin Arthur', phone: '+44999999999', relation: 'Brother' },
    { id: '2', name: 'Lawrence', phone: '+44999999999', relation: 'Friend' },
    { id: '3', name: 'Louis Mason', phone: '+44999999999', relation: 'Cousin' },
  ]);

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContactForCall, setSelectedContactForCall] = useState<EmergencyContact | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  useEffect(() => {
    loadUserData();
    loadEmergencyContacts();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email || '');
      const displayName = user.displayName || '';
      setUsername(displayName);
      setEditName(displayName);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.notificationsEnabled !== undefined) setNotificationsEnabled(data.notificationsEnabled);
        if (data.displayMode) setDisplayMode(data.displayMode);
        if (data.largeTextEnabled !== undefined) setLargeTextEnabled(data.largeTextEnabled);
        // inputModes and textSizeMultiplier are now loaded by AccessibilityContext
      }
    }
  };

  const loadEmergencyContacts = async () => {
    const user = auth.currentUser;
    if (user) {
      const contactsDoc = await getDoc(doc(db, 'emergencyContacts', user.uid));
      if (contactsDoc.exists()) {
        setEmergencyContacts(contactsDoc.data().contacts || []);
      }
    }
  };

  const saveEmergencyContacts = async (contacts: EmergencyContact[]) => {
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'emergencyContacts', user.uid), { contacts });
    }
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      if (editName !== username) {
        await updateProfile(user, { displayName: editName });
        setUsername(editName);
      }
      // inputModes and textSizeMultiplier are auto-saved by AccessibilityContext
      await setDoc(doc(db, 'users', user.uid), {
        notificationsEnabled,
        displayMode,
        largeTextEnabled,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }
      }
    ]);
  };

  const toggleInputMode = (id: string) => {
    const updated = inputModes.map(mode =>
      mode.id === id ? { ...mode, enabled: !mode.enabled } : mode
    );
    setInputModes(updated);
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }
    const updatedContacts = [
      ...emergencyContacts,
      {
        id: Date.now().toString(),
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        relation: newContact.relation.trim() || 'Contact'
      }
    ];
    setEmergencyContacts(updatedContacts);
    await saveEmergencyContacts(updatedContacts);
    setNewContact({ name: '', phone: '', relation: '' });
    setShowAddContact(false);
    Alert.alert('Success', 'Emergency contact added');
  };

  const updateEmergencyContact = async () => {
    if (!editingContact) return;
    if (!editingContact.name || !editingContact.phone) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }
    const updatedContacts = emergencyContacts.map(c =>
      c.id === editingContact.id ? editingContact : c
    );
    setEmergencyContacts(updatedContacts);
    await saveEmergencyContacts(updatedContacts);
    setShowEditModal(false);
    setEditingContact(null);
    Alert.alert('Success', 'Contact updated');
  };

  const deleteEmergencyContact = (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedContacts = emergencyContacts.filter(c => c.id !== id);
          setEmergencyContacts(updatedContacts);
          await saveEmergencyContacts(updatedContacts);
        }
      }
    ]);
  };

  const renderContactItem = ({ item }: { item: EmergencyContact }) => {
    const displayName = item?.name || 'Unknown';
    const initials = getInitials(displayName);
    const colors = getAvatarColor(displayName);

    return (
      <TouchableOpacity
        style={styles.contactItem}
        activeOpacity={0.6}
        onPress={() => {
          setSelectedContactForCall(item);
          setShowCallModal(true);
        }}
      >
        <View style={[styles.contactAvatar, { backgroundColor: colors.bg }]}>
          <Text style={[styles.contactAvatarText, { color: colors.text }]}>{initials}</Text>
        </View>

        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{displayName}</Text>
          <View style={styles.contactMeta}>
            <Text style={styles.contactRelation}>{item?.relation || 'Contact'}</Text>
            <Text style={styles.contactPhone}>{item.phone}</Text>
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={22} color="#C6C6C8" />
      </TouchableOpacity>
    );
  };

  const renderInputModeItem = ({ item }: { item: InputMode }) => (
    <View style={styles.inputModeItem}>
      <View style={styles.inputModeLeft}>
        <View style={styles.inputModeIcon}>
          {item.image && (
            <Image
              source={item.image}
              style={[styles.inputModeIconImage, { tintColor: item.enabled ? '#D62828' : '#C6C6C8' }]}
            />
          )}
        </View>
        <Text style={[styles.inputModeLabel, { color: item.enabled ? '#0D0D0D' : '#8E8E93' }]}>
          {item.label}
        </Text>
      </View>
      <Switch
        value={item.enabled}
        onValueChange={() => {
          if (item.id === 'largeText') {
            setShowTextSizeModal(true);
          } else {
            toggleInputMode(item.id);
          }
        }}
        trackColor={{ false: '#D1D1D6', true: 'rgba(214, 40, 40, 0.3)' }}
        thumbColor={item.enabled ? '#D62828' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(username).bg }]}>
              <Text style={[styles.avatarText, { color: getAvatarColor(username).text }]}>
                {username ? getInitials(username) : 'U'}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.username}>{username || 'User'}</Text>
            )}
            <Text style={styles.email}>{email}</Text>
          </View>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProfile} style={styles.saveEditBtn} disabled={loading}>
                <Text style={styles.saveEditText}>{loading ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.emergencySection}>
        <View style={styles.emergencyTitleRow}>
          <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
          <TouchableOpacity onPress={() => setShowAddContact(!showAddContact)} style={styles.addButton}>
            <Ionicons name="add-circle" size={22} color="#D62828" />
            <Text style={styles.addContactButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emergencySubtitle}>Tap a contact to call or edit</Text>

        {/* Add Contact Form */}
        {showAddContact && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.addContactInput}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={newContact.name}
              onChangeText={(t) => setNewContact({ ...newContact, name: t })}
            />
            <TextInput
              style={styles.addContactInput}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={newContact.phone}
              onChangeText={(t) => setNewContact({ ...newContact, phone: t })}
            />
            <TextInput
              style={styles.addContactInput}
              placeholder="Relationship (e.g. Brother)"
              placeholderTextColor="#999"
              value={newContact.relation}
              onChangeText={(t) => setNewContact({ ...newContact, relation: t })}
            />
            <View style={styles.addContactButtons}>
              <TouchableOpacity
                style={styles.cancelAddButton}
                onPress={() => { setShowAddContact(false); setNewContact({ name: '', phone: '', relation: '' }); }}
              >
                <Text style={styles.cancelAddText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAddButton} onPress={addEmergencyContact}>
                <Text style={styles.saveAddText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Contacts List */}
        {emergencyContacts.length > 0 ? (
          <FlatList
            data={emergencyContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.contactsList}
          />
        ) : (
          <View style={styles.emptyContacts}>
            <Ionicons name="people-outline" size={44} color="#CCC" />
            <Text style={styles.emptyContactsText}>No emergency contacts</Text>
            <Text style={styles.emptyContactsSubtext}>Tap + Add to add your first contact</Text>
          </View>
        )}
      </View>

      {/* Accessibility Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Accessibility</Text>
      </View>

      <View style={styles.inputModesContainer}>
        <FlatList
          data={inputModesWithIcons}
          renderItem={renderInputModeItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Text Size Modal with Slider */}
      <Modal visible={showTextSizeModal} transparent animationType="fade">
        <View style={styles.textSizeModalOverlay}>
          <View style={styles.textSizeModalContent}>
            <View style={styles.textSizeModalHeader}>
              <Text style={styles.textSizeModalTitle}>Text Size</Text>
              <TouchableOpacity onPress={() => setShowTextSizeModal(false)}>
                <Ionicons name="close" size={24} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <View style={styles.sliderLabelRow}>
              <Text style={styles.sliderLabelText}>XS</Text>
              <Text style={styles.sliderLabelText}>Small</Text>
              <Text style={styles.sliderLabelText}>Normal</Text>
              <Text style={styles.sliderLabelText}>Larger</Text>
              <Text style={styles.sliderLabelText}>XL</Text>
            </View>

            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={4}
                value={Math.round((textSizeMultiplier - 0.8) / 0.125)}
                onValueChange={(value: number) => {
                  const multiplier = 0.8 + value * 0.125;
                  setTextSizeMultiplier(multiplier);
                  setLargeTextEnabled(multiplier > 1);
                }}
                step={1}
                minimumTrackTintColor="#D62828"
                maximumTrackTintColor="#E5E5EA"
                thumbTintColor="#D62828"
              />
            </View>

            <View style={styles.previewText}>
              <Text style={[styles.previewLabel, { fontSize: 14 * textSizeMultiplier }]}>
                Preview Text
              </Text>
            </View>

            <TouchableOpacity
              style={styles.textSizeCloseBtn}
              onPress={() => setShowTextSizeModal(false)}
            >
              <Text style={styles.textSizeCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emergency Call Modal */}
      <Modal visible={showCallModal} transparent animationType="slide">
        <View style={styles.callModalOverlay}>
          <View style={styles.callModalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.callModalClose}
              onPress={() => setShowCallModal(false)}
            >
              <Ionicons name="close" size={24} color="#0D0D0D" />
            </TouchableOpacity>

            {/* Contact Avatar - Large */}
            {selectedContactForCall && (
              <>
                <View style={styles.callModalAvatarContainer}>
                  <View
                    style={[
                      styles.callModalAvatar,
                      { backgroundColor: getAvatarColor(selectedContactForCall.name).bg }
                    ]}
                  >
                    <Text
                      style={[
                        styles.callModalAvatarText,
                        { color: getAvatarColor(selectedContactForCall.name).text }
                      ]}
                    >
                      {getInitials(selectedContactForCall.name)}
                    </Text>
                  </View>
                </View>

                {/* Contact Info */}
                <Text style={styles.callModalName}>{selectedContactForCall.name}</Text>
                <Text style={styles.callModalRelation}>
                  {selectedContactForCall.relation || 'Contact'}
                </Text>

                {/* Phone Number Display */}
                <View style={styles.callModalPhoneBox}>
                  <Text style={styles.callModalPhoneLabel}>Phone</Text>
                  <Text style={styles.callModalPhoneNumber}>{selectedContactForCall.phone}</Text>
                </View>

                {/* Main Call Button */}
                <TouchableOpacity
                  style={styles.emergencyCallButton}
                  onPress={async () => {
                    if (!selectedContactForCall?.phone) {
                      Alert.alert('Error', 'No phone number available.');
                      return;
                    }
                    // Remove any non-dialable characters (keep digits, '+')
                    const phone = selectedContactForCall.phone.replace(/[^0-9+]/g, '');
                    const url = `tel:${phone}`;
                    try {
                      const supported = await Linking.canOpenURL(url);
                      if (supported) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert('Unsupported', 'This device cannot make phone calls.');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Could not open the phone dialer.');
                    }
                    setShowCallModal(false);
                  }}
                >
                  <Ionicons name="call" size={32} color="#FFF" />
                  <Text style={styles.emergencyCallButtonText}>Call Now</Text>
                </TouchableOpacity>
                {/* Edit Button */}
                <TouchableOpacity
                  style={styles.callModalEditButton}
                  onPress={() => {
                    setEditingContact(selectedContactForCall);
                    setShowCallModal(false);
                    setShowEditModal(true);
                  }}
                >
                  <Ionicons name="pencil-outline" size={18} color="#D62828" />
                  <Text style={styles.callModalEditButtonText}>Edit Contact</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Contact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={editingContact?.name}
              onChangeText={(t) => setEditingContact(prev => prev ? { ...prev, name: t } : null)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={editingContact?.phone}
              onChangeText={(t) => setEditingContact(prev => prev ? { ...prev, phone: t } : null)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Relationship"
              placeholderTextColor="#999"
              value={editingContact?.relation}
              onChangeText={(t) => setEditingContact(prev => prev ? { ...prev, relation: t } : null)}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={() => {
                  setShowEditModal(false);
                  if (editingContact) deleteEmergencyContact(editingContact.id);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#D62828" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={updateEmergencyContact}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  // Header
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#F7F7F7' },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#0D0D0D' },

  // Profile card
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1 },
  username: { fontSize: 18, fontWeight: '700', color: '#0D0D0D', marginBottom: 3 },
  email: { fontSize: 13, color: '#8E8E93' },
  editInput: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
    borderBottomWidth: 1.5,
    borderBottomColor: '#D62828',
    paddingVertical: 3,
    marginBottom: 4,
  },
  editButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D62828' },
  editButtonText: { fontSize: 13, color: '#D62828', fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelEditBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0F0F0', borderRadius: 8 },
  cancelEditText: { fontSize: 13, color: '#666', fontWeight: '500' },
  saveEditBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#D62828', borderRadius: 8 },
  saveEditText: { fontSize: 13, color: '#FFF', fontWeight: '500' },

  // Section Header
  sectionHeader: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 12,
    backgroundColor: '#F7F7F7',
  },
  sectionLabelRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D0D',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // Input Modes Section
  inputModesContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputModeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inputModeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputModeIconImage: {
    width: 22,
    height: 22,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  inputModeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0D',
  },

  // Emergency contacts section
  emergencySection: { marginHorizontal: 16, marginBottom: 20 },
  emergencyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  emergencyTitle: { fontSize: 16, fontWeight: '800', color: '#0D0D0D', letterSpacing: 0.3 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addContactButtonText: { fontSize: 14, fontWeight: '600', color: '#D62828' },
  emergencySubtitle: { fontSize: 12, color: '#8E8E93', marginBottom: 14 },

  // Add contact form
  addContactForm: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addContactInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  addContactButtons: { flexDirection: 'row', gap: 10 },
  cancelAddButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelAddText: { color: '#8E8E93', fontWeight: '600' },
  saveAddButton: {
    flex: 1,
    backgroundColor: '#D62828',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveAddText: { color: '#FFF', fontWeight: '600' },

  // Contact list
  contactsList: { marginTop: 2 },

  // Contact row
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contactDetails: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#0D0D0D', marginBottom: 4 },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactRelation: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contactPhone: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Empty state
  emptyContacts: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptyContactsText: { fontSize: 15, fontWeight: '500', color: '#8E8E93', marginTop: 10 },
  emptyContactsSubtext: { fontSize: 13, color: '#C6C6C8', marginTop: 4 },

  // Preferences
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 1,
    borderRadius: 12,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemLabel: { fontSize: 16, color: '#0D0D0D' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuItemValue: { fontSize: 14, color: '#8E8E93', marginRight: 4 },

  // Logout
  logoutSection: { marginTop: 32, marginBottom: 44, alignItems: 'center', paddingHorizontal: 20 },
  logoutButton: {
    backgroundColor: '#D62828',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    width: '88%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
  modalDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFDADA',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: { color: '#8E8E93', fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#D62828',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: { color: '#FFF', fontWeight: '600' },

  // Emergency Call Modal
  callModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  callModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
    minHeight: '70%',
    alignItems: 'center',
  },
  callModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  callModalAvatarContainer: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  callModalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  callModalAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 1,
  },
  callModalName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 4,
    textAlign: 'center',
  },
  callModalRelation: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  callModalPhoneBox: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  callModalPhoneLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  callModalPhoneNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0D0D0D',
    letterSpacing: 0.3,
  },
  emergencyCallButton: {
    backgroundColor: '#34C759',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyCallButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  callModalEditButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#D62828',
    backgroundColor: '#FFF',
  },
  callModalEditButtonText: {
    color: '#D62828',
    fontSize: 16,
    fontWeight: '600',
  },

  // Text Size Modal
  textSizeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSizeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  textSizeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  textSizeModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D0D0D',
    letterSpacing: 0.3,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sliderWrapper: {
    marginBottom: 20,
    marginHorizontal: -8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  previewText: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontWeight: '600',
    color: '#0D0D0D',
  },
  textSizeCloseBtn: {
    backgroundColor: '#D62828',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  textSizeCloseBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});