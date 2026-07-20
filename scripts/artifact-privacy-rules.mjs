export const forbiddenPublicPathPatterns = [
  /(?:^|\/)apps\/platform(?:\/|$)/,
  /(?:^|\/)tools(?:\/|$)/,
  /(?:^|\/)internal(?:\/|$)/,
  /(?:^|\/)fixtures?(?:\/|$)/,
  /(?:^|\/)docs?(?:\/|$)/,
  /(?:^|\/)backups(?:\/|$)/,
  /(?:^|\/)history(?:\/|$)/,
  /catalog-manager/i,
  /catalog-admin/i,
  /inventory/i,
  /estoque/i,
  /disponibilidade-interna/i
];

export const forbiddenPrivateContentPatterns = [
  /inventory-private/i,
  /inventory_hash/i,
  /inventory_id/i,
  /stock_on_hand/i,
  /low_stock_threshold/i,
  /inventory-changes\.jsonl/i,
  /\/api\/inventory\//i
];

export function privateArtifactViolation(relativePath, source = null) {
  const pathPattern = forbiddenPublicPathPatterns.find(pattern => pattern.test(relativePath));
  if (pathPattern) return { type: 'path', pattern: pathPattern };
  if (typeof source === 'string') {
    const contentPattern = forbiddenPrivateContentPatterns.find(pattern => pattern.test(source));
    if (contentPattern) return { type: 'content', pattern: contentPattern };
  }
  return null;
}
