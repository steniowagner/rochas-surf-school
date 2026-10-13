export type RoleTab = {
  /** The route file of the tab, without the extension (`index` is the first tab). */
  name: string;
  /** The `tabs.*` message key of the label. */
  labelKey: string;
  /** SF Symbol shown on iOS. */
  sf: string;
  /** Material icon shown on Android. */
  md: string;
};

export type RoleTabsProps = {
  tabs: RoleTab[];
};
