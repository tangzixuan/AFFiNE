import 'ses';
import '@affine/component/theme/global.css';
import '@affine/component/theme/theme.css';
import '@toeverything/components/style.css';
import { createI18n } from '@affine/i18n';
import MockSessionContext, {
  mockAuthStates,
  // @ts-ignore
} from '@tomfreudenberg/next-auth-mock';
import { ThemeProvider, useTheme } from 'next-themes';
import { useDarkMode } from 'storybook-dark-mode';
import { AffineContext } from '@affine/component/context';
import useSWR from 'swr';
import type { Decorator } from '@storybook/react';
import { createStore } from 'jotai/vanilla';
import { _setCurrentStore } from '@toeverything/infra/atom';
import { setupGlobal } from '@affine/env/global';

import type { Preview } from '@storybook/react';
import { useLayoutEffect, useRef } from 'react';

setupGlobal();
export const parameters = {
  backgrounds: { disable: true },
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const SB_PARAMETER_KEY = 'nextAuthMock';
export const mockAuthPreviewToolbarItem = ({
  name = 'mockAuthState',
  description = 'Set authentication state',
  defaultValue = null,
  icon = 'user',
  items = mockAuthStates,
} = {}) => {
  return {
    mockAuthState: {
      name,
      description,
      defaultValue,
      toolbar: {
        icon,
        items: Object.keys(items).map(e => ({
          value: e,
          title: items[e].title,
        })),
      },
    },
  };
};

export const withMockAuth: Decorator = (Story, context) => {
  // Set a session value for mocking
  const session = (() => {
    // Allow overwrite of session value by parameter in story
    const paramValue = context?.parameters[SB_PARAMETER_KEY];
    if (typeof paramValue?.session === 'string') {
      return mockAuthStates[paramValue.session]?.session;
    } else {
      return paramValue?.session
        ? paramValue.session
        : mockAuthStates[context.globals.mockAuthState]?.session;
    }
  })();

  return (
    <MockSessionContext session={session}>
      <Story {...context} />
    </MockSessionContext>
  );
};

const i18n = createI18n();
const withI18n: Decorator = (Story, context) => {
  const locale = context.globals.locale;
  useSWR(
    locale,
    async () => {
      await i18n.changeLanguage(locale);
    },
    {
      suspense: true,
    }
  );
  return <Story {...context} />;
};

const ThemeChange = () => {
  const isDark = useDarkMode();
  const theme = useTheme();
  if (theme.resolvedTheme === 'dark' && !isDark) {
    theme.setTheme('light');
  } else if (theme.resolvedTheme === 'light' && isDark) {
    theme.setTheme('dark');
  }
  return null;
};

const storeMap = new Map<string, ReturnType<typeof createStore>>();

const bootstrapPluginSystemPromise = import(
  '@affine/core/bootstrap/register-plugins'
).then(({ bootstrapPluginSystem }) => bootstrapPluginSystem);

const setupPromise = import('@affine/core/bootstrap/setup').then(
  ({ setup }) => setup
);

const withContextDecorator: Decorator = (Story, context) => {
  const { data: store } = useSWR(
    context.id,
    async () => {
      if (storeMap.has(context.id)) {
        return storeMap.get(context.id);
      }
      localStorage.clear();
      const store = createStore();
      _setCurrentStore(store);
      const setup = await setupPromise;
      await setup(store);
      const bootstrapPluginSystem = await bootstrapPluginSystemPromise;
      await bootstrapPluginSystem(store);
      storeMap.set(context.id, store);
      return store;
    },
    {
      suspense: true,
    }
  );
  return (
    <ThemeProvider>
      <AffineContext store={store}>
        <ThemeChange />
        <Story {...context} />
      </AffineContext>
    </ThemeProvider>
  );
};

const platforms = ['web', 'desktop-macos', 'desktop-windows'] as const;

const withPlatformSelectionDecorator: Decorator = (Story, context) => {
  const setupCounterRef = useRef(0);
  useLayoutEffect(() => {
    if (setupCounterRef.current++ === 0) {
      return;
    }
    switch (context.globals.platform) {
      case 'desktop-macos':
        environment.isDesktop = true;
        environment.isMacOs = true;
        environment.isWindows = false;
        break;
      case 'desktop-windows':
        environment.isDesktop = true;
        environment.isMacOs = false;
        environment.isWindows = true;
        break;
      default:
        globalThis.$AFFINE_SETUP = false;
        setupGlobal();
        break;
    }
  }, [context.globals.platform]);

  return <Story key={context.globals.platform} {...context} />;
};

const decorators = [
  withContextDecorator,
  withI18n,
  withMockAuth,
  withPlatformSelectionDecorator,
];

const preview: Preview = {
  decorators,
  globalTypes: {
    platform: {
      description: 'Rendering platform target',
      defaultValue: 'web',
      toolbar: {
        // The label to show for this toolbar item
        title: 'platform',
        // Array of plain string values or MenuItem shape (see below)
        items: platforms,
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
