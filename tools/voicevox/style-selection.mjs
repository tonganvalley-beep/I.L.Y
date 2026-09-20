export function resolveStyle(styles, line = {}) {
  const style = styles.find(item => item.styleId === line.styleId) || null;
  return {
    style,
    missing: Number.isInteger(line.styleId) && !style,
    label: style?.styleName || line.styleName || '未选择'
  };
}
