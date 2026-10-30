import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { MISSING_PUBLICATION_ENABLED } from '../../config/checkpoint3';
import { useSession } from '../../context/SessionContext';
import { getAnimalReportAppearance } from '../../services/animalService';
import { getMissingDraft, getMissingDraftReadiness, publishMissingReport, stageMissingReportPhotos } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { buildMissingPublicPreview, missingReviewIssues, missingReviewStatus, selectedMissingPhotos } from '../../utils/missingPreview';

const STEPS = {
  appearance: ['Current appearance', 'MissingAppearance'],
  last_seen: ['Last-seen details', 'MissingLastSeen'],
  last_seen_location: ['Last-seen location', 'MissingLastSeenLocation'],
  safety_contact: ['Safety and contact', 'MissingSafetyContact']
};

const CONFIRMATIONS = [
  'The animal, last-seen facts and safety advice are accurate to the best of my knowledge.',
  'I have checked the proposed public location, photos and notes for private information.',
  'I will update or close the report when I learn more or the animal is found.'
];

function PreviewCard({ title, children }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}

function Detail({ label, value }) {
  if (!value) return null;
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

export function MissingPreviewScreen({ navigation, route }) {
  const { animalId, reportId } = route.params;
  const { profile, privateProfile, session } = useSession();
  const [animal, setAnimal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readinessIssues, setReadinessIssues] = useState(null);
  const [readinessError, setReadinessError] = useState('');
  const [confirmed, setConfirmed] = useState([false, false, false]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const requestSequence = useRef(0);
  const publishingRef = useRef(false);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError('');
    setReadinessIssues(null);
    setReadinessError('');
    setPublishError('');
    try {
      const [animalRow, draftRow] = await Promise.all([getAnimalReportAppearance(animalId), getMissingDraft(reportId)]);
      if (sequence !== requestSequence.current) return;
      if (draftRow.animal_id !== animalId) throw new Error('This draft does not belong to the selected animal.');
      setAnimal(animalRow);
      setDraft(draftRow);
      setConfirmed([false, false, false]);
      try {
        const serverIssues = await getMissingDraftReadiness(reportId);
        if (sequence === requestSequence.current) setReadinessIssues(serverIssues);
      } catch {
        if (sequence === requestSequence.current) {
          setReadinessError('We could not verify this draft with the server. Check your connection and try again. Nothing has been published.');
        }
      }
    } catch (loadError) {
      if (sequence !== requestSequence.current) return;
      setAnimal(null);
      setDraft(null);
      setError(`We couldn't load this private review. Check your connection and try again. ${loadError.message}`);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [animalId, reportId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestSequence.current += 1; };
  }, [load]));

  async function publish() {
    if (!MISSING_PUBLICATION_ENABLED || publishingRef.current || !animal || !draft || !session?.user?.id) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublishError('');
    try {
      const currentIssues = await getMissingDraftReadiness(reportId);
      if (currentIssues.length) {
        setReadinessIssues(currentIssues);
        setConfirmed([false, false, false]);
        throw new Error('Some details changed. Review the steps shown above, then confirm again.');
      }
      await stageMissingReportPhotos({
        animalId,
        reportId,
        userId: session.user.id,
        photos: selectedMissingPhotos(animal, draft.draft_payload?.appearance)
      });
      const reference = await publishMissingReport(reportId);
      navigation.reset({
        index: 1,
        routes: [{ name: 'ReportMenu' }, { name: 'MissingPublished', params: { reportId, reference } }]
      });
    } catch (publishFailure) {
      setPublishError(`We could not confirm publication. Check Browse or My Reports before trying again. ${publishFailure.message}`);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Preparing your private review…</Text></ScreenContainer>;
  if (!animal || !draft) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error || 'This draft is unavailable.'}</Text><PrimaryButton label="Try again" onPress={load} /><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.textButton}><Text style={styles.link}>Back to safety and contact</Text></Pressable></View></ScreenContainer>;

  const { issues, canConfirm, reviewReady } = missingReviewStatus(
    missingReviewIssues({ animal, draft, privateProfile }), readinessIssues, confirmed
  );
  const preview = buildMissingPublicPreview({ animal, draft, profile, privateProfile });
  const previewPhotos = selectedMissingPhotos(animal, draft.draft_payload?.appearance);
  const animalDescription = [animalCategoryLabel(preview.animal.category), preview.animal.breed, preview.animal.pattern, preview.animal.coat, preview.animal.features].filter(Boolean).join(' · ');
  const contactDescription = 'Private in-app sighting';

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>PRIVATE MISSING-REPORT DRAFT · STEP 6</Text>
      <Text style={styles.title}>Review before publishing</Text>
      <Text style={styles.subtitle}>This is a proposed public view for you to check. It is not published, and no one else can see this draft.</Text>

      {readinessError ? (
        <View style={styles.issueCard}>
          <Text style={styles.issueTitle}>Server check unavailable</Text>
          <Text style={styles.message}>{readinessError}</Text>
          <PrimaryButton label="Try again" onPress={load} />
        </View>
      ) : null}

      {issues.length ? (
        <View style={styles.issueCard}>
          <Text style={styles.issueTitle}>These steps need attention</Text>
          <Text style={styles.message}>Complete or recheck them before the report can be published.</Text>
          {issues.map((issue) => {
            const step = STEPS[issue];
            if (!step) return <Text key={issue} style={styles.message}>The server flagged another detail for review. Please try again or contact support.</Text>;
            const [label, screen] = step;
            return <Pressable key={issue} accessibilityRole="button" onPress={() => navigation.navigate(screen, { animalId, reportId })} style={styles.editRow}><Text style={styles.link}>Review {label}</Text><MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} /></Pressable>;
          })}
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>Proposed public report</Text>
      <PreviewCard title={preview.title}>
        <Text style={styles.body}>{animalDescription || animalCategoryLabel(preview.animal.category)}</Text>
        <View style={styles.photos}>
          {(previewPhotos.length ? previewPhotos : [{ id: 'placeholder', url: null }]).map((photo) => <Image key={photo.id} source={photo.url ? { uri: photo.url } : ANIMAL_PLACEHOLDERS[preview.animal.category]} style={styles.photo} />)}
        </View>
        {!previewPhotos.length ? <Text style={styles.body}>No animal photo selected for this report.</Text> : null}
        <Detail label="Collar or accessories" value={preview.animal.accessories} />
        <Detail label="Current appearance" value={preview.animal.currentAppearance} />
      </PreviewCard>

      <PreviewCard title="Last seen">
        <Detail label="When" value={[preview.lastSeen.date, preview.lastSeen.time, `(${preview.lastSeen.timeAccuracy.toLowerCase()} time)`].filter(Boolean).join(' ')} />
        <Detail label="Where others would see" value={preview.location} />
        <Detail label="What happened" value={preview.lastSeen.circumstance} />
        <Detail label="Travelled towards" value={preview.lastSeen.travelledTowards} />
        <Detail label="Other details" value={preview.lastSeen.explanation} />
      </PreviewCard>

      <PreviewCard title="Safety advice">
        <Detail label="Urgent needs" value={preview.safety.urgentNeeds.join(', ') || 'None selected'} />
        <Detail label="Urgent note" value={preview.safety.urgentNote} />
        <Detail label="Approach" value={preview.safety.approach} />
        <Detail label="Risk" value={preview.safety.biteScratchKickRisk ? 'May bite, scratch or kick' : ''} />
        <Detail label="Extra guidance" value={preview.safety.approachNote} />
      </PreviewCard>

      <PreviewCard title="Reporter and contact">
        <Detail label="Public name" value={preview.publicName} />
        <Detail label="How people respond" value={contactDescription} />
      </PreviewCard>

      <View style={styles.privateCard}>
        <MaterialCommunityIcons name="shield-lock-outline" size={25} color={colors.primaryDark} />
        <View style={styles.privateBody}>
          <Text style={styles.cardTitle}>Stays private</Text>
          <Text style={styles.body}>Exact coordinates, home or holding addresses, full identifiers, ownership evidence, private health notes, your email and phone number are not part of this proposed public view.</Text>
          <Text style={styles.warning}>Check every free-text note and photo for details you do not want others to see, including house numbers, tags and other people’s information.</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Your review</Text>
      {CONFIRMATIONS.map((label, index) => (
        <Pressable key={label} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed[index], disabled: !canConfirm }} disabled={!canConfirm} onPress={() => setConfirmed((current) => current.map((value, item) => item === index ? !value : value))} style={[styles.confirmRow, !canConfirm && styles.disabled]}>
          <MaterialCommunityIcons name={confirmed[index] ? 'checkbox-marked' : 'checkbox-blank-outline'} size={27} color={confirmed[index] ? colors.primary : colors.textSecondary} />
          <Text style={styles.confirmLabel}>{label}</Text>
        </Pressable>
      ))}
      <View style={styles.statusCard}>
        <MaterialCommunityIcons name={reviewReady ? 'check-circle-outline' : 'information-outline'} size={24} color={reviewReady ? colors.primaryDark : colors.textSecondary} />
        <Text style={styles.statusText}>{reviewReady ? 'Review complete. Publishing will make this report visible to everyone.' : readinessError ? 'The server check must succeed before you can confirm this review.' : issues.length ? 'Recheck the steps above before confirming this review.' : 'Tick all three statements when the proposed public details look right.'}</Text>
      </View>
      {publishError ? <Text accessibilityRole="alert" style={styles.error}>{publishError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !MISSING_PUBLICATION_ENABLED || !reviewReady || publishing, busy: publishing }}
        disabled={!MISSING_PUBLICATION_ENABLED || !reviewReady || publishing}
        onPress={publish}
        style={[styles.publishButton, (!MISSING_PUBLICATION_ENABLED || !reviewReady || publishing) && styles.disabled]}
      >
        <Text style={styles.publishLabel}>{publishing ? 'Copying photos and publishing…' : 'Publish missing report'}</Text>
      </Pressable>
      <Text style={styles.footer}>{MISSING_PUBLICATION_ENABLED
        ? 'For this test build, publishing makes the report visible to everyone using Homeward Paws. Check every detail before continuing.'
        : 'Publishing is being connected to a safe in-app response route and the live server. Your report remains a private draft for now.'}</Text>
      <Pressable accessibilityRole="button" disabled={publishing} onPress={() => navigation.popTo('ReportMenu')} style={styles.textButton}><Text style={styles.link}>Back to Report</Text></Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.missingOnTint, marginBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  sectionHeading: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.xxl, marginBottom: spacing.sm },
  card: { gap: spacing.sm, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 88, height: 88, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  detail: { gap: spacing.xs, paddingTop: spacing.sm },
  detailLabel: { ...typography.label, color: colors.textSecondary },
  detailValue: { ...typography.body, color: colors.textPrimary },
  issueCard: { gap: spacing.sm, marginTop: spacing.xxl, padding: spacing.lg, borderWidth: 1, borderColor: colors.missing, borderRadius: radii.lg, backgroundColor: colors.missingTint },
  issueTitle: { ...typography.sectionTitle, color: colors.missingOnTint },
  editRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  privateCard: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.primaryLight },
  privateBody: { flex: 1, gap: spacing.sm },
  warning: { ...typography.bodyStrong, color: colors.primaryDark },
  confirmRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  confirmLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryLight },
  statusText: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  message: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  textButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  link: { ...typography.bodyStrong, color: colors.primary },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
  publishButton: { minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.primary },
  publishLabel: { ...typography.button, color: colors.textOnPrimary, textAlign: 'center' },
  disabled: { opacity: 0.55 }
});
