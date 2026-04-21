'use server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: FormData) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  if (error) return { error: error.message };
  redirect('/admin/posts');
}

export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

async function requireAuth() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
}

export async function createPostAction(formData: FormData) {
  await requireAuth();
  const admin = createAdminClient();
  const { error } = await admin.from('posts').insert({
    slug: formData.get('slug'),
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    content: formData.get('content'),
    category: formData.get('category') ?? 'uncategorized',
    published: formData.get('published') === 'on',
  });
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/blog');
  redirect('/admin/posts');
}

export async function updatePostAction(id: string, formData: FormData) {
  await requireAuth();
  const admin = createAdminClient();
  const slug = formData.get('slug') as string;
  const { error } = await admin
    .from('posts')
    .update({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      content: formData.get('content'),
      category: formData.get('category') ?? 'uncategorized',
      published: formData.get('published') === 'on',
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  redirect('/admin/posts');
}

export async function deletePostAction(id: string, slug: string) {
  await requireAuth();
  const admin = createAdminClient();
  await admin.from('posts').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  redirect('/admin/posts');
}
