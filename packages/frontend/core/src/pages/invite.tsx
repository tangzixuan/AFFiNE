import { AcceptInvitePage } from '@affine/component/member-components';
import { WorkspaceSubPath } from '@affine/env/workspace';
import {
  acceptInviteByInviteIdMutation,
  type GetInviteInfoQuery,
  getInviteInfoQuery,
} from '@affine/graphql';
import { fetcher } from '@affine/workspace/affine/gql';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { type LoaderFunction, redirect, useLoaderData } from 'react-router-dom';

import { authAtom } from '../atoms';
import { setOnceSignedInEventAtom } from '../atoms/event';
import { useCurrentLoginStatus } from '../hooks/affine/use-current-login-status';
import { RouteLogic, useNavigateHelper } from '../hooks/use-navigate-helper';
import { useAppHelper } from '../hooks/use-workspaces';

export const loader: LoaderFunction = async args => {
  const inviteId = args.params.inviteId || '';
  const res = await fetcher({
    query: getInviteInfoQuery,
    variables: {
      inviteId,
    },
  }).catch(console.error);

  // If the inviteId is invalid, redirect to 404 page
  if (!res || !res?.getInviteInfo) {
    return redirect('/404');
  }

  // No mater sign in or not, we need to accept the invite
  await fetcher({
    query: acceptInviteByInviteIdMutation,
    variables: {
      workspaceId: res.getInviteInfo.workspace.id,
      inviteId,
      sendAcceptMail: true,
    },
  }).catch(console.error);

  return {
    inviteId,
    inviteInfo: res.getInviteInfo,
  };
};

export const Component = () => {
  const loginStatus = useCurrentLoginStatus();
  const { jumpToSignIn } = useNavigateHelper();
  const { addCloudWorkspace } = useAppHelper();
  const { jumpToSubPath } = useNavigateHelper();

  const setOnceSignedInEvent = useSetAtom(setOnceSignedInEventAtom);

  const setAuthAtom = useSetAtom(authAtom);
  const { inviteInfo } = useLoaderData() as {
    inviteId: string;
    inviteInfo: GetInviteInfoQuery['getInviteInfo'];
  };

  const openWorkspace = useCallback(() => {
    addCloudWorkspace(inviteInfo.workspace.id);
    jumpToSubPath(
      inviteInfo.workspace.id,
      WorkspaceSubPath.ALL,
      RouteLogic.REPLACE
    );
  }, [addCloudWorkspace, inviteInfo.workspace.id, jumpToSubPath]);

  useEffect(() => {
    if (loginStatus === 'unauthenticated') {
      // We can not pass function to navigate state, so we need to save it in atom
      setOnceSignedInEvent(openWorkspace);
      jumpToSignIn(RouteLogic.REPLACE, {
        state: {
          callbackURL: `/workspace/${inviteInfo.workspace.id}/all`,
        },
      });
    }
  }, [
    inviteInfo.workspace.id,
    jumpToSignIn,
    loginStatus,
    openWorkspace,
    setAuthAtom,
    setOnceSignedInEvent,
  ]);

  if (loginStatus === 'authenticated') {
    return (
      <AcceptInvitePage
        inviteInfo={inviteInfo}
        onOpenWorkspace={openWorkspace}
      />
    );
  }

  return null;
};
