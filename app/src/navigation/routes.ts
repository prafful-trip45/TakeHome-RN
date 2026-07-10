import type { NavigatorScreenParams } from '@react-navigation/native';

/** Central route-name registry. */
export enum Routes {
  Tabs = 'Tabs',
  Screen1 = 'Screen1',
  Screen2 = 'Screen2',
  Screen3 = 'Screen3',
}

/** Params a tab screen can receive (deep links may carry `?highlight=true`). */
export type TabScreenParams = { highlight?: boolean } | undefined;

export type TabParamList = {
  [Routes.Screen1]: TabScreenParams;
  [Routes.Screen2]: TabScreenParams;
  [Routes.Screen3]: TabScreenParams;
};

export type RootStackParamList = {
  [Routes.Tabs]: NavigatorScreenParams<TabParamList> | undefined;
};

/** Screen keys reachable via deep link / notification payload (`data.screen`). */
export type DeepLinkScreen = keyof TabParamList;

declare global {
  namespace ReactNavigation {
    // React Navigation's global augmentation needs an empty interface for
    // declaration merging.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
