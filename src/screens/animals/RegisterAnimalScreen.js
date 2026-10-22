import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CheckRow } from '../../components/forms/CheckRow';
import { FormField } from '../../components/forms/FormField';
import { ANIMAL_CATEGORIES, ANIMAL_HEALTH_FLAGS, animalCategoryLabel } from '../../config/animals';
import { ANIMAL_COLOURS, animalColourLabel, readAnimalColours } from '../../config/animalColours';
import { useSession } from '../../context/SessionContext';
import { chooseAnimalPhoto, createAnimalProfile, getAnimalProfile, updateAnimalProfile, uploadAnimalPhotos } from '../../services/animalService';
import { colors, radii, spacing, typography } from '../../theme';

const SEXES = [['female', 'Female'], ['male', 'Male'], ['unknown', 'Unknown']];
const SIZES = [['tiny', 'Tiny'], ['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['giant', 'Giant'], ['unknown', 'Unknown']];
const RELATIONSHIPS = [['my_animal', 'My animal'], ['family_animal', 'Family animal'], ['foster', 'Foster'], ['other', 'Other']];
const IDENTIFIERS = [['tag', 'Tag'], ['band', 'Band'], ['tattoo', 'Tattoo'], ['brand', 'Brand'], ['other', 'Other']];
const BEHAVIOURS = [
  ['friendly', 'Friendly'], ['nervous', 'Nervous'], ['likely_to_run', 'Likely to run'],
  ['may_bite', 'May bite'], ['may_scratch', 'May scratch'], ['may_kick', 'May kick'],
  ['responds_to_name', 'Responds to name']
];
const PHOTO_TYPES = ['face', 'full_body', 'distinctive_feature'];

const initialDraft = {
  category: '', name: '', species: '', breed: '', mixed_breed: false, sex: '',
  approximate_age_years: '', size: '',
  approximate_weight_kg: '', relationship: 'my_animal', primaryColour: '', secondaryColours: [],
  pattern: '', coat_description: '', eye_colour: '', ears_description: '', tail_description: '',
  distinctive_features: '', microchipped: false, microchip_number: '', identifier_type: '',
  identifier_value: '', sterilised: false, private_health_notes: '', veterinary_practice: '',
  ownership_notes: '', healthFlags: [], behaviour: [], approach_guidance: '', photos: []
};

function draftFromAnimal(animal) {
  const privateDetails = animal.animal_private_details ?? {};
  const activeBehaviours = (animal.animal_behaviour_flags ?? []).filter((item) => item.active);
  const activeHealthFlags = (animal.animal_health_flags ?? []).filter((item) => item.active);
  const colours = readAnimalColours(animal.primary_colours, animal.secondary_colours);
  const legacyNote = colours.unknownColours.length ? `Other colour description: ${colours.unknownColours.join(', ')}` : '';
  return {
    ...initialDraft,
    category: animal.category ?? '',
    name: animal.name ?? '',
    species: animal.species ?? '',
    breed: animal.breed ?? '',
    mixed_breed: animal.mixed_breed ?? false,
    sex: animal.sex ?? '',
    approximate_age_years: animal.approximate_age_years?.toString() ?? '',
    size: animal.size ?? '',
    approximate_weight_kg: animal.approximate_weight_kg?.toString() ?? '',
    relationship: animal.relationship ?? 'my_animal',
    primaryColour: colours.primaryColour,
    secondaryColours: colours.secondaryColours,
    pattern: [animal.pattern, legacyNote].filter(Boolean).join(' · '),
    coat_description: animal.coat_description ?? '',
    eye_colour: animal.eye_colour ?? '',
    ears_description: animal.ears_description ?? '',
    tail_description: animal.tail_description ?? '',
    distinctive_features: animal.distinctive_features ?? '',
    microchipped: animal.microchipped ?? false,
    microchip_number: privateDetails.microchip_number ?? '',
    identifier_type: privateDetails.identifier_type ?? '',
    identifier_value: privateDetails.identifier_value ?? '',
    sterilised: animal.sterilised ?? false,
    private_health_notes: privateDetails.private_health_notes ?? '',
    veterinary_practice: privateDetails.veterinary_practice ?? '',
    ownership_notes: privateDetails.ownership_notes ?? '',
    healthFlags: activeHealthFlags.map((item) => ({
      flag_type: item.flag_type,
      description: item.description,
      public_during_incident: item.public_during_incident
    })),
    behaviour: activeBehaviours.map((item) => item.flag_type),
    approach_guidance: activeBehaviours.find((item) => item.description)?.description ?? ''
  };
}

function ChoiceGroup({ options, value, onChange }) {
  return <View style={styles.choices}>{options.map(([optionValue, label, icon]) => (
    <Pressable key={optionValue} accessibilityRole="radio" accessibilityState={{ selected: value === optionValue }} onPress={() => onChange(optionValue)} style={[styles.choice, value === optionValue && styles.choiceSelected]}>
      {icon ? <MaterialCommunityIcons name={icon} size={22} color={value === optionValue ? colors.primaryDark : colors.textSecondary} /> : null}
      <Text style={[styles.choiceText, value === optionValue && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  ))}</View>;
}

function ColourSelector({ selected, onPress, multiple = false, exclude = '' }) {
  return <View style={styles.choices}>{ANIMAL_COLOURS.filter((item) => !multiple || (item.value !== 'unsure' && item.value !== exclude)).map((item) => {
    const active = multiple ? selected.includes(item.value) : selected === item.value;
    return <Pressable key={item.value} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={multiple ? { checked: active } : { selected: active }} onPress={() => onPress(item.value)} style={[styles.choice, active && styles.choiceSelected]}>
      <Text style={[styles.choiceText, active && styles.choiceTextSelected]}>{item.label}</Text>
    </Pressable>;
  })}</View>;
}

export function RegisterAnimalScreen({ navigation, route }) {
  const editingAnimalId = route.params?.animalId;
  const { session } = useSession();
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(editingAnimalId));
  const [loadError, setLoadError] = useState('');
  const [savedAnimalId, setSavedAnimalId] = useState(null);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const updateHealthFlag = (type, changes) => setDraft((current) => ({
    ...current,
    healthFlags: current.healthFlags.map((flag) => flag.flag_type === type ? { ...flag, ...changes } : flag)
  }));

  const toggleHealthFlag = (type) => setDraft((current) => ({
    ...current,
    healthFlags: current.healthFlags.some((flag) => flag.flag_type === type)
      ? current.healthFlags.filter((flag) => flag.flag_type !== type)
      : [...current.healthFlags, { flag_type: type, description: '', public_during_incident: false }]
  }));

  const loadForEdit = useCallback(async () => {
    if (!editingAnimalId) return;
    setLoading(true); setLoadError('');
    try { setDraft(draftFromAnimal(await getAnimalProfile(editingAnimalId))); }
    catch (error) { setLoadError(`Could not load this animal. ${error.message}`); }
    finally { setLoading(false); }
  }, [editingAnimalId]);
  useFocusEffect(useCallback(() => { loadForEdit(); }, [loadForEdit]));

  function validate() {
    const errors = {};
    if (!draft.category) errors.category = 'Choose an animal type.';
    if (!draft.name.trim()) errors.name = 'Enter the animal’s name.';
    if (draft.approximate_age_years && (!/^\d{1,3}$/.test(draft.approximate_age_years) || Number(draft.approximate_age_years) > 100)) {
      errors.approximate_age_years = 'Enter a whole number of years from 0 to 100.';
    }
    if (draft.approximate_weight_kg && (!/^\d{1,4}(\.\d{1,2})?$/.test(draft.approximate_weight_kg) || Number(draft.approximate_weight_kg) <= 0)) {
      errors.approximate_weight_kg = 'Enter a weight greater than 0, with up to two decimal places.';
    }
    for (const flag of draft.healthFlags) {
      if (!flag.description.trim() || flag.description.trim().length > 500) {
        errors[`health_${flag.flag_type}`] = 'Describe this health need in 1 to 500 characters.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function addPhoto() {
    if (draft.photos.length >= 3) return;
    try {
      const uri = await chooseAnimalPhoto();
      if (uri) update('photos', [...draft.photos, { uri, type: PHOTO_TYPES[draft.photos.length] }]);
    } catch (error) { setMessage(`Photo selection failed. ${error.message}`); }
  }

  async function save() {
    if (!savedAnimalId && !validate()) {
      setMessage('Please correct the highlighted fields before saving.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBusy(true); setMessage('');
    let animalId = editingAnimalId ?? savedAnimalId;
    try {
      if (editingAnimalId || !animalId) {
        const payload = {
          ...draft,
          age_estimated_at: draft.approximate_age_years ? new Date().toISOString().slice(0, 10) : null,
          primary_colours: draft.primaryColour ? [draft.primaryColour] : [],
          secondary_colours: draft.secondaryColours,
          health_flags: draft.healthFlags.map((flag) => ({
            flag_type: flag.flag_type,
            description: flag.description.trim(),
            public_during_incident: flag.public_during_incident
          })),
          behaviour_flags: draft.behaviour.map((flag_type) => ({
            flag_type,
            description: draft.approach_guidance || null,
            public_during_incident: true
          }))
        };
        delete payload.photos; delete payload.primaryColour; delete payload.secondaryColours;
        delete payload.healthFlags; delete payload.behaviour; delete payload.approach_guidance;
        if (editingAnimalId) {
          await updateAnimalProfile(editingAnimalId, payload);
          navigation.goBack();
          return;
        }
        animalId = await createAnimalProfile(payload);
        setSavedAnimalId(animalId);
      }
      if (draft.photos.length) await uploadAnimalPhotos(animalId, session.user.id, draft.photos);
      navigation.popTo('MyAnimals');
    } catch (error) {
      setMessage(editingAnimalId
        ? `The changes could not be saved. ${error.message}`
        : animalId
        ? `The animal profile was saved, but its photos are incomplete. ${error.message}`
        : `The animal profile could not be created. ${error.message}`);
    } finally { setBusy(false); }
  }

  if (savedAnimalId) {
    return <ScreenContainer>
      <Text style={styles.title}>Animal profile saved</Text>
      <Text style={styles.subtitle}>The profile is in My Animals. One or more photos still need attention.</Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <View style={styles.actions}><PrimaryButton label={busy ? 'Retrying photo upload…' : 'Retry photo upload'} onPress={busy ? undefined : save} /></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => navigation.popTo('MyAnimals')} style={styles.leaveAction}><Text style={styles.leaveText}>View saved animal</Text></Pressable>
    </ScreenContainer>;
  }

  if (loading) return <ScreenContainer><Text style={styles.help}>Loading animal profile…</Text></ScreenContainer>;
  if (loadError) return <ScreenContainer><Text style={styles.error}>{loadError}</Text><View style={styles.actions}><PrimaryButton label="Try again" onPress={loadForEdit} /></View></ScreenContainer>;

  return (
    <ScreenContainer scrollRef={scrollRef}>
      <Text style={styles.title}>{editingAnimalId ? 'Edit animal profile' : 'Add animal profile'}</Text>
      <Text style={styles.subtitle}>{editingAnimalId ? 'Update the details you know. Photos can be managed on the animal profile.' : 'Add the details you know. You choose what becomes public when reporting an incident.'}</Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Animal type</Text>
        <ChoiceGroup options={ANIMAL_CATEGORIES.map((item) => [item.value, item.label, item.icon])} value={draft.category} onChange={(value) => update('category', value)} />
        {fieldErrors.category ? <Text style={styles.error}>{fieldErrors.category}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <FormField label="Name" value={draft.name} onChangeText={(value) => update('name', value)} autoCapitalize="words" error={fieldErrors.name} />
        {['other', 'unsure'].includes(draft.category) ? <FormField label="Species" value={draft.species} onChangeText={(value) => update('species', value)} /> : null}
        <FormField label="Breed (optional)" value={draft.breed} onChangeText={(value) => update('breed', value)} />
        <CheckRow checked={draft.mixed_breed} onPress={() => update('mixed_breed', !draft.mixed_breed)} label="Mixed breed" />
        <Text style={styles.label}>Sex</Text><ChoiceGroup options={SEXES} value={draft.sex} onChange={(value) => update('sex', value)} />
        <FormField label="Estimated age (optional)" value={draft.approximate_age_years} onChangeText={(value) => update('approximate_age_years', value.replace(/\D/g, ''))} keyboardType="number-pad" suffix="years" error={fieldErrors.approximate_age_years} />
        <Text style={styles.help}>Enter 0 for an animal younger than one year.</Text>
        <Text style={styles.label}>Size</Text><ChoiceGroup options={SIZES} value={draft.size} onChange={(value) => update('size', value)} />
        <FormField label="Estimated weight (optional)" value={draft.approximate_weight_kg} onChangeText={(value) => update('approximate_weight_kg', value.replace(',', '.').replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" suffix="Kg" error={fieldErrors.approximate_weight_kg} />
        <Text style={styles.label}>Relationship</Text><ChoiceGroup options={RELATIONSHIPS} value={draft.relationship} onChange={(value) => update('relationship', value)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.label}>Primary colour</Text>
        <Text style={styles.help}>Choose the main colour. Select Other if the shade is not listed, then describe it under Pattern and markings.</Text>
        <ColourSelector selected={draft.primaryColour} onPress={(value) => setDraft((current) => ({ ...current, primaryColour: value, secondaryColours: value === 'unsure' ? [] : current.secondaryColours.filter((colour) => colour !== value) }))} />
        <Text style={styles.label}>Secondary colours (optional)</Text>
        <ColourSelector multiple selected={draft.secondaryColours} exclude={draft.primaryColour} onPress={(value) => update('secondaryColours', draft.secondaryColours.includes(value) ? draft.secondaryColours.filter((colour) => colour !== value) : [...draft.secondaryColours, value])} />
        <FormField label="Pattern and markings" value={draft.pattern} onChangeText={(value) => update('pattern', value)} />
        <FormField label="Coat, feather or skin description" value={draft.coat_description} onChangeText={(value) => update('coat_description', value)} multiline />
        <FormField label="Eye colour" value={draft.eye_colour} onChangeText={(value) => update('eye_colour', value)} />
        <FormField label="Ears description" value={draft.ears_description} onChangeText={(value) => update('ears_description', value)} />
        <FormField label="Tail description" value={draft.tail_description} onChangeText={(value) => update('tail_description', value)} />
        <FormField label="Distinctive features, scars or old injuries" value={draft.distinctive_features} onChangeText={(value) => update('distinctive_features', value)} multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identification and health</Text>
        <CheckRow checked={draft.microchipped} onPress={() => update('microchipped', !draft.microchipped)} label="Microchipped" />
        {draft.microchipped ? <FormField label="Microchip number (private)" value={draft.microchip_number} onChangeText={(value) => update('microchip_number', value)} secureTextEntry /> : null}
        <Text style={styles.label}>Other identifier (private)</Text><ChoiceGroup options={IDENTIFIERS} value={draft.identifier_type} onChange={(value) => update('identifier_type', value)} />
        {draft.identifier_type ? <FormField label="Identifier value (private)" value={draft.identifier_value} onChangeText={(value) => update('identifier_value', value)} secureTextEntry /> : null}
        <CheckRow checked={draft.sterilised} onPress={() => update('sterilised', !draft.sterilised)} label="Sterilised" />
        <Text style={styles.label}>Health needs (optional)</Text>
        <Text style={styles.help}>Health details stay private. For each need, you can choose whether it may be included in a future public report. You will confirm visibility when reporting an incident.</Text>
        {ANIMAL_HEALTH_FLAGS.map(([type, label]) => {
          const flag = draft.healthFlags.find((item) => item.flag_type === type);
          return <View key={type} style={styles.healthFlag}>
            <CheckRow checked={Boolean(flag)} onPress={() => toggleHealthFlag(type)} label={label} />
            {flag ? <>
              <FormField label={`${label} details`} value={flag.description} onChangeText={(value) => updateHealthFlag(type, { description: value })} multiline error={fieldErrors[`health_${type}`]} />
              <CheckRow checked={flag.public_during_incident} onPress={() => updateHealthFlag(type, { public_during_incident: !flag.public_during_incident })} label="May be included in a future public report" />
            </> : null}
          </View>;
        })}
        <FormField label="Private health notes" value={draft.private_health_notes} onChangeText={(value) => update('private_health_notes', value)} multiline />
        <FormField label="Veterinary practice (private, optional)" value={draft.veterinary_practice} onChangeText={(value) => update('veterinary_practice', value)} />
        <FormField label="Ownership notes (private, optional)" value={draft.ownership_notes} onChangeText={(value) => update('ownership_notes', value)} multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Behaviour</Text>
        {BEHAVIOURS.map(([value, label]) => <CheckRow key={value} checked={draft.behaviour.includes(value)} label={label} onPress={() => update('behaviour', draft.behaviour.includes(value) ? draft.behaviour.filter((item) => item !== value) : [...draft.behaviour, value])} />)}
        <FormField label="Safe approach or handling guidance" value={draft.approach_guidance} onChangeText={(value) => update('approach_guidance', value)} multiline />
      </View>

      {!editingAnimalId ? <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photographs</Text>
        <Text style={styles.help}>Add up to three clear photographs: face or head, full body, and a distinctive feature. Photos are compressed before upload.</Text>
        <View style={styles.photoRow}>{draft.photos.map((photo, index) => <View key={photo.uri} style={styles.photoWrap}><Image source={{ uri: photo.uri }} style={styles.photo} /><Pressable accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => update('photos', draft.photos.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}><MaterialCommunityIcons name="close-circle" size={28} color={colors.error} /></Pressable></View>)}</View>
        {draft.photos.length < 3 ? <PrimaryButton label="Choose a photo" onPress={addPhoto} /> : null}
      </View> : null}

      <View style={styles.review}>
        <Text style={styles.sectionTitle}>Review before saving</Text>
        <Text style={styles.reviewName}>{draft.name}</Text>
        <Text style={styles.help}>{animalCategoryLabel(draft.category)}{draft.breed ? ` · ${draft.breed}` : ''}</Text>
        <ReviewRow icon="palette-outline" label="Appearance" value={[draft.primaryColour ? animalColourLabel(draft.primaryColour) : '', ...draft.secondaryColours.map(animalColourLabel), draft.pattern, draft.distinctive_features].filter(Boolean).join(' · ') || 'Not provided'} />
        <ReviewRow icon="shield-lock-outline" label="Private information" value="Identifiers, health details, veterinary practice and ownership notes remain private." />
        <ReviewRow icon="camera-outline" label="Photographs" value={editingAnimalId ? 'Manage on the animal profile' : `${draft.photos.length} of 3 added`} />
        {!editingAnimalId ? <ReviewRow icon="home-heart" label="Initial status" value="Safe" /> : null}
      </View>

      <View style={styles.actions}><PrimaryButton label={busy ? 'Saving animal…' : editingAnimalId ? 'Save changes' : 'Save animal'} onPress={busy ? undefined : save} /></View>
    </ScreenContainer>
  );
}

function ReviewRow({ icon, label, value }) {
  return <View style={styles.reviewRow}><MaterialCommunityIcons name={icon} size={24} color={colors.primary} /><View style={styles.reviewBody}><Text style={styles.label}>{label}</Text><Text style={styles.help}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  section: { gap: spacing.lg, paddingVertical: spacing.xxl, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  healthFlag: { gap: spacing.sm },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceText: { ...typography.body, color: colors.textSecondary },
  choiceTextSelected: { ...typography.bodyStrong, color: colors.primaryDark },
  help: { ...typography.body, color: colors.textSecondary },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoWrap: { position: 'relative' },
  photo: { width: 92, height: 92, borderRadius: radii.md },
  remove: { position: 'absolute', top: -10, right: -10, backgroundColor: colors.surface, borderRadius: radii.pill },
  review: { gap: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  reviewName: { ...typography.screenTitle, color: colors.textPrimary },
  reviewRow: { flexDirection: 'row', gap: spacing.md },
  reviewBody: { flex: 1, gap: spacing.xs },
  error: { ...typography.body, color: colors.error, marginTop: spacing.lg },
  actions: { marginTop: spacing.xxl },
  leaveAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  leaveText: { ...typography.button, color: colors.primary }
});
