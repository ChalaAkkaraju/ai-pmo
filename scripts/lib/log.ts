/**
 * Minimal coloured console logger for seed scripts.
 */

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

export const log = {
  header(msg: string) {
    console.log(`\n${BOLD}${CYAN}════ ${msg} ════${RESET}\n`);
  },
  info(msg: string) {
    console.log(`${DIM}·${RESET} ${msg}`);
  },
  success(msg: string) {
    console.log(`${GREEN}✓${RESET} ${msg}`);
  },
  warn(msg: string) {
    console.log(`${YELLOW}⚠${RESET} ${msg}`);
  },
  error(msg: string) {
    console.error(`${RED}✗${RESET} ${msg}`);
  },
};

export function section(title: string) {
  console.log(`\n${BOLD}${title}${RESET}`);
}
