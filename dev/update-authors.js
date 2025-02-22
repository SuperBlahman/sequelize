#!/usr/bin/env node
// original comes from https://github.com/nodejs/node/blob/c18ca140a12b543a3f970ef379f384ebd3297c3d/tools/update-authors.js

// Usage: dev/update-author.js [--dry]
// Passing --dry will redirect output to stdout rather than write to 'AUTHORS'.
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const readline = require('node:readline');

const log = spawn(
  'git',
  // Inspect author name/email and body.
  ['log', '--reverse', '--format=Author: %aN <%aE>\n%b'],
  {
    stdio: ['inherit', 'pipe', 'inherit'],
  },
);
const rl = readline.createInterface({ input: log.stdout });

let output;
if (process.argv.includes('--dry')) {
  output = process.stdout;
} else {
  output = fs.createWriteStream('AUTHORS');
}

output.write('# Authors ordered by first contribution.\n\n');

const seen = new Set();

// exclude emails from <ROOT>/AUTHORS file
const excludeEmails = new Set(['<bot@renovateapp.com>', '<support@greenkeeper.io>', '<mail@sequelizejs.com>']);

// Support regular git author metadata, as well as `Author:` and
// `Co-authored-by:` in the message body. Both have been used in the past
// to indicate multiple authors per commit, with the latter standardized
// by GitHub now.
const authorRe
  = /(^Author:|^Co-authored-by:)\s+(?<author>[^<]+)\s+(?<email><[^>]+>)/i;

rl.on('line', line => {
  const match = line.match(authorRe);
  if (!match) {
    return;
  }

  const { author, email } = match.groups;

  const botRegex = /bot@users.noreply.github.com/g;
  const botEmail = email.replace(/\[bot.*?\]/g, 'bot');

  if (
    seen.has(email)
    || excludeEmails.has(email)
    || botRegex.test(botEmail)
  ) {
    return;
  }

  seen.add(email);
  output.write(`${author} ${email}\n`);
});

rl.on('close', () => {
  output.end('\n# Generated by dev/update-authors.js\n');
});
