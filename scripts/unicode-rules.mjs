const CONTROL_PATTERN = /[\p{Cc}\p{Cf}]/u;
const ALLOWED_CONTROLS = new Set(['\t', '\n', '\r']);

export function unsafeUnicodeOccurrences(source) {
  const occurrences = [];
  let line = 1;
  let column = 1;

  for (let position = 0; position < source.length;) {
    const codePoint = source.codePointAt(position);
    const character = String.fromCodePoint(codePoint);

    if (CONTROL_PATTERN.test(character) && !ALLOWED_CONTROLS.has(character)) {
      occurrences.push({
        position,
        line,
        column,
        codePoint,
        hex: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
      });
    }

    position += character.length;
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return occurrences;
}
