import fs from 'fs';

function check(file, pattern, desc) {
  const content = fs.readFileSync(file, 'utf8');
  const ok = content.includes(pattern);
  console.log(`${ok ? '✓' : '✗'} ${desc} — ${ok ? 'found' : 'MISSING'} "${pattern}" in ${file}`);
  return ok;
}

let all = true;

console.log('=== Landing Page CTA & Headline ===');
all &= check('src/pages/Landing.jsx', 'Create your free ledger', 'Primary CTA text');
all &= check('src/pages/Landing.jsx', 'Log in', 'Secondary Log in');
all &= check('src/pages/Landing.jsx', 'Income, expenses, and invoices in one place for freelancers', 'Headline');
all &= check('src/pages/Landing.jsx', "track('cta_click'", 'CTA click tracking');
all &= check('src/pages/Landing.jsx', "to=\"/signup\"", 'CTA routes to signup');

console.log('\n=== Auto-launch onboarding after signup ===');
all &= check('src/pages/Auth.jsx', 'signup_started', 'signup_started tracking');
all &= check('src/pages/Auth.jsx', 'signup_completed', 'signup_completed tracking');
all &= check('src/pages/Auth.jsx', '/income?onboarding=first_signup', 'Navigate to Add income after signup');
all &= check('src/pages/Auth.jsx', 'clearbooks_has_onboarded', 'Onboarding flag (once only)');

console.log('\n=== Dashboard checklist ===');
all &= check('src/pages/Dashboard.jsx', 'Get started — 3 steps to activate your ledger', 'Checklist title');
all &= check('src/pages/Dashboard.jsx', 'Add your first income', 'Checklist item 1');
all &= check('src/pages/Dashboard.jsx', 'Add your first expense', 'Checklist item 2');
all &= check('src/pages/Dashboard.jsx', 'Create your first invoice', 'Checklist item 3');
all &= check('src/pages/Dashboard.jsx', 'showChecklist', 'Checklist visibility logic');
all &= check('src/pages/Dashboard.jsx', 'hasIncome', 'Checkmark logic');
all &= check('src/pages/Dashboard.jsx', '/income', 'Link to income form');
all &= check('src/pages/Dashboard.jsx', '/expenses', 'Link to expenses');
all &= check('src/pages/Dashboard.jsx', '/invoices', 'Link to invoices');
all &= check('src/pages/Dashboard.jsx', 'allDone', 'Hide when all complete');

console.log('\n=== Auto-launch logic ===');
all &= check('src/pages/Dashboard.jsx', 'clearbooks_just_signed_up', 'Just signed up flag');
all &= check('src/pages/Dashboard.jsx', 'navigate', 'Auto-navigate logic');
all &= check('src/pages/Income.jsx', 'isOnboarding', 'Income onboarding banner');

console.log('\n=== Activation tracking ===');
all &= check('src/lib/analytics.js', "track", 'Analytics helper');
all &= check('src/lib/analytics.js', 'vercelTrack', 'Vercel Analytics');
all &= check('src/context/DataContext.jsx', "track('first_entry_created'", 'first_entry tracking');
all &= check('src/context/DataContext.jsx', "track('first_invoice_created'", 'first_invoice tracking');
all &= check('src/pages/Landing.jsx', "cta_click", 'cta_click event');
all &= check('src/pages/Auth.jsx', "signup_started", 'signup_started event');
all &= check('src/pages/Auth.jsx', "signup_completed", 'signup_completed event');

console.log('\n=== Existing analytics check ===');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
console.log(`  Analytics package: ${pkg.dependencies['@vercel/analytics'] ? '✓ @vercel/analytics ' + pkg.dependencies['@vercel/analytics'] : '✗ missing'}`);
all &= !!pkg.dependencies['@vercel/analytics'];

console.log('\n=== App wiring ===');
all &= check('src/App.jsx', 'Analytics', 'Analytics component in App');

console.log('\n' + (all ? '✅ All checks passed' : '❌ Some checks failed'));
process.exit(all ? 0 : 1);
