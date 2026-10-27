import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SOUTH_AFRICAN_PROVINCES } from '../../config/constants';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../services/supabase';
import { colors, radii, spacing, typography } from '../../theme';
import { deviceAccuracyMessage, suggestGeocodedArea } from '../../utils/geocodedArea';

export function SetHomeAreaScreen() {
  const { privateProfile, refreshProfile } = useSession();
  const [province, setProvince] = useState(privateProfile?.province ?? '');
  const [city, setCity] = useState(privateProfile?.city ?? '');
  const [suburb, setSuburb] = useState(privateProfile?.suburb ?? '');
  const [coords, setCoords] = useState(privateProfile?.latitude ? { latitude: privateProfile.latitude, longitude: privateProfile.longitude } : null);
  const [source, setSource] = useState(privateProfile?.location_source ?? 'manual');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function useLocation() {
    setMessage('Homeward Paws uses your location once to suggest your area. It is optional and remains private.');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return setMessage('Location permission was denied. Enter your area manually below.');
    setBusy(true);
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [address] = await Location.reverseGeocodeAsync(position.coords);
      const area = suggestGeocodedArea(address);
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setProvince(area.province);
      setCity(area.city);
      setSuburb(area.suburb);
      setSource('device');
      setMessage(`${deviceAccuracyMessage(position.coords.accuracy)}${area.suburb ? 'Suggested area added.' : 'The device could not name a suburb.'} Confirm the area before saving.`);
    } catch (error) { setMessage(`We could not determine your area. Enter it manually. ${error.message}`); }
    finally { setBusy(false); }
  }

  function editArea() {
    setCoords(null);
    setSource('manual');
    setMessage('Area edited. The device point was cleared; only the manually entered area will be saved.');
  }

  async function submit() {
    if (!SOUTH_AFRICAN_PROVINCES.includes(province) || !city.trim() || !suburb.trim()) return setMessage('Choose a province and enter your city or town and suburb.');
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('complete_member_profile', {
      home_province: province,
      home_city: city.trim(),
      home_suburb: suburb.trim(),
      home_latitude: coords?.latitude ?? null,
      home_longitude: coords?.longitude ?? null,
      home_location_source: source
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    await refreshProfile();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Set your home area</Text>
      <Text style={styles.subtitle}>This helps prioritize nearby reports. Your home coordinates are never public.</Text>
      <View style={styles.form}>
        <PrimaryButton label={busy ? 'Finding area…' : 'Use my location (optional)'} onPress={busy ? undefined : useLocation} />
        <Text style={styles.label}>Province</Text>
        <View style={styles.provinces}>{SOUTH_AFRICAN_PROVINCES.map((item) => <Pressable key={item} onPress={() => { setProvince(item); editArea(); }} style={[styles.chip, item === province && styles.chipSelected]}><Text style={[styles.chipText, item === province && styles.chipTextSelected]}>{item}</Text></Pressable>)}</View>
        <FormField label="City or town" value={city} onChangeText={(value) => { setCity(value); editArea(); }} />
        <FormField label="Suburb" value={suburb} onChangeText={(value) => { setSuburb(value); editArea(); }} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Finish profile'} onPress={busy ? undefined : submit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  form: { gap: spacing.lg }, label: { ...typography.bodyStrong, color: colors.textPrimary },
  provinces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  chipSelected: { backgroundColor: colors.primaryLight },
  chipText: { ...typography.caption, color: colors.textSecondary }, chipTextSelected: { color: colors.primaryDark },
  message: { ...typography.body, color: colors.textSecondary }
});
