// Keep import semantics aligned with src/lib/auth/account-format.ts.
// This standalone parser can be tested without credentials or database writes.
function parseCsv(csv) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const text = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === ',') { row.push(field); field = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('ACCOUNT_CSV_INVALID');
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}
export function parseImportedAccounts(csv) {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error('ACCOUNT_CSV_EMPTY');
  const headers = header.map(value => value.trim().toLowerCase());
  const accounts = new Map();
  for (const row of rows) {
    const record = Object.fromEntries(headers.map((key, i) => [key, row[i] ?? '']));
    // Seeding has always used uppercase IDs, including question-set references.
    const userCode = (record.id || record.user_code || '').trim().normalize('NFKC').replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - 3664)).toUpperCase();
    const displayName = (record.name || record.display_name || '').trim();
    const grade = (record.grade || record.classroom || '').trim();
    const role = (record.role || '').trim().toLowerCase();
    let parsedRole;
    if (role === 'teacher' || role === 'ครู') parsedRole = 'teacher';
    else if (role === 'student' || role === 'นักเรียน') parsedRole = 'student';
    else if (!role && ['teacher', 'ครู'].includes(grade.toLowerCase())) parsedRole = 'teacher';
    else throw new Error('ACCOUNT_ROLE_INVALID');
    if (!userCode || !displayName || !record.password) throw new Error('ACCOUNT_CSV_INCOMPLETE');
    if (accounts.has(userCode)) throw new Error('ACCOUNT_CODE_DUPLICATE');
    accounts.set(userCode, {user_code:userCode, display_name:displayName, password:record.password, grade, role:parsedRole});
  }
  return [...accounts.values()];
}
