/**
 * apply.js — Client half entry: locale, styles, right-sidebar tab type and body.
 */

export function applyDeepChess(ctx) {
  const t = ctx.locale.bind(NS);

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'deepchess: copy');
  ctx.effect(attachDeepChessStyles, 'deepchess: styles');

  const currentLocale = () => {
    try {
      const snapshot = ctx.locale.getLocale();
      return snapshot && snapshot.id === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  };

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: 'deepchess',
    kind: 'deepchess.board',
    priority: 'extension',
    title: () => t('tab.title'),
    guide: [{
      id: 'deepchess',
      order: 40,
      title: () => t('tab.title'),
      description: () => t('tab.desc'),
      icon: ChessWhaleGlyph,
    }],
  }), 'deepchess: tab type');

  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: 'deepchess',
    locale: NS,
  }, (props) => h(DeepChessPanel, { ...props, t, locale: currentLocale() })));
}
