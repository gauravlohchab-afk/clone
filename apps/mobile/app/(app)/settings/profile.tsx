import { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { limits } from '@vyro/config';
import type { ProfileDto } from '@vyro/types';
import { Screen } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Alert } from '../../../components/Alert';
import { ChoiceList } from '../../../components/Controls';
import { Text } from '../../../components/Text';
import { api } from '../../../lib/api';
import { applyApiError } from '../../../lib/errors';
import { useAuth } from '../../../stores/auth';

const schema = z.object({
  displayName: z.string().max(limits.displayName.max),
  bio: z.string().max(limits.bio.max),
  website: z.string().max(limits.website.max),
  location: z.string().max(limits.location.max),
  accountType: z.enum(['personal', 'creator', 'professional']),
  category: z.string().max(40),
});
type Values = z.infer<typeof schema>;

export default function EditProfile() {
  const { user, reloadMe } = useAuth();
  const p = user!.profile!;
  const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { control, handleSubmit, watch, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: p.displayName, bio: p.bio, website: p.website, location: p.location, accountType: p.accountType, category: p.category },
  });
  const field = (name: keyof Values, label: string, extra: object = {}) => (
    <Controller control={control} name={name} render={({ field: f }) => (
      <TextField label={label} value={f.value} onChangeText={f.onChange} onBlur={f.onBlur} error={errors[name]?.message} {...extra} />
    )} />
  );
  return (
    <Screen edges={[]}>
      <Text variant="small">Profile photos arrive with media uploads.</Text>
      {note && <Alert tone={note.tone}>{note.text}</Alert>}
      {field('displayName', 'Display name', { maxLength: limits.displayName.max })}
      {field('bio', 'Bio', { multiline: true, maxLength: limits.bio.max, counter: limits.bio.max, style: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' } })}
      {field('website', 'Website', { autoCapitalize: 'none', keyboardType: 'url', placeholder: 'yoursite.com' })}
      {field('location', 'Location')}
      <Controller control={control} name="accountType" render={({ field: f }) => (
        <ChoiceList label="Account type" value={f.value} onChange={f.onChange}
          options={[{ value: 'personal', label: 'Personal' }, { value: 'creator', label: 'Creator' }, { value: 'professional', label: 'Professional' }]} />
      )} />
      {watch('accountType') !== 'personal' && <View>{field('category', 'Category', { placeholder: 'e.g. Musician, Studio, Coach' })}</View>}
      <Button title="Save" loading={isSubmitting} disabled={!isDirty} onPress={handleSubmit(async (v) => {
        setNote(null);
        try {
          const s = await api.patch<ProfileDto>('/api/v1/me/profile', v);
          reset({ displayName: s.displayName, bio: s.bio, website: s.website, location: s.location, accountType: s.accountType, category: s.category });
          await reloadMe();
          setNote({ tone: 'success', text: 'Profile saved' });
        } catch (e) {
          const msg = applyApiError(e, setError, Object.keys(schema.shape));
          if (msg) setNote({ tone: 'error', text: msg });
        }
      })} />
    </Screen>
  );
}
