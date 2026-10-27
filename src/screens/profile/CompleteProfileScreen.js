import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { CheckRow } from '../../components/forms/CheckRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { chooseAndUploadAvatar } from '../../services/avatarService';
import { supabase } from '../../services/supabase';
import { colors, radii, spacing, typography } from '../../theme';
import { normalizeSouthAfricanMobile } from '../../utils/validation';

export function CompleteProfileScreen({ navigation }) {
  const { session, profile, privateProfile, refreshProfile } = useSession();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [mobile, setMobile] = useState(privateProfile?.mobile_e164 ?? '');
  const [whatsapp, setWhatsapp] = useState(privateProfile?.whatsapp_enabled ?? false);
  const [avatarPath, setAvatarPath] = useState(profile?.avatar_path ?? null);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function selectAvatar() {
    try {
      setBusy(true); setMessage('');
      const path = await chooseAndUploadAvatar(session.user.id);
      if (path) { setAvatarPath(path); setAvatarRevision((value) => value + 1); }
    } catch (error) { setMessage(`Photo upload failed. Your other details are unchanged. ${error.message}`); }
    finally { setBusy(false); }
  }

  async function submit() {
    const normalized = normalizeSouthAfricanMobile(mobile);
    if (!firstName.trim() || !lastName.trim()) return setMessage('First and last name are required.');
    if (!normalized) return setMessage('Enter a valid South African mobile number.');
    setBusy(true); setMessage('');
    const { error: publicError } = await supabase.from('profiles').update({
      first_name: firstName.trim(), last_name: lastName.trim(),
      display_name: displayName.trim() || firstName.trim(), avatar_path: avatarPath
    }).eq('id', session.user.id);
    const { error: privateError } = await supabase.from('profile_private').update({
      mobile_e164: normalized, whatsapp_enabled: whatsapp
    }).eq('user_id', session.user.id);
    setBusy(false);
    if (publicError || privateError) return setMessage((publicError || privateError).message);
    await refreshProfile();
    if (profile?.profile_completed) navigation.goBack();
    else navigation.navigate('SetHomeArea');
  }

  const avatarUrl = avatarPath ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl : null;
  return (
    <ScreenContainer>
      <Text style={styles.title}>Complete your profile</Text>
      <Text style={styles.subtitle}>Your contact and home area stay private unless you enable contact on a future report.</Text>
      <View style={styles.form}>
        {avatarUrl ? <Image source={{ uri: `${avatarUrl}?v=${avatarRevision}` }} style={styles.avatar} /> : null}
        <PrimaryButton label={avatarPath ? 'Change profile photo' : 'Add profile photo (optional)'} onPress={busy ? undefined : selectAvatar} />
        <FormField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <FormField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <FormField label="Public display name (optional)" value={displayName} onChangeText={setDisplayName} />
        <FormField label="South African mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="082 123 4567" />
        <CheckRow checked={whatsapp} onPress={() => setWhatsapp(!whatsapp)} label="This number can receive WhatsApp messages" />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Continue'} onPress={busy ? undefined : submit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: radii.pill, alignSelf: 'center' },
  error: { ...typography.body, color: colors.error }
});
