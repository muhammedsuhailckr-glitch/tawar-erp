import assert from 'node:assert/strict';
import {csvCell, csvDocument} from './csv.mjs';

const cases = [
  [-1234.56, '"-1234.56"'],
  [0, '"0"'],
  [12.34, '"12.34"'],
  ['-1234.56', '"\'-1234.56"'],
  ['=1+1', '"\'=1+1"'],
  ['  @SUM(A1:A2)', '"\'  @SUM(A1:A2)"'],
  ['\t=1+1', '"\'\t=1+1"'],
  ['Vendor "A", Ltd', '"Vendor ""A"", Ltd"'],
  [null, '""'],
];
for (const [input, expected] of cases) assert.equal(csvCell(input), expected);
assert.equal(csvDocument([['Amount', 'Party'], [-12.34, '=1+1']]), '\uFEFF"Amount","Party"\r\n"-12.34","\'=1+1"');
console.log(JSON.stringify({csv_assertions_passed: cases.length + 1}));
