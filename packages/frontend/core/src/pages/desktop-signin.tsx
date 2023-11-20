import { getSession } from 'next-auth/react';
import { type LoaderFunction } from 'react-router-dom';
import { z } from 'zod';

import { signInCloud, signOutCloud } from '../utils/cloud-utils';

const supportedProvider = z.enum(['google']);

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const provider = searchParams.get('provider');
  const callback_url = searchParams.get('callback_url');
  if (!callback_url) {
    return null;
  }

  const session = await getSession();

  if (session) {
    // already signed in, need to sign out first
    await signOutCloud({
      callbackUrl: request.url, // retry
    });
  }

  const maybeProvider = supportedProvider.safeParse(provider);
  if (maybeProvider.success) {
    const provider = maybeProvider.data;
    await signInCloud(provider, {
      callbackUrl: callback_url,
    });
  }
  return null;
};

export const Component = () => {
  return null;
};
