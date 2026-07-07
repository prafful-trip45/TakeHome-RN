import type { NavigatorScreenParams } from '@react-navigation/native';

/** Central route-name registry (mirrors EduBridge's `Routes` enum). */
export enum Routes {
  Tabs = 'Tabs',
  Screen1 = 'Screen1',
  Screen2 = 'Screen2',
  Screen3 = 'Screen3',
}

/** Params a tab screen can receive (deep-link bonus carries `?highlight=true`). */
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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
