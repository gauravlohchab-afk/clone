import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { limits } from '@vyro/config';
import type { ProfileDto } from '@vyro/types';
import { TextArea, TextField } from '../../components/Field';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { api } from '../../lib/api';
import { applyApiError } from '../../lib/form-errors';
import { useAuth } from '../../stores/auth';
import { SettingsSection } from './SettingsLayout';

const schema = z.object({
  displayName: z.string().max(limits.displayName.max),
  bio: z.string().max(limits.bio.max),
  website: z.string().max(limits.website.max),
  location: z.string().max(limits.location.max),
  accountType: z.enum(['personal', 'creator', 'professional']),
  category: z.string().max(40),
});
type Values = z.infer<typeof schema>;

export function EditProfile() {
  const { user, reloadMe } = useAuth();
  const p = user!.profile!;
  const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting, isDirty }, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: p.displayName, bio: p.bio, website: p.website, location: p.location, accountType: p.accountType, category: p.category },
  });
  const accountType = watch('accountType');

  const onSubmit = handleSubmit(async (v) => {
    setNote(null);
    try {
      const saved = await api.patch<ProfileDto>('/api/v1/me/profile', v);
      reset({ displayName: saved.displayName, bio: saved.bio, website: saved.website, location: saved.location, accountType: saved.accountType, category: saved.category });
      await reloadMe();
      setNote({ tone: 'success', text: 'Profile saved' });
    } catch (e) {
      const msg = applyApiError(e, setError, Object.keys(schema.shape));
      if (msg) setNote({ tone: 'error', text: msg });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection title="Edit profile" description="Profile photos and cover images arrive with media uploads.">
        <div className="space-y-4">
          {note && <Alert tone={note.tone}>{note.text}</Alert>}
          <TextField label="Display name" maxLength={limits.displayName.max} error={errors.displayName?.message} {...register('displayName')} />
          <TextArea label="Bio" counter={limits.bio.max} maxLength={limits.bio.max} value={watch('bio')} error={errors.bio?.message} {...register('bio')} />
          <TextField label="Website" inputMode="url" placeholder="yoursite.com" error={errors.website?.message} {...register('website')} />
          <TextField label="Location" error={errors.location?.message} {...register('location')} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Account type</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['personal', 'creator', 'professional'] as const).map((t) => (
                <label key={t} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm capitalize ${accountType === t ? 'border-primary font-semibold' : 'border-line text-muted'}`}>
                  <input type="radio" value={t} className="sr-only" {...register('accountType')} />{t}
                </label>
              ))}
            </div>
          </fieldset>
          {accountType !== 'personal' && <TextField label="Category" placeholder="e.g. Musician, Studio, Coach" error={errors.category?.message} {...register('category')} />}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save</Button>
        </div>
      </SettingsSection>
    </form>
  );
}
